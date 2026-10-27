#!/usr/bin/env python3
"""Bounded, read-only checks of a small set of agent configuration files.

This tool never runs project commands or sends data over the network. Its
findings are heuristics, not proof of a vulnerability or a clean environment.
"""
import argparse
import json
import os
from pathlib import Path
import re
import stat
import sys
from urllib.parse import urlsplit


# Fixed relative paths avoid traversing the workspace or exposing arbitrary names.
CONFIG_FILES = (
    ".mcp.json",
    ".claude/settings.json",
    ".claude/settings.local.json",
    ".cursor/mcp.json",
    ".cursor/hooks.json",
    ".vscode/mcp.json",
    ".codex/config.toml",
)
MAX_FILE_BYTES = 128 * 1024
MAX_NODES = 10000
RULES = {
    "embedded_credential": ("high", "Possible literal credential in configuration; review and move it to a secret store."),
    "broad_permissions": ("high", "Broad allow rule or permission bypass; review the host's permission policy."),
    "approval_disabled": ("high", "Approval policy appears to be disabled; verify that this is intended."),
    "sandbox_disabled": ("high", "The sandbox appears unrestricted; review the host's sandbox policy."),
    "remote_shell_pipeline": ("high", "A command appears to pipe a network download into a shell; review it before running."),
    "unpinned_npx": ("medium", "An npx package appears unpinned or uses latest; review and pin a trusted version."),
    "hook_command": ("medium", "A hook can run a command automatically; inspect its trigger and command."),
    "insecure_mcp_http": ("medium", "A non-local HTTP endpoint may expose traffic; inspect transport security."),
}
SECRET_SUFFIXES = ("apikey", "token", "secret", "password", "privatekey", "authorization", "credential")
NETWORK_PIPE = re.compile(r"\b(?:curl|wget)\b[^\n]*\|\s*(?:ba|z|k)?sh\b", re.I)
BEARER = re.compile(r"\bbearer\s+[A-Za-z0-9._~+/-]{8,}", re.I)
ASSIGNMENT = re.compile(r"^\s*(?:\"([^\"]+)\"|'([^']+)'|([A-Za-z_][\w.-]*))\s*=\s*([\"'])(.*?)\4\s*(?:#.*)?$")


def _sensitive_key(key):
    normalized = re.sub(r"[^a-z0-9]", "", str(key).lower())
    return any(normalized.endswith(suffix) for suffix in SECRET_SUFFIXES)


def _literal(value):
    if not isinstance(value, str):
        return False
    value = value.strip()
    if not value:
        return False
    # Common environment references and example placeholders are not literals.
    if re.fullmatch(r"\$\{[A-Za-z_][A-Za-z0-9_]*\}|\$[A-Za-z_][A-Za-z0-9_]*|\{\{[^{}]+\}\}|<[^<>]+>", value):
        return False
    if re.fullmatch(r"(?:process\.env|env)\.[A-Za-z_][A-Za-z0-9_]*", value):
        return False
    return not bool(re.match(r"^(?:YOUR_|REPLACE_|EXAMPLE_|PLACEHOLDER|DUMMY)", value, re.I))


def _npx_unpinned(command, args):
    if not isinstance(command, str) or os.path.basename(command).lower() not in ("npx", "npx.cmd"):
        return False
    if not isinstance(args, list):
        return False
    package = None
    for index, arg in enumerate(args):
        if not isinstance(arg, str):
            continue
        if arg in ("-p", "--package"):
            package = args[index + 1] if index + 1 < len(args) else None
            break
        if arg.startswith("--package="):
            package = arg.partition("=")[2]
            break
        if not arg.startswith("-"):
            package = arg
            break
    if not isinstance(package, str) or not package:
        return False
    # Avoid suggesting that tags, ranges or latest are immutable versions.
    return not bool(re.search(r"@\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$", package))


def _is_remote_http(value):
    if not isinstance(value, str):
        return False
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").lower()
    except ValueError:
        return False
    return parsed.scheme.lower() == "http" and host not in ("localhost", "127.0.0.1", "::1")


def _analyze_json(data):
    found = set()
    stack = [(data, False, False)]
    nodes = 0
    while stack:
        item, in_hooks, in_permissions = stack.pop()
        nodes += 1
        if nodes > MAX_NODES:
            return found, "object_limit"
        if isinstance(item, dict):
            command = item.get("command")
            args = item.get("args", [])
            if isinstance(command, str):
                joined = " ".join([command] + ([x for x in args if isinstance(x, str)] if isinstance(args, list) else []))
                if NETWORK_PIPE.search(joined):
                    found.add("remote_shell_pipeline")
                if _npx_unpinned(command, args):
                    found.add("unpinned_npx")
                if in_hooks and command.strip():
                    found.add("hook_command")
            for key, value in item.items():
                lower = str(key).lower()
                normalized = re.sub(r"[^a-z0-9]", "", lower)
                if isinstance(value, str):
                    if (_sensitive_key(key) and _literal(value)) or BEARER.search(value):
                        found.add("embedded_credential")
                    if normalized in ("defaultmode", "permissionmode") and value.lower() in ("bypasspermissions", "yolo"):
                        found.add("broad_permissions")
                    if normalized == "approvalpolicy" and value.lower() == "never":
                        found.add("approval_disabled")
                    if normalized == "sandboxmode" and value.lower() == "danger-full-access":
                        found.add("sandbox_disabled")
                    if normalized in ("url", "serverurl", "endpoint") and _is_remote_http(value):
                        found.add("insecure_mcp_http")
                if normalized in ("dangerouslyskippermissions", "skippermissions") and value is True:
                    found.add("broad_permissions")
                if normalized in ("allow", "autoapprove") and isinstance(value, list) and (in_permissions or normalized == "autoapprove"):
                    if any(isinstance(v, str) and (v.strip() == "*" or bool(re.fullmatch(r"(?:Bash|Shell)\(\*\)", v.strip(), re.I))) for v in value):
                        found.add("broad_permissions")
                stack.append((value, in_hooks or normalized == "hooks", in_permissions or normalized == "permissions"))
        elif isinstance(item, list):
            stack.extend((v, in_hooks, in_permissions) for v in item)
    return found, None


def _analyze_toml_text(text):
    # Deliberately limited text checks so this also works on Python 3.9.
    found = set()
    for line in text.splitlines():
        if line.lstrip().startswith("#"):
            continue
        match = ASSIGNMENT.match(line)
        if not match:
            continue
        key = next((part for part in match.group(1, 2, 3) if part is not None), "")
        value = match.group(5)
        normalized = re.sub(r"[^a-z0-9]", "", key.lower())
        if _sensitive_key(key) and _literal(value) or BEARER.search(value):
            found.add("embedded_credential")
        if normalized == "approvalpolicy" and value.lower() == "never":
            found.add("approval_disabled")
        if normalized == "sandboxmode" and value.lower() == "danger-full-access":
            found.add("sandbox_disabled")
        if NETWORK_PIPE.search(value):
            found.add("remote_shell_pipeline")
    return found


def _is_link_or_reparse(info):
    # Windows junctions are reparse points and may not report as symlinks.
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, "st_file_attributes", 0) & 0x400)


def _read_config(root, relative):
    """Return bytes and a fixed reason. Never echo file content or OS errors."""
    path = root
    parts = Path(relative).parts
    for index, part in enumerate(parts):
        path = path / part
        try:
            info = path.lstat()
        except FileNotFoundError:
            return None, None
        except OSError:
            return None, "unreadable"
        if _is_link_or_reparse(info):
            return None, "symlink_skipped"
        if index < len(parts) - 1 and not stat.S_ISDIR(info.st_mode):
            return None, "not_a_directory"
    if not stat.S_ISREG(info.st_mode):
        return None, "not_a_regular_file"
    if info.st_size > MAX_FILE_BYTES:
        return None, "file_too_large"
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_BINARY", 0)
    try:
        fd = os.open(str(path), flags)
        with os.fdopen(fd, "rb") as handle:
            opened = os.fstat(handle.fileno())
            if not stat.S_ISREG(opened.st_mode) or (opened.st_dev, opened.st_ino) != (info.st_dev, info.st_ino):
                return None, "file_changed"
            payload = handle.read(MAX_FILE_BYTES + 1)
    except OSError:
        return None, "unreadable"
    if len(payload) > MAX_FILE_BYTES:
        return None, "file_too_large"
    return payload, None


def scan(root):
    """Inspect fixed files beneath root without executing or changing them."""
    path = Path(root).expanduser()
    try:
        root_info = path.lstat()
    except OSError:
        raise ValueError("Project path must be an existing directory") from None
    if _is_link_or_reparse(root_info) or not stat.S_ISDIR(root_info.st_mode):
        raise ValueError("Project path must be an existing non-symlink directory")
    path = path.resolve()
    findings = []
    incomplete = []
    files_scanned = 0
    for relative in CONFIG_FILES:
        payload, reason = _read_config(path, relative)
        if reason:
            incomplete.append({"file": relative, "reason": reason})
            continue
        if payload is None:
            continue
        files_scanned += 1
        try:
            text = payload.decode("utf-8-sig")
            if relative.endswith(".json"):
                found, reason = _analyze_json(json.loads(text))
            else:
                found, reason = _analyze_toml_text(text), None
        except (UnicodeError, ValueError, RecursionError):
            incomplete.append({"file": relative, "reason": "invalid_or_unsupported_content"})
            continue
        if reason:
            incomplete.append({"file": relative, "reason": reason})
        for rule in sorted(found):
            severity, detail = RULES[rule]
            findings.append({"file": relative, "rule": rule, "severity": severity, "detail": detail})
    return {
        "status": "incomplete" if incomplete else ("complete" if files_scanned else "no_configs"),
        "files_scanned": files_scanned,
        "incomplete": incomplete,
        "findings": findings,
        "limitations": "Heuristic checks only; not exhaustive. Config values, commands, server names and OS errors are not printed.",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Read-only offline audit of selected agent configuration files")
    parser.add_argument("--path", default=".", help="Project directory to inspect")
    parser.add_argument("--fail-on-high", action="store_true", help="Exit 1 if a high-severity heuristic is found")
    options = parser.parse_args(argv)
    try:
        report = scan(options.path)
    except ValueError as exc:
        parser.error(str(exc))
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if report["status"] == "incomplete":
        return 2
    if options.fail_on_high and any(item["severity"] == "high" for item in report["findings"]):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

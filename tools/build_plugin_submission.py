#!/usr/bin/env python3
"""Build and validate a self-contained public JRHagents plugin ZIP. Stdlib only."""
from __future__ import annotations

import argparse
import io
import json
import math
from pathlib import Path
import struct
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "submission/plugin.json"
SKILL = ROOT / "skills/jrhagents"
FAVICON = ROOT / "docs/assets/favicon.svg"
DATE = (2020, 1, 1, 0, 0, 0)
REQUIRED_URLS = ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL")
STAR = ((32, 10), (37.8, 26.2), (54, 32), (37.8, 37.8),
        (32, 54), (26.2, 37.8), (10, 32), (26.2, 26.2))


def inside_polygon(x: float, y: float) -> bool:
    inside = False
    for i, (x1, y1) in enumerate(STAR):
        x2, y2 = STAR[(i + 1) % len(STAR)]
        if (y1 > y) != (y2 > y):
            crossing = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < crossing:
                inside = not inside
    return inside


def inside_rounded_square(x: float, y: float) -> bool:
    radius = 19
    if radius <= x <= 64 - radius or radius <= y <= 64 - radius:
        return True
    cx = radius if x < radius else 64 - radius
    cy = radius if y < radius else 64 - radius
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def chunk(tag: bytes, data: bytes) -> bytes:
    payload = tag + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))


def render_icon() -> bytes:
    """Render the repository's blue/star favicon geometry to a square PNG."""
    source = FAVICON.read_text(encoding="utf-8")
    if 'viewBox="0 0 64 64"' not in source or "#2563EB" not in source:
        raise ValueError("Favicon branding changed; review icon renderer before releasing")
    size, samples = 512, 2
    rgba = io.BytesIO()
    for y in range(size):
        rgba.write(b"\x00")  # PNG filter: None
        for x in range(size):
            blue, white = 0, 0
            for dy in range(samples):
                for dx in range(samples):
                    sx = (x + (dx + 0.5) / samples) * 64 / size
                    sy = (y + (dy + 0.5) / samples) * 64 / size
                    if inside_rounded_square(sx, sy):
                        if inside_polygon(sx, sy):
                            white += 1
                        else:
                            blue += 1
            total = samples * samples
            alpha = round(255 * (white + blue) / total)
            if alpha:
                red = round((255 * white + 37 * blue) / (white + blue))
                green = round((255 * white + 99 * blue) / (white + blue))
                b = round((255 * white + 235 * blue) / (white + blue))
            else:
                red, green, b = 0, 0, 0
            rgba.write(bytes((red, green, b, alpha)))
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(rgba.getvalue(), 9)) + chunk(b"IEND", b""))


def contents() -> dict[str, bytes]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("name") != "jrh-agents":
        raise ValueError("Unexpected plugin identity")
    if not manifest.get("version"):
        raise ValueError("Missing version")
    if any(field in manifest for field in ("apps", "hooks", "lifecycle")):
        raise ValueError("Unsupported public submission component")
    ext = manifest.get("extensions", {}).get("com.openai", {})
    if ext.get("apps") is not None or ext.get("mcpServers") is not None:
        raise ValueError("This build is intentionally skills-only")
    interface = ext["interface"]
    for field in REQUIRED_URLS:
        url = interface.get(field)
        if not isinstance(url, str) or not url.startswith("https://"):
            raise ValueError("Missing public HTTPS listing URL: " + field)
    if len(interface.get("shortDescription", "")) > 30:
        raise ValueError("Listing subtitle is too long")
    if len(interface.get("displayName", "")) > 30:
        raise ValueError("Listing title is too long")
    if not (SKILL / "SKILL.md").is_file():
        raise ValueError("Missing canonical skill")
    workflows = json.loads((SKILL / "workflow-index.json").read_text(encoding="utf-8"))
    if workflows.get("schema_version") != 1 or len(workflows.get("workflows", [])) != 66:
        raise ValueError("Expected exactly 66 defined workflows")
    result = {"plugin.json": (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"),
              "assets/jrh-icon.png": render_icon(),
              "LICENSE": (ROOT / "LICENSE").read_bytes()}
    for item in sorted(SKILL.rglob("*")):
        if not item.is_file() or item.is_symlink():
            continue
        if any(part.startswith(".") or part == "__pycache__" for part in item.relative_to(SKILL).parts):
            continue
        if item.suffix in (".pyc", ".zip", ".gz"):
            continue
        target = "skills/jrhagents/" + item.relative_to(SKILL).as_posix()
        if target in result:
            raise ValueError("Duplicate package path: " + target)
        result[target] = item.read_bytes()
    if len(result) < 12:
        raise ValueError("Package unusually small; inspect source")
    return result


def build() -> bytes:
    files = contents()
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o644 << 16)
            z.writestr(info, data)
    payload = output.getvalue()
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        if z.testzip() is not None:
            raise ValueError("Corrupted ZIP entry")
        if set(z.namelist()) != set(files):
            raise ValueError("ZIP inventory mismatch")
        if not z.read("assets/jrh-icon.png").startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("Invalid PNG icon")
        for p in ("plugin.json", "skills/jrhagents/SKILL.md", "skills/jrhagents/workflow-index.json"):
            if p not in z.namelist():
                raise ValueError("Missing required ZIP item: " + p)
    if len(payload) > 100 * 1024 * 1024:
        raise ValueError("ZIP exceeds portal size limit")
    return payload


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    default = ROOT / ("dist/JRHagents-public-submission-v" + manifest["version"] + ".zip")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=default)
    parser.add_argument("--verify", action="store_true", help="Validate reproducibility and content")
    args = parser.parse_args()
    payload = build()
    if args.verify and payload != build():
        raise ValueError("Package build is not reproducible")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(payload)
    print(f"PASS: {args.output} ({len(payload)} bytes) with source skill and PNG icon")


if __name__ == "__main__":
    main()

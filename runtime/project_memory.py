"""Optional, explicit project memory for a host that can store local files.

Memory is untrusted reference material. This module never executes saved text,
calls a model, discovers a project directory, or decides what to remember.
"""

from __future__ import annotations

from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import os
import re
import sqlite3
import stat
from uuid import uuid4


_APPLICATION_ID = 0x4A52484D  # JRHM, identifies databases owned by this module
_SCHEMA_VERSION = 1
_DEFAULT_MAX_ENTRIES = 100
_MAX_ENTRIES = 1000
_KINDS = frozenset({"decision", "progress", "handoff", "note"})
_CREDENTIAL_PATTERNS = (
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", re.I),
    re.compile(r"\b(?:sk-(?:proj-)?|ghp_|github_pat_)[A-Za-z0-9_-]{12,}\b", re.I),
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+/=-]{8,}", re.I),
    re.compile(
        r"\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret)"
        r"\s*[:=]\s*['\"]?[^\s,'\"]{6,}",
        re.I,
    ),
)


class MemoryCapacityError(ValueError):
    """The configured entry limit was reached; no entry was changed."""


def _text(value: str, name: str, maximum: int, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str) or (not allow_empty and not value.strip()):
        raise ValueError(f"{name} must be a non-empty string")
    try:
        size = len(value.encode("utf-8"))
    except UnicodeEncodeError as exc:
        raise ValueError(f"{name} must be valid UTF-8") from exc
    if size > maximum or "\x00" in value:
        raise ValueError(f"{name} exceeds its limit or contains a NUL character")
    return value


def _check_regular_private_file(path: Path) -> None:
    """Reject symlinks, special files, and world/group-readable files on POSIX."""
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode):
        raise ValueError("memory path must be a regular file, not a symlink")
    if os.name == "posix" and stat.S_IMODE(info.st_mode) & 0o077:
        raise PermissionError("memory file must not grant group or other access")


class ProjectMemory:
    """Store bounded, explicitly selected project notes in a local SQLite file.

    A host must supply a path and opt in. Each save also needs an explicit
    confirmation that the selected content is non-sensitive. SQLite controls
    concurrent writes; entry limits apply across the entire database.
    """

    def __init__(self, path: str | os.PathLike[str], *, enabled: bool = False,
                 max_entries: int | None = None) -> None:
        if enabled is not True:
            raise PermissionError("project memory requires explicit enablement")
        if max_entries is not None and (
            type(max_entries) is not int or not 1 <= max_entries <= _MAX_ENTRIES
        ):
            raise ValueError(f"max_entries must be an integer from 1 to {_MAX_ENTRIES}")
        self.path = Path(path).absolute()
        if not self.path.parent.is_dir():
            raise ValueError("memory parent directory must already exist")

        # The host owns the parent directory. An exclusive create avoids
        # overwriting existing files; opening a symlink is not permitted.
        try:
            fd = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            _check_regular_private_file(self.path)
            self._verify_database(max_entries)
        else:
            os.close(fd)
            self._initialize_database(max_entries or _DEFAULT_MAX_ENTRIES)

    def _raw_connection(self) -> sqlite3.Connection:
        _check_regular_private_file(self.path)
        return sqlite3.connect(str(self.path), timeout=5, isolation_level=None)

    def _initialize_database(self, maximum: int) -> None:
        with closing(self._raw_connection()) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                db.execute(f"PRAGMA application_id = {_APPLICATION_ID}")
                db.execute(f"PRAGMA user_version = {_SCHEMA_VERSION}")
                db.execute("CREATE TABLE settings (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), max_entries INTEGER NOT NULL)")
                db.execute("INSERT INTO settings (singleton, max_entries) VALUES (1, ?)", (maximum,))
                db.execute("""CREATE TABLE entries (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT,
                    entry_id TEXT NOT NULL UNIQUE,
                    project TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )""")
                db.execute("COMMIT")
            except BaseException:
                db.execute("ROLLBACK")
                raise
        self.max_entries = maximum

    def _verify_database(self, maximum: int | None = None) -> None:
        try:
            with closing(self._raw_connection()) as db:
                app_id = db.execute("PRAGMA application_id").fetchone()[0]
                version = db.execute("PRAGMA user_version").fetchone()[0]
                if app_id != _APPLICATION_ID or version != _SCHEMA_VERSION:
                    raise ValueError("not a supported JRHagents memory database")
                row = db.execute("SELECT max_entries FROM settings WHERE singleton = 1").fetchone()
                # Verify the expected table exists before accepting the file.
                db.execute("SELECT seq, entry_id, project, kind, title, body, source, created_at FROM entries LIMIT 0")
                if not row or type(row[0]) is not int or not 1 <= row[0] <= _MAX_ENTRIES:
                    raise ValueError("invalid project memory settings")
                if maximum is not None and maximum != row[0]:
                    raise ValueError("max_entries does not match the existing memory database")
                self.max_entries = row[0]
        except sqlite3.DatabaseError as exc:
            raise ValueError("invalid project memory database") from exc

    def _connect(self) -> sqlite3.Connection:
        self._verify_database(self.max_entries)
        return self._raw_connection()

    @staticmethod
    def _entry(row: tuple) -> dict[str, str]:
        entry_id, project, kind, title, body, source, created_at = row
        return {
            "id": entry_id, "project": project, "kind": kind,
            "title": title, "body": body, "source": source,
            "created_at": created_at, "trust": "untrusted",
        }

    def save(self, *, project: str, kind: str, title: str, body: str,
             source: str = "manual", confirmed_non_sensitive: bool = False) -> dict[str, str]:
        if confirmed_non_sensitive is not True:
            raise PermissionError("saving requires confirmation that the content is non-sensitive")
        project = _text(project, "project", 128)
        title = _text(title, "title", 256)
        body = _text(body, "body", 4096)
        source = _text(source, "source", 128)
        if not isinstance(kind, str) or kind not in _KINDS:
            raise ValueError("kind must be decision, progress, handoff, or note")
        if any(pattern.search(text) for pattern in _CREDENTIAL_PATTERNS for text in (project, title, body, source)):
            raise ValueError("possible credential detected; remove it before saving")

        values = (uuid4().hex, project, kind, title, body, source,
                  datetime.now(timezone.utc).isoformat())
        with closing(self._connect()) as db:
            db.execute("BEGIN IMMEDIATE")
            try:
                count = db.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
                if count >= self.max_entries:
                    raise MemoryCapacityError("project memory capacity reached; delete an entry first")
                db.execute("INSERT INTO entries (entry_id, project, kind, title, body, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", values)
                db.execute("COMMIT")
            except BaseException:
                db.execute("ROLLBACK")
                raise
        return self._entry(values)

    def search(self, *, project: str, query: str = "", limit: int = 20) -> list[dict[str, str]]:
        project = _text(project, "project", 128)
        query = _text(query, "query", 256, allow_empty=True)
        if type(limit) is not int or not 1 <= limit <= 100:
            raise ValueError("limit must be an integer from 1 to 100")
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT entry_id, project, kind, title, body, source, created_at FROM entries WHERE project = ? ORDER BY seq DESC",
                (project,),
            )
            result = []
            needle = query.casefold()
            for row in rows:
                if needle and not any(needle in value.casefold() for value in (row[2], row[3], row[4], row[5])):
                    continue
                result.append(self._entry(row))
                if len(result) >= limit:
                    break
        return result

    def delete(self, *, project: str, entry_id: str) -> bool:
        project = _text(project, "project", 128)
        entry_id = _text(entry_id, "entry_id", 64)
        with closing(self._connect()) as db:
            result = db.execute("DELETE FROM entries WHERE project = ? AND entry_id = ?", (project, entry_id))
            return result.rowcount == 1

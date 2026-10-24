#!/usr/bin/env python3
"""Build a deterministic, offline Agent Skill archive. Standard library only."""
import argparse
import io
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / 'skills/jrhagents'
EXCLUDE = {'__pycache__', '.DS_Store'}


def build() -> bytes:
    catalog = json.loads((SKILL / 'workflow-index.json').read_text(encoding='utf-8'))
    if catalog.get('schema_version') != 1 or len(catalog.get('workflows', [])) != 66:
        raise ValueError('Generate and validate the 66-workflow index first')
    paths = sorted(p for p in SKILL.rglob('*') if p.is_file() and not p.is_symlink()
                   and not any(part in EXCLUDE for part in p.parts) and p.suffix != '.pyc')
    if not (SKILL / 'SKILL.md') in paths:
        raise ValueError('Canonical SKILL.md is missing')
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in paths:
            name = Path('jrhagents') / path.relative_to(SKILL)
            info = zipfile.ZipInfo(name.as_posix(), date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o644 << 16)
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buffer.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/jrhagents-skill.zip')
    args = parser.parse_args()
    payload = build()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(payload)
    print(f'Wrote {args.output} ({len(payload)} bytes)')


if __name__ == '__main__':
    main()

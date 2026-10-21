#!/usr/bin/env python3
"""Portable entrypoint, including when the skill is installed without pip."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from jrhagents.cli import main
if __name__ == "__main__":
    main()

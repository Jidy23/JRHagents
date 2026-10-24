import importlib.util
import io
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('package_release', ROOT / 'tools/package_release.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ReleaseTests(unittest.TestCase):
    def test_archive_is_deterministic_and_complete(self):
        first, second = MODULE.build(), MODULE.build()
        self.assertEqual(first, second)
        with zipfile.ZipFile(io.BytesIO(first)) as archive:
            names = archive.namelist()
            self.assertEqual(len(names), len(set(names)))
            for required in ('jrhagents/SKILL.md', 'jrhagents/workflow-index.json',
                             'jrhagents/references/ACADEMIC.md'):
                self.assertIn(required, names)
            self.assertTrue(all(name.startswith('jrhagents/') and '..' not in Path(name).parts for name in names))
            self.assertFalse(any('.env' in name or '__pycache__' in name for name in names))


if __name__ == '__main__':
    unittest.main()

import unittest
import zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'docs/downloads'

class DownloadTests(unittest.TestCase):
    def test_skill_zip_has_manifest(self):
        with zipfile.ZipFile(ROOT/'JRHagents-Skill.zip') as z:
            self.assertIn('jrhagents/SKILL.md',z.namelist())
            self.assertTrue(z.read('jrhagents/SKILL.md').startswith(b'---'))
    def test_claude_plugin_bundle(self):
        with zipfile.ZipFile(ROOT/'JRHagents-Claude-Plugin.zip') as z:
            self.assertIn('JRHagents/.claude-plugin/plugin.json',z.namelist())
            self.assertIn('JRHagents/skills/jrhagents/SKILL.md',z.namelist())
    def test_wheel_exists(self):
        with zipfile.ZipFile(ROOT/'jrhagents-19.0.0-py3-none-any.whl') as z:
            self.assertIn('jrhagents/setup.py',z.namelist())
            self.assertTrue(any(x.endswith('.dist-info/METADATA') for x in z.namelist()))
if __name__=='__main__': unittest.main()

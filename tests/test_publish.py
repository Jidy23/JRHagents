"""Publisher safety tests: no remote calls."""
import subprocess
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'tools'/'publish.py'
class PublisherTests(unittest.TestCase):
    def test_dry_run_does_not_require_github_access(self):
        p=subprocess.run([sys.executable,str(SCRIPT)],capture_output=True,text=True,timeout=10)
        self.assertEqual(p.returncode,0)
        self.assertIn('DRY RUN',p.stdout)
    def test_wrong_confirmation_is_refused(self):
        p=subprocess.run([sys.executable,str(SCRIPT),'--confirm-public','other/repo'],capture_output=True,text=True,timeout=10)
        self.assertEqual(p.returncode,2)
        self.assertIn('Refused',p.stderr)
if __name__=='__main__':unittest.main()

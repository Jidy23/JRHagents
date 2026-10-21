import struct
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
class SupportTests(unittest.TestCase):
    def test_site_loads_support_assets(self):
        html = (DOCS / 'index.html').read_text(encoding='utf-8')
        self.assertIn('assets/support.css?v=34', html)
        self.assertIn('assets/support.js?v=34', html)
    def test_qris_is_small_valid_png(self):
        b = (DOCS / 'assets/qris-support.png').read_bytes()
        self.assertTrue(b.startswith(b'\x89PNG\r\n\x1a\n'))
        w,h = struct.unpack('>II', b[16:24])
        self.assertGreaterEqual(min(w,h), 300)
        self.assertLess(len(b), 60000)
    def test_opt_in_and_recipient_disclosure(self):
        js = (DOCS / 'assets/support.js').read_text(encoding='utf-8')
        self.assertIn('KOPDES NUSANTARA', js)
        self.assertIn("dialog.showModal()", js)
        self.assertIn("document.querySelectorAll('[data-open-support]')", js)
        self.assertIn('not JRHagents', js)
        self.assertNotIn('payment succeeded', js.lower())
        self.assertIn("imgPath", js)
        self.assertIn('download="JRHagents-Support-QRIS.png"', js)
    def test_contribution_and_docs(self):
        self.assertIn('CONTRIBUTING.md',(DOCS / 'assets/support.js').read_text(encoding='utf-8'))
        self.assertIn('KOPDES NUSANTARA',(DOCS / 'SUPPORT.md').read_text(encoding='utf-8'))

import struct
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'docs/index.html').read_text(encoding='utf-8')
CSS=(ROOT/'docs/assets/support.css').read_text(encoding='utf-8')
JS=(ROOT/'docs/assets/support.js').read_text(encoding='utf-8')
class SupportTests(unittest.TestCase):
    def test_nav_next_to_language_and_no_large_card(self):
        self.assertIn('id="supportNavButton"',HTML)
        self.assertLess(HTML.index('id="langToggle"'),HTML.index('id="supportNavButton"'))
        self.assertLess(HTML.index('id="supportNavButton"'),HTML.index('id="themeToggle"'))
        self.assertNotIn('support-card-actions',HTML)
        self.assertEqual(HTML.count('id="jrhSupportDialog"'),1)
    def test_script_and_css_referenced(self):
        self.assertIn('assets/support.css?v=35',HTML)
        self.assertIn('assets/support.js?v=35',HTML)
    def test_qr_png_optimized(self):
        b=(ROOT/'docs/assets/qris-support.png').read_bytes()
        self.assertTrue(b.startswith(b'\x89PNG\r\n\x1a\n'))
        w,h=struct.unpack('>II',b[16:24])
        self.assertGreaterEqual(min(w,h),300)
        self.assertLess(len(b),60000)
    def test_no_automatic_payment_or_overlay(self):
        self.assertIn('showModal',JS)
        self.assertIn("openButton.addEventListener('click'",JS)
        self.assertIn('KOPDES NUSANTARA',HTML)
        self.assertIn('Nama QRIS berbeda',HTML)
        self.assertNotIn('fetch(',JS)
    def test_mobile_and_accessibility(self):
        self.assertIn('aria-haspopup="dialog"',HTML)
        self.assertIn('prefers-reduced-motion',CSS)
        self.assertIn('max-width:450px',CSS)
        self.assertIn('focus()',JS)
if __name__=='__main__':unittest.main()

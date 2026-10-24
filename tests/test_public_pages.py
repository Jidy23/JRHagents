"""Regression checks for public JRHagents policy and support pages."""
from pathlib import Path
import re
import unittest

DOCS = Path(__file__).resolve().parents[1] / "docs"


class PublicPagesTest(unittest.TestCase):
    def test_required_pages_exist_and_have_headings(self):
        for name, heading in [
            ("index.html", "JRHagents"),
            ("support.html", "Bantuan &amp; Dukungan"),
            ("privacy.html", "Privacy Policy"),
            ("terms.html", "Terms of Use"),
        ]:
            with self.subTest(page=name):
                text = (DOCS / name).read_text(encoding="utf-8")
                self.assertIn("<title>", text)
                # Match semantic page content, allowing escaped HTML entities.
                if name == "support.html":
                    self.assertIn("<h1>Bantuan & Dukungan</h1>", text)
                else:
                    self.assertIn(heading, text)

    def test_crosslinks_point_to_actual_pages(self):
        for name in ("index.html", "support.html", "privacy.html", "terms.html"):
            with self.subTest(page=name):
                html = (DOCS / name).read_text(encoding="utf-8")
                self.assertNotIn("SUPPORT.html", html)
                for target in ("support.html", "privacy.html", "terms.html"):
                    if target in html:
                        self.assertTrue((DOCS / target).is_file(), f"{name} points to missing {target}")

    def test_footer_support_link_is_navigable(self):
        html = (DOCS / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="support.html">Support</a>', html)


if __name__ == "__main__":
    unittest.main()

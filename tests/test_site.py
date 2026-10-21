"""No-dependency checks for the public documentation frontend."""
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
HTML=(DOCS/'index.html').read_text(encoding='utf-8')
JS=(DOCS/'assets/app.js').read_text(encoding='utf-8')
CSS=(DOCS/'assets/style.css').read_text(encoding='utf-8')

class PublicSiteTests(unittest.TestCase):
    def test_assets_exist(self):
        for asset in re.findall(r'(?:href|src)="(assets/[^"#?]+)"',HTML):
            self.assertTrue((DOCS/asset).is_file(),asset)
    def test_one_canonical_skill(self):
        self.assertIn('Satu skill.',HTML)
        self.assertIn('npx skills add Jidy23/JRHagents --skill jrhagents',HTML)
    def test_no_fake_ai_execution(self):
        self.assertIn('Tidak ada model AI yang berjalan',HTML)
        self.assertNotIn('jrh run web.search',HTML)
        self.assertNotIn('pip install jrhagents',HTML)
    def test_install_has_manual_fallback(self):
        self.assertIn('id="pathChat"',HTML)
        self.assertIn('id="copyUniversal"',HTML)
        self.assertIn('UNIVERSAL_PROMPT.md',HTML)
    def test_interactive_controls_are_wired(self):
        for control in ('pathCoding','pathChat','clientSelect','copyInstall','copyUniversal',
                        'taskType','taskDetail','generateTask','copyTask','downloadTask',
                        'capSearch','categoryFilters','showAllCapabilities','themeToggle','menuToggle'):
            self.assertIn(f'id="{control}"',HTML,control)
            if control in ("pathCoding", "pathChat"):
                self.assertIn("[data-path]",JS,control)
            elif control == "categoryFilters":
                self.assertIn("#categoryFilters",JS,control)
            else:
                self.assertIn("$('#"+control+"')",JS,control)
    def test_accessibility_and_reduced_motion(self):
        self.assertIn('prefers-reduced-motion:reduce',CSS)
        self.assertIn('aria-live="polite"',HTML)
        self.assertIn('skip-link',HTML)
        self.assertIn(':focus-visible',CSS)
    def test_zero_external_frontend_dependencies(self):
        self.assertNotIn('https://cdn.',HTML)
        self.assertNotIn('unpkg.com',HTML)
        self.assertNotIn('googleapis.com',HTML)
        self.assertNotIn('three.js',HTML.lower())
    def test_26_capabilities_present(self):
        self.assertIn('const caps=[',JS)
        # entries shaped as [n,'capability name', ...]
        matches=re.findall(r'^\s*\[(\d+),\'[^\']+\',',JS,re.M)
        self.assertEqual([int(x) for x in matches],list(range(1,27)))

if __name__=='__main__': unittest.main()

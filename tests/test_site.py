"""No-dependency, static integrity checks for the compact responsive docs."""
from html.parser import HTMLParser
from pathlib import Path
import re
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
HTML = (DOCS / 'index.html').read_text(encoding='utf-8')
JS = (DOCS / 'assets/app.js').read_text(encoding='utf-8')
GUIDE = (DOCS / 'assets/guide.js').read_text(encoding='utf-8')
CSS = (DOCS / 'assets/style.css').read_text(encoding='utf-8')
PROMPTJS = (DOCS / 'assets/prompt-data.js').read_text(encoding='utf-8')

class ElementInspector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]
    def handle_starttag(self, tag, attrs):
        self.ids.extend(value for key,value in attrs if key=='id')

class SiteTests(unittest.TestCase):
    def test_references_exist(self):
        for asset in re.findall(r'(?:href|src)="(assets/[^"#?]+)(?:\?v=\d+)?"',HTML):
            self.assertTrue((DOCS/asset).is_file(),asset)
    def test_ids_unique(self):
        inspect=ElementInspector();inspect.feed(HTML)
        self.assertEqual(len(inspect.ids),len(set(inspect.ids)))
    def test_one_skill_not_cloud(self):
        self.assertIn('Universal Skill',HTML)
        self.assertIn('Tidak ada model AI yang berjalan',HTML)
        self.assertNotIn('pip install jrhagents',HTML)
        self.assertNotIn('jrh run web.search',HTML)
    def test_chat_is_default_without_terminal(self):
        self.assertIn('data-mode="chat" aria-pressed="true"',HTML)
        self.assertIn("mode:'chat'",JS)
        self.assertIn('Jika create_skill meminta URL API',GUIDE)
        self.assertIn('Tidak perlu terminal',GUIDE)
    def test_all_controls_wired(self):
        for key in ('heroStart','heroExample','primaryCopy','secondaryAction','expandOutput',
                    'clientChoices','taskType','generatePrompt','copyGenerated','downloadGenerated',
                    'featureSearch','featureFilters','showFeatures','themeToggle','mobileMenu',
                    'helpUseChat','outputText','toggleSteps'):
            self.assertIn(f'id="{key}"',HTML,key)
            self.assertIn("'#"+key+"'",JS,key)
        for section in ('mulai','contoh','kemampuan','bantuan'):
            self.assertIn(f'id="panel-{section}"',HTML)
    def test_accessibility(self):
        for required in ('role="tablist"','role="tabpanel"','aria-live="polite"',
                         'aria-selected="true"','skip-link','prefers-reduced-motion:reduce',
                         ':focus-visible','env(safe-area-inset-bottom)'):
            self.assertIn(required,HTML+CSS)
    def test_no_remote_frontend_packages(self):
        for unwanted in ('unpkg.com','cdn.jsdelivr','three.min.js','googleapis.com','fonts.googleapis'):
            self.assertNotIn(unwanted,(HTML+CSS+JS).lower())
    def test_prompt_sync(self):
        raw=(ROOT/'UNIVERSAL_PROMPT.md').read_text(encoding='utf-8').split('\n---\n')[1].strip()
        encoded=PROMPTJS.split('root.JRH_FULL_PROMPT=',1)[1].split(';}',1)[0]
        self.assertEqual(json.loads(encoded),raw)
    def test_minimum_payload(self):
        self.assertLess(len(HTML.encode()),25000)
        self.assertLess(len(CSS.encode()),35000)
        self.assertLess(len(JS.encode()),16000)
    def test_mobile_compact_tabs(self):
        self.assertIn('bottom-nav',HTML)
        self.assertIn('grid-template-columns:repeat(4,1fr)',CSS)
        self.assertIn('section id="panel-bantuan"',HTML)

if __name__=='__main__':unittest.main()

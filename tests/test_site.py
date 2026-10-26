from pathlib import Path
import json, re, subprocess, unittest
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'docs/index.html').read_text(encoding='utf-8')
CSS=(ROOT/'docs/assets/style.css').read_text(encoding='utf-8')
JS=(ROOT/'docs/assets/app.js').read_text(encoding='utf-8')
DATA=json.loads((ROOT/'data/capabilities.json').read_text(encoding='utf-8'))
SKILL=(ROOT/'skills/jrhagents/SKILL.md').read_text(encoding='utf-8')
class SiteV33Tests(unittest.TestCase):
    def test_all_66_are_unique_and_in_order(self):
        self.assertEqual(len(DATA),66)
        self.assertEqual([x['id'] for x in DATA],list(range(1,67)))
        self.assertEqual(len({x['title'] for x in DATA}),66)
        self.assertEqual(len({x['titleEn'] for x in DATA}),66)
    def test_eleven_fields_six_each(self):
        from collections import Counter
        counts=Counter(x['category'] for x in DATA)
        self.assertEqual(len(counts),11)
        self.assertEqual(set(counts.values()),{6})
    def test_each_capability_has_real_reference_and_output(self):
        refs=ROOT/'skills/jrhagents/references'
        for x in DATA:
            self.assertTrue((refs/x['reference']).is_file(),x)
            for k in ('title','titleEn','description','descriptionEn','deliverable','deliverableEn'):
                self.assertGreaterEqual(len(x[k]),7,(x['id'],k))
    def test_generated_catalog_matches_json(self):
        script=(ROOT/'docs/assets/catalog.js').read_text(encoding='utf-8')
        indexed=json.loads((ROOT/'skills/jrhagents/workflow-index.json').read_text(encoding='utf-8'))['workflows']
        self.assertIn('return '+json.dumps(indexed,ensure_ascii=False,separators=(',',':'))+';',script)
        for source,entry in zip(DATA,indexed):
            for field,value in source.items():self.assertEqual(entry[field],value)
        md=(ROOT/'skills/jrhagents/references/CAPABILITIES.md').read_text(encoding='utf-8')
        self.assertEqual(len(re.findall(r'^\| \d\d \|',md,re.M)),66)
    def test_local_assets_exist(self):
        for relative in re.findall(r'(?:href|src)="(assets/[^"?]+)',HTML):
            self.assertTrue((ROOT/'docs'/relative).is_file(),relative)
    def test_task_builder_precedes_output_panel(self):
        self.assertLess(HTML.index('id="taskGoal"'),HTML.index('id="promptBlock"'))
        style=(ROOT/'docs/assets/style.css').read_text(encoding='utf-8')
        self.assertIn('@media(max-width:720px)',style)
        self.assertIn('@media(prefers-reduced-motion:reduce)',style)
    def test_only_single_skill(self):
        self.assertEqual([p.relative_to(ROOT).as_posix() for p in ROOT.rglob('SKILL.md')],['skills/jrhagents/SKILL.md'])
        self.assertIn('66-item capability map',SKILL)
    def test_tabbed_not_endless_landing(self):
        self.assertEqual(HTML.count('data-screen='),4)
        self.assertIn('class="mobile-bottom"',HTML)
        for x in ['mulai','kemampuan','panduan','bantuan']:
            self.assertIn('data-tab="'+x+'"',HTML)
    def test_prompt_mask_is_visual_not_fake_secret(self):
        self.assertIn('class="masked-text"',HTML)
        self.assertIn('filter:blur',CSS)
        self.assertIn('visual styling',JS)
        self.assertIn('universal}',JS)
    def test_no_external_dependencies_or_fake_api(self):
        self.assertNotIn('https://cdn.',HTML)
        self.assertNotIn('jrh run web.search',HTML)
        self.assertNotIn('create_skill(',JS)
        self.assertIn('Node.js',JS)
        self.assertIn('no remote dependencies',JS)
    def test_accessibility(self):
        self.assertIn('aria-live="polite"',HTML)
        self.assertIn('prefers-reduced-motion',CSS)
        self.assertIn(':focus-visible',CSS)
        self.assertIn('role="group"',HTML)
        self.assertIn('skip-link',HTML)
    def test_scripts_exist_and_check(self):
        for src in re.findall(r'<script defer src="([^"]+)',HTML):
            self.assertTrue((ROOT/'docs'/src.split('?')[0]).is_file())
        for name in ['app.js','catalog.js','universal.js']:
            r=subprocess.run(['node','--check',str(ROOT/'docs/assets'/name)],capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stderr)
if __name__=='__main__':unittest.main()

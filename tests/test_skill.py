import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/jrhagents/SKILL.md'
SRC=SKILL.read_text(encoding='utf-8')
REFS=SKILL.parent/'references'
SCRIPT=SKILL.parent/'scripts/project_scan.py'

class SkillFormatTests(unittest.TestCase):
    def test_single_canonical_skill(self):
        self.assertEqual([p.relative_to(ROOT).as_posix() for p in ROOT.rglob('SKILL.md')],['skills/jrhagents/SKILL.md'])
    def test_frontmatter_first(self):
        self.assertTrue(SRC.startswith('---\n'))
        self.assertIn('\n---\n',SRC[4:])
    def test_spec_fields(self):
        front=SRC.split('---\n',2)[1]
        self.assertRegex(front,r'(?m)^name: jrhagents$')
        self.assertRegex(front,r'(?m)^description: .+')
        desc=re.search(r'(?m)^description: (.+)',front).group(1)
        self.assertLessEqual(len(desc),1024)
    def test_body_max_500_lines(self):self.assertLess(len(SRC.splitlines()),500)
    def test_references_resolve(self):
        for relative in re.findall(r'\]\(((?:references|assets)/[^)]+)\)',SRC):
            self.assertTrue((SKILL.parent/relative).is_file(),relative)
    def test_no_duplicate_references(self):
        items=[p.name for p in REFS.iterdir() if p.is_file()]
        self.assertEqual(len(items),len(set(items)))
    def test_access_profiles(self):
        for x in ('CHAT','READ','ACT','NOT RUN','no magical integrations'):
            self.assertIn(x,SRC)
    def test_privacy(self):
        for x in ('secret','authorization','untrusted'):
            self.assertIn(x,(SRC+(REFS/'SAFETY.md').read_text(encoding='utf-8')).lower())
    def test_all_nine_domains(self):
        for f in ['ENGINEERING','DESIGN','RESEARCH','WRITING','DATA','BUSINESS','LEARNING','AUTOMATION','QUALITY']:
            self.assertTrue((REFS/(f+'.md')).exists())
    def test_26_capabilities(self):
        s=(REFS/'CAPABILITIES.md').read_text(encoding='utf-8')
        nums=re.findall(r'^\| (\d\d) \|',s,re.M)
        self.assertEqual(nums,[f'{i:02d}' for i in range(1,27)])
    def test_manual_prompt(self):
        s=(ROOT/'UNIVERSAL_PROMPT.md').read_text(encoding='utf-8')
        self.assertIn('manual fallback',s)
        self.assertIn('tool',s.lower())
    def test_docs_no_fake_cloud(self):
        s=(ROOT/'README.md').read_text(encoding='utf-8')
        self.assertIn('not an AI model',s)
        self.assertIn('npx skills add Jidy23/JRHagents --skill jrhagents',s)
    def test_web_guide_is_explicitly_just_docs(self):
        s=(ROOT/'docs/index.html').read_text(encoding='utf-8')
        self.assertIn('Tidak ada model AI yang berjalan',s)
        self.assertNotIn('jrh run web.search',s)
    def test_license_exists(self):self.assertIn('MIT License',(ROOT/'LICENSE').read_text(encoding='utf-8'))

class ScannerTests(unittest.TestCase):
    def call(self,path,*args):
        p=subprocess.run([sys.executable,str(SCRIPT),'--path',str(path),*args],capture_output=True,text=True)
        return p
    def test_no_files(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.call(d)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertEqual(json.loads(p.stdout)['files_scanned'],0)
    def test_reads_and_locates(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'app.js').write_text('const x=1;\n// TODO check\ndebugger;\n')
            r=json.loads(self.call(d).stdout)
            self.assertEqual(r['files_scanned'],1)
            self.assertIn(2,[x['line'] for x in r['findings']])
            self.assertIn(3,[x['line'] for x in r['findings']])
    def test_skips_env_and_secret_file(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'.env').write_text('SECRET_TOKEN=MY_SUPER_SECRET_VALUE')
            (Path(d)/'secrets.json').write_text('{"token":"MY_SUPER_SECRET_VALUE"}')
            r=self.call(d)
            self.assertEqual(r.returncode,0)
            self.assertNotIn('MY_SUPER_SECRET_VALUE',r.stdout)
            self.assertEqual(json.loads(r.stdout)['files_scanned'],0)
    def test_redacts_credentials(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d)/'app.py').write_text('api_key = "MY_SUPER_SECRET_VALUE"\n')
            r=self.call(d)
            self.assertEqual(r.returncode,0)
            self.assertNotIn('MY_SUPER_SECRET_VALUE',r.stdout)
            self.assertTrue(any(x['severity']=='high' for x in json.loads(r.stdout)['findings']))
    def test_limits(self):
        with tempfile.TemporaryDirectory() as d:
            for i in range(6):(Path(d)/(str(i)+'.md')).write_text('TODO\n')
            r=json.loads(self.call(d,'--max-files','2').stdout)
            self.assertEqual(r['files_scanned'],2)
            self.assertTrue(r['truncated'])
    def test_skips_symlinks(self):
        with tempfile.TemporaryDirectory() as d:
            real=Path(d)/'real.md';real.write_text('TODO')
            link=Path(d)/'a.md'
            try:link.symlink_to(real)
            except (OSError,NotImplementedError):self.skipTest('symlink unavailable')
            self.assertEqual(json.loads(self.call(d).stdout)['files_scanned'],1)
    def test_bad_path(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.call(Path(d)/'missing')
            self.assertNotEqual(p.returncode,0)
    def test_bad_limit(self):
        with tempfile.TemporaryDirectory() as d:
            p=self.call(d,'--max-files','0')
            self.assertNotEqual(p.returncode,0)
    def test_no_project_code_executed(self):
        with tempfile.TemporaryDirectory() as d:
            marker=Path(d)/'EXECUTED'
            (Path(d)/'trap.py').write_text('from pathlib import Path\nPath('+repr(str(marker))+').write_text("oops")\n')
            p=self.call(d)
            self.assertEqual(p.returncode,0)
            self.assertFalse(marker.exists())

if __name__=='__main__':unittest.main()

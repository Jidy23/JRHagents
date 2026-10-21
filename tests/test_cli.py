import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/"scripts"/"jrhagents.py"
spec=importlib.util.spec_from_file_location("jrhagents_cli",SCRIPT)
cli=importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)

class TestJRHagents(unittest.TestCase):
    def test_intents(self):
        self.assertEqual(cli.route("buat diagram arsitektur"),"diagram")
        self.assertEqual(cli.route("rapikan tampilan UI"),"polish")
        self.assertEqual(cli.route("audit proyek"),"audit")
    def test_doctor(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(cli.doctor(d)["status"],"ok")
    def test_audit_credential_redaction(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,".env").write_text("SECRET_VALUE=not-to-leak")
            report=cli.audit(d)
            self.assertTrue(report["findings"])
            self.assertNotIn("not-to-leak",str(report))
    def test_init_no_overwrite(self):
        with tempfile.TemporaryDirectory() as d:
            x=cli.initialize(d)
            self.assertEqual(x["status"],"created")
            p=Path(x["path"]);p.write_text("custom")
            self.assertEqual(cli.initialize(d)["status"],"already_exists")
            self.assertEqual(p.read_text(),"custom")
    def test_report_generated(self):
        with tempfile.TemporaryDirectory() as d:
            r=cli.report(d)
            self.assertTrue(Path(r["html"]).exists())
            self.assertTrue(Path(r["json"]).exists())
    def test_verify_opt_in(self):
        with tempfile.TemporaryDirectory() as d:
            r=cli.verify(d)
            self.assertTrue(all(x["status"]=="NOT_RUN" for x in r["checks"] if x["name"] in {"Tests","Build"}))
    def test_install_preserves_existing(self):
        with tempfile.TemporaryDirectory() as d:
            r=cli.install("codex",d,"project")
            self.assertTrue(Path(r["installed_at"],"SKILL.md").exists())
            with self.assertRaises(FileExistsError):cli.install("codex",d,"project")

if __name__=="__main__":unittest.main()

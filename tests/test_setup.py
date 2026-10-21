import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from jrhagents.setup import setup, mcp_destination
from jrhagents.cli import run

class SetupTests(unittest.TestCase):
    def test_skill_installs_actual_files_and_dry_run(self):
        with tempfile.TemporaryDirectory() as temp:
            self.assertEqual(setup('skill','codex',temp,dry_run=True)['action'],'would_install')
            self.assertFalse((Path(temp)/'.agents').exists())
            r=setup('skill','codex',temp)
            self.assertEqual(r['action'],'installed')
            self.assertIn('name:',(Path(temp)/'.agents/skills/jrhagents/SKILL.md').read_text())
    def test_mcp_installs_preserving_existing_entries(self):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)/'.cursor/mcp.json'
            d.parent.mkdir()
            d.write_text(json.dumps({'mcpServers':{'other':{'command':'no-op'}},'enabled':True}))
            self.assertEqual(setup('mcp','cursor',temp,dry_run=True)['action'],'would_install')
            self.assertNotIn('jrhagents',d.read_text())
            r=setup('mcp','cursor',temp)
            parsed=json.loads(d.read_text())
            self.assertEqual(parsed['mcpServers']['other']['command'],'no-op')
            self.assertTrue(parsed['enabled'])
            self.assertEqual(parsed['mcpServers']['jrhagents']['args'][-1],str(Path(temp).resolve()))
            self.assertTrue(Path(r['backup_at']).is_file())
            self.assertEqual(setup('mcp','cursor',temp)['action'],'already_installed')
    def test_vscode_server_type_and_gemini_path(self):
        with tempfile.TemporaryDirectory() as temp:
            setup('mcp','copilot',temp)
            j=json.loads((Path(temp)/'.vscode/mcp.json').read_text())
            self.assertEqual(j['servers']['jrhagents']['type'],'stdio')
            setup('mcp','gemini',temp)
            self.assertTrue((Path(temp)/'.gemini/settings.json').exists())
    def test_invalid_json_refused_no_changes(self):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)/'.mcp.json';d.write_text('broken')
            with self.assertRaises(ValueError): setup('mcp','claude',temp)
            self.assertEqual(d.read_text(),'broken')
    def test_custom_existing_entry_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)/'.mcp.json';d.write_text(json.dumps({'mcpServers':{'jrhagents':{'command':'custom'}}}))
            with self.assertRaises(FileExistsError): setup('mcp','claude',temp)
            self.assertIn('custom',d.read_text())
    def test_mcp_unsupported_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaises(ValueError): setup('mcp','windsurf',temp)
    def test_cli_setup_noninteractive_requires_client(self):
        with patch('sys.stdin.isatty',return_value=False):
            self.assertEqual(run(['setup','--mode','skill']),2)
    def test_reject_symlinked_config_path(self):
        with tempfile.TemporaryDirectory() as temp:
            dest=Path(temp)/'.cursor'
            with tempfile.TemporaryDirectory() as elsewhere:
                dest.symlink_to(elsewhere,target_is_directory=True)
                with self.assertRaises(ValueError): mcp_destination('cursor',temp)

if __name__=='__main__': unittest.main()

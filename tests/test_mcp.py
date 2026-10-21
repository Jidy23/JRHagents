"""End-to-end MCP read-only transport, validation and scoped tools."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from jrhagents.mcp import respond, TOOLS
from jrhagents.installer import CLIENT_DIRS, install, destination
from jrhagents.mcp_config import generate

class MCPTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
    def call(self, method, params=None, req_id=1):
        return respond({"jsonrpc":"2.0","id":req_id,"method":method,"params":params or {}},self.root)
    def test_initialize(self):
        r=self.call('initialize',{'protocolVersion':'2025-06-18'})
        self.assertEqual(r['result']['protocolVersion'],'2025-06-18')
    def test_list_tools(self):
        data=self.call('tools/list')['result']['tools']
        self.assertEqual({x['name'] for x in data}, {'jrh_doctor','jrh_audit','jrh_route','jrh_plan','jrh_status'})
    def test_route_and_plan(self):
        for name in ['jrh_route','jrh_plan']:
            r=self.call('tools/call',{'name':name,'arguments':{'task':'buat diagram'}})['result']
            self.assertFalse(r['isError'])
            self.assertIn('intent',r['content'][0]['text'])
        self.assertFalse((self.root/'.jrhagents').exists())
    def test_readonly(self):
        self.call('tools/call',{'name':'jrh_audit','arguments':{}})
        self.call('tools/call',{'name':'jrh_status','arguments':{}})
        self.assertEqual(list(self.root.iterdir()),[])
    def test_unknown_tool(self):
        r=self.call('tools/call',{'name':'run_shell','arguments':{'cmd':'echo hi'}})
        self.assertEqual(r['error']['code'],-32602)
    def test_extra_arg_rejected(self):
        r=self.call('tools/call',{'name':'jrh_doctor','arguments':{'project':'/etc'}})
        self.assertEqual(r['error']['code'],-32602)
    def test_oversize_rejected(self):
        r=self.call('tools/call',{'name':'jrh_route','arguments':{'task':'a'*5000}})
        self.assertEqual(r['error']['code'],-32602)
    def test_no_response_for_notification(self):
        self.assertIsNone(respond({'jsonrpc':'2.0','method':'notifications/initialized'},self.root))
    def test_jsonrpc_stdio_handshake(self):
        messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-06-18'}},
                  {'jsonrpc':'2.0','method':'notifications/initialized'},
                  {'jsonrpc':'2.0','id':2,'method':'tools/list'},
                  {'jsonrpc':'2.0','id':3,'method':'tools/call','params':{'name':'jrh_doctor','arguments':{}}}]
        run=subprocess.run([sys.executable,'-m','jrhagents.mcp','--project',str(self.root)],input='\n'.join(map(json.dumps,messages))+'\n',text=True,capture_output=True,timeout=15)
        self.assertEqual(run.returncode,0,run.stderr)
        lines=run.stdout.strip().splitlines()
        self.assertEqual(len(lines),3)
        self.assertEqual([json.loads(x)['id'] for x in lines],[1,2,3])
        self.assertFalse(json.loads(lines[2])['result']['isError'])
    def test_config_paths(self):
        for client in ['generic','claude','cursor','vscode','copilot']:
            result=generate(client,self.root)
            group=result.get('servers',result.get('mcpServers'))
            self.assertTrue(os.path.samefile(group['jrhagents']['args'][-1], self.root))
            self.assertIn('jrhagents.mcp',group['jrhagents']['args'])
    def test_seven_installer_targets(self):
        self.assertEqual(len(CLIENT_DIRS),7)
        for client in CLIENT_DIRS:
            dest=destination(client,project=self.root)
            self.assertIn('skills',str(dest))
    def test_installer_all_and_upgrade(self):
        preview=install('all',project=self.root,dry_run=True)
        self.assertEqual(len(preview['targets']),7)
        self.assertEqual(list(self.root.iterdir()),[])
        installed=install('all',project=self.root)
        self.assertEqual(len(installed['targets']),7)
        with self.assertRaises(FileExistsError): install('all',project=self.root)
        old=destination('codex',project=self.root)/'SKILL.md'
        old.write_text('local changes',encoding='utf-8')
        change=install('codex',project=self.root,upgrade=True)
        self.assertTrue(Path(change['backup_at']).joinpath('SKILL.md').exists())
        self.assertEqual(Path(change['backup_at']).joinpath('SKILL.md').read_text(),'local changes')
        self.assertNotEqual(old.read_text(),'local changes')
    def test_invalid_scope_all(self):
        with self.assertRaises(ValueError): install('all',scope='user',project=self.root,dry_run=True)
    def test_distributed_skill_sync(self):
        root=Path(__file__).resolve().parents[1]
        originals=[root/'SKILL.md',root/'skills/jrhagents/SKILL.md',root/'jrhagents/skill/SKILL.md']
        self.assertEqual(len({p.read_bytes() for p in originals}),1)
        for name in ['CAPABILITIES.md','PLAYBOOKS.md','SAFETY.md']:
            self.assertEqual((root/'modules'/name).read_bytes(),(root/'jrhagents/skill/references'/name).read_bytes())
    def test_agent_plugin(self):
        root=Path(__file__).resolve().parents[1]
        plugin=json.loads((root/'plugin.json').read_text())
        self.assertEqual(plugin['$schema'],'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
        self.assertEqual(plugin['name'],'jrhagents')
        self.assertTrue((root/'skills/jrhagents/SKILL.md').exists())
        self.assertIn('mcpServers',json.loads((root/'mcp.json').read_text()))

if __name__=='__main__': unittest.main()

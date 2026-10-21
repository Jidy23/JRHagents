#!/usr/bin/env python3
"""Rebuild/verify generated capability catalog from data/capabilities.json. stdlib only."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build():
    data=json.loads((ROOT/'data/capabilities.json').read_text(encoding='utf-8'))
    if len(data)!=66 or [x['id'] for x in data]!=list(range(1,67)):
        raise ValueError('Catalog must have unique sequential ids 1 through 66')
    js='/* GENERATED from data/capabilities.json — run python tools/build_catalog.py */\n(function(root,factory){const value=factory();if(typeof module===\'object\'&&module.exports)module.exports=value;else root.JRHCapabilities=value;})(typeof globalThis!==\'undefined\'?globalThis:this,function(){return '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';});\n'
    md=['# 66 capabilities: real workflows, not installed integrations','','Each entry is a reusable task workflow, not a new API, model, plug-in or medical/financial service. Use only accessible host tools, verify any action, never fabricate sources or results.','','| No. | Capability | Input / aim | Expected deliverable | Reference |','|---:|---|---|---|---|']
    for x in data:
        md.append(f"| {x['id']:02d} | {x['title']} / {x['titleEn']} | {x['description']} | {x['deliverable']} | [{x['reference']}]({x['reference']}) |")
    md.extend(['','## Universal execution for all 66','1. Clarify the user-provided goal, audience, boundary and input. Ask one question only if genuinely blocked.','2. Load the reference named in the catalog. Adapt to CHAT, READ or ACT tools actually present.','3. Produce the deliverable stated in the catalog; do not stop at generic advice if a draft or output is feasible.','4. Verify evidence and label not-run checks. For health/finance/legal or privacy risk, provide information not diagnosis or guaranteed outcomes.','5. Conclude with one useful next action.','','## Tool gates','- No web means no claims of up-to-date research. No filesystem means no claims of editing files.','- No APIs, secrets, premium models, custom plug-ins, or cross-app memory are supplied by this Skill.','- No high-risk actions without appropriate consent and authorization.'])
    return {ROOT/'docs/assets/catalog.js':js,ROOT/'skills/jrhagents/references/CAPABILITIES.md':'\n'.join(md)+'\n'}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    failures=[]
    for path,content in build().items():
        if args.check:
            if not path.is_file() or path.read_text(encoding='utf-8')!=content:failures.append(path.relative_to(ROOT))
        else:path.write_text(content,encoding='utf-8')
    if failures:parser.exit(1,'Generated files out of sync: '+', '.join(map(str,failures))+'\n')
    print('66 capabilities: generated files in sync' if args.check else '66 capabilities generated')
if __name__=='__main__':main()

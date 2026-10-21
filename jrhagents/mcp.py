"""Minimal MCP stdio server (JSON-RPC 2.0, newline-delimited UTF-8).

Read-only and scoped to one specified project root. Uses no external API,
never prints anything except MCP messages on stdout.
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from . import __version__
from .core import doctor, audit, create_plan, status
from .routing import route_request

PROTOCOL = "2025-06-18"
TOOLS = [
    {"name":"jrh_doctor", "description":"Read-only environment and project overview; never reads API key values.", "inputSchema":{"type":"object","properties":{},"additionalProperties":False}},
    {"name":"jrh_audit", "description":"Bounded, heuristic, read-only source audit. Findings are not proof of vulnerability.", "inputSchema":{"type":"object","properties":{},"additionalProperties":False}},
    {"name":"jrh_route", "description":"Classify a natural-language task into a recommended workflow.", "inputSchema":{"type":"object","properties":{"task":{"type":"string","maxLength":4000}},"required":["task"],"additionalProperties":False}},
    {"name":"jrh_plan", "description":"Create an unsaved, read-only step plan for a task.", "inputSchema":{"type":"object","properties":{"task":{"type":"string","maxLength":4000}},"required":["task"],"additionalProperties":False}},
    {"name":"jrh_status", "description":"Read the current project status (no writes).", "inputSchema":{"type":"object","properties":{},"additionalProperties":False}},
]

def error(req_id, code, message):
    return {"jsonrpc":"2.0","id":req_id,"error":{"code":code,"message":message}}

def respond(message, project):
    if not isinstance(message,dict) or message.get("jsonrpc")!="2.0":
        return error(None,-32600,"Invalid JSON-RPC request")
    method=message.get("method")
    req_id=message.get("id")
    if not isinstance(method,str): return error(req_id,-32600,"Missing method")
    # JSON-RPC notifications have no id and must not produce a response.
    if "id" not in message:
        return None
    params=message.get("params",{})
    if not isinstance(params,dict): return error(req_id,-32602,"Params must be object")
    if method == "initialize":
        requested=params.get("protocolVersion",PROTOCOL)
        version=requested if requested in ("2025-06-18","2025-03-26") else PROTOCOL
        return {"jsonrpc":"2.0","id":req_id,"result":{"protocolVersion":version,"capabilities":{"tools":{"listChanged":False}},"serverInfo":{"name":"jrhagents","version":__version__},"instructions":"Local read-only project utilities; no external API or automatic code modifications."}}
    if method == "ping": return {"jsonrpc":"2.0","id":req_id,"result":{}}
    if method == "tools/list": return {"jsonrpc":"2.0","id":req_id,"result":{"tools":TOOLS}}
    if method != "tools/call": return error(req_id,-32601,"Method not found")
    name=params.get("name"); arguments=params.get("arguments",{})
    mapping={tool["name"]:tool for tool in TOOLS}
    if name not in mapping: return error(req_id,-32602,"Unknown tool")
    if not isinstance(arguments,dict): return error(req_id,-32602,"Tool arguments must be object")
    spec=mapping[name]["inputSchema"]
    if any(k not in spec.get("properties",{}) for k in arguments): return error(req_id,-32602,"Unexpected argument")
    if any(k not in arguments for k in spec.get("required",[])): return error(req_id,-32602,"Missing required argument")
    if "task" in arguments and (not isinstance(arguments["task"],str) or len(arguments["task"])>4000):
        return error(req_id,-32602,"Task must be text with at most 4000 characters")
    try:
        if name=="jrh_doctor": result=doctor(project)
        elif name=="jrh_audit": result=audit(project)
        elif name=="jrh_route": result=route_request(arguments["task"])
        elif name=="jrh_plan": result=create_plan(arguments["task"],project,save=False)
        else: result=status(project)
        return {"jsonrpc":"2.0","id":req_id,"result":{"content":[{"type":"text","text":json.dumps(result,ensure_ascii=False)}],"isError":False}}
    except (OSError,ValueError,PermissionError) as exc:
        return {"jsonrpc":"2.0","id":req_id,"result":{"content":[{"type":"text","text":str(exc)}],"isError":True}}

def main(argv=None):
    parser=argparse.ArgumentParser(description="JRHagents read-only MCP stdio server")
    parser.add_argument("--project",default=".",help="The one project directory this server can inspect")
    args=parser.parse_args(argv)
    project=Path(args.project).expanduser().resolve()
    if not project.is_dir():
        print("JRHagents MCP: project folder not found",file=sys.stderr)
        return 2
    for line in sys.stdin:
        if len(line)>1024*1024:
            output=error(None,-32700,"Message too large")
        else:
            try:
                output=respond(json.loads(line),str(project))
            except (ValueError,TypeError):
                output=error(None,-32700,"Parse error")
        if output is not None:
            sys.stdout.write(json.dumps(output,ensure_ascii=False,separators=(",",":"))+"\n")
            sys.stdout.flush()
    return 0

if __name__=="__main__":
    sys.exit(main())

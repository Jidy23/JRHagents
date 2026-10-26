const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const html = fs.readFileSync('adapters/web/index.html', 'utf8');
const js = fs.readFileSync('adapters/web/app.js', 'utf8');
const css = fs.readFileSync('adapters/web/style.css', 'utf8');
const bridge = fs.readFileSync('adapters/web/host-bridge.js', 'utf8');

test('web adapter has the review flow and local-only disclosure', () => {
  assert.match(html, /Workflow JSON/);
  assert.match(html, /Approval gate/);
  assert.match(html, /JRHagents tidak menambahkan API/);
  assert.match(js, /schema_version !== 1/);
  assert.match(js, /host belum terhubung/);
  assert.match(js, /LOCAL_HANDLERS/);
  assert.match(bridge, /createHostAdapter/);
  assert.match(bridge, /requiresApproval/);
  assert.match(css, /prefers-reduced-motion/);
});

test('web adapter does not claim external execution', () => {
  assert.doesNotMatch(js, /fetch\s*\(/);
  assert.doesNotMatch(js, /XMLHttpRequest/);
  assert.doesNotMatch(js, /github\.merge/);
  assert.doesNotMatch(bridge, /fetch\s*\(/);
});

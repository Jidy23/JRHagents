const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const page = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../docs/assets/app.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../docs/assets/style.css'), 'utf8');

test('homepage has understandable first-use workflow', () => {
  for (const id of ['how', 'choose', 'setup', 'examples', 'capabilities', 'faq']) assert.match(page, new RegExp(`id="${id}"`));
  for (const label of ['LANGKAH 1', 'LANGKAH 2', 'LANGKAH 3', 'Unduh JRHagents', 'Periksa']) assert.ok(page.includes(label));
});
test('real commands rather than fictional runtime features', () => {
  assert.match(page, /jrhagents doctor --project/);
  assert.match(page, /jrhagents audit --project/);
  assert.match(page, /jrhagents mcp-config/);
  assert.doesNotMatch(page, /jrh run (web\.search|file\.read|image\.create)/);
  assert.doesNotMatch(page, /pip install jrhagents\b/);
});
test('interface has search, menu, theme and reachable content', () => {
  for (const id of ['searchTrigger','searchDialog','globalSearch','menuToggle','mobileNav','themeToggle','featureGrid','featureSearch','featureFilters','projectPath','installCommand']) assert.ok(page.includes(`id="${id}"`));
  for (const label of ['aria-label=', 'aria-pressed=', 'role="dialog"','role="status"']) assert.ok(page.includes(label));
});
test('functional JavaScript wires mode selector, search and clipboard', () => {
  for (const term of ['setMode(', 'updateInstall(', 'setExamples(', 'renderSearch(', 'copyText(', 'renderFeatures(', 'setTheme(']) assert.ok(script.includes(term));
});
test('responsive breakpoints and reduced-motion support exist', () => {
  assert.ok(styles.includes('@media(max-width:650px)'));
  assert.ok(styles.includes('@media(max-width:365px)'));
  assert.ok(styles.includes('prefers-reduced-motion'));
});
test('external links use safe targets and source of truth', () => {
  assert.ok(page.includes('https://github.com/Jidy23/JRHagents'));
  assert.ok(page.includes('rel="noopener noreferrer"'));
  assert.ok(page.includes('Fungsi lokal') === false); // statuses are derived dynamically, not fabricated in HTML.
});

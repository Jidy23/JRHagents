"""Optional real Chromium smoke check, no network calls or external services."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]/'docs'
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'assets/style.css').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="assets/style.css">','<style>'+css+'</style>')
scripts=''
for name in ('site-model.js','direct-install.js','browser-audit.js','app.js'):
    html=html.replace(f'<script src="assets/{name}" defer></script>','')
    scripts += '<script>'+(ROOT/'assets'/name).read_text(encoding='utf-8').replace('</script>','<\\/script>')+'</script>'
html=html.replace('</body>',scripts+'</body>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('JRH_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    for name,width,height in [('desktop',1440,900),('tablet',768,1000),('mobile',390,844),('small',320,690)]:
        page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(html,wait_until='domcontentloaded')
        page.locator('#sampleAudit').click()
        page.wait_for_function('document.querySelector("#metricIssues").textContent !== "—"')
        assert int(page.locator('#metricIssues').inner_text())>=2
        assert page.locator('.finding').count()>=2
        with page.expect_download() as dl:
            page.locator('#downloadReport').click()
        assert dl.value.suggested_filename=='jrhagents-audit.json'
        # Skill: direct GitHub, personal scope, no Python path form.
        page.locator('#client').select_option('cursor')
        assert 'npx skills add Jidy23/JRHagents --skill jrhagents -a cursor -g' in page.locator('#installSteps').inner_text()
        assert not page.locator('#osGroup').is_visible()
        page.locator('#installScope').select_option('project')
        assert ' -g' not in page.locator('#installSteps').inner_text()
        # Plugin: only Claude, inside Claude Code.
        page.locator('#client').select_option('claude')
        page.locator('[data-mode="plugin"]').click()
        assert '/plugin marketplace add Jidy23/JRHagents' in page.locator('#installSteps').inner_text()
        page.locator('#client').select_option('windsurf')
        assert 'Belum tersedia' in page.locator('#installSupport').inner_text()
        # MCP is optional and supports an actual local setup.
        page.locator('[data-mode="mcp"]').click()
        page.locator('[data-os="linux"]').click()
        page.locator('#client').select_option('cursor')
        assert 'setup --mode mcp --client cursor' in page.locator('#installSteps').inner_text()
        assert page.locator('#osGroup').is_visible()
        page.locator('#exampleTask').select_option('polish')
        assert 'rapikan UI' in page.locator('#promptText').inner_text()
        page.locator('#featureSearch').fill('kredensial')
        assert page.locator('.feature-card').count()>=1
        page.locator('#themeToggle').click()
        assert page.locator('body').get_attribute('data-theme')=='dark'
        if width<=820:
            page.locator('#menuToggle').click();assert 'open' in page.locator('#mobileNav').get_attribute('class')
            page.locator('#menuToggle').click()
        assert page.evaluate('document.documentElement.scrollWidth-window.innerWidth')<=1
        assert not errors,errors
        page.locator('#themeToggle').click()
        page.locator('#featureSearch').fill('')
        page.screenshot(path=str(ROOT.parent/f'JRHagents_v20_{name}.png'),full_page=True)
        print(name,width,'PASS')
        page.close()
    browser.close()

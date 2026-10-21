"""Optional visual/browser smoke checks.

Requires: pip install playwright, and a local Chromium browser.
Runs static docs in memory to work in environments that block file:// navigation.
No network access or external accounts are required.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1] / 'docs'
html=(ROOT / 'index.html').read_text(encoding='utf-8')
css=(ROOT / 'assets/style.css').read_text(encoding='utf-8')
css=css.replace("@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');",'')
html=html.replace('<link rel="stylesheet" href="assets/style.css">', f'<style>{css}</style>')
scripts=''
for name in ('site-model.js','app.js'):
    html=html.replace(f'<script src="assets/{name}" defer></script>', '')
    scripts += f'<script>{(ROOT / "assets" / name).read_text(encoding="utf-8")}</script>'
html=html.replace('</body>', scripts+'</body>')

with sync_playwright() as playwright:
    executable=os.environ.get('JRH_CHROMIUM_PATH')
    browser=playwright.chromium.launch(headless=True, executable_path=executable or None)
    for name,width,height in [('desktop',1440,900),('tablet',768,1000),('mobile',390,844),('small',320,690)]:
        page=browser.new_page(viewport={'width':width,'height':height})
        page.set_default_timeout(7000)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content(html,wait_until='domcontentloaded',timeout=10000)
        overflow=page.evaluate('document.documentElement.scrollWidth - window.innerWidth')
        assert overflow<=1, f'{name} has {overflow}px horizontal overflow'
        page.locator('[data-os="linux"]').click()
        assert page.locator('#packageCommand').inner_text().startswith('python3')
        page.locator('[data-mode="mcp"]').click()
        assert 'mcp-config' in page.locator('#installCommand').inner_text()
        page.locator('[data-example="mcp"]').click()
        assert page.locator('[data-example-kind="mcp"]').count()==1
        page.locator('#featureSearch').fill('kredensial')
        assert page.locator('.feature-card').count()>=1
        page.locator('#searchTrigger').click()
        page.locator('#globalSearch').fill('panduan')
        assert page.locator('.search-result').count()>=1
        page.keyboard.press('Escape')
        assert page.locator('#searchDialog').is_hidden()
        if width < 920:
            page.locator('#menuToggle').click()
            assert page.locator('#mobileNav').is_visible()
            page.locator('#menuToggle').click()
        page.locator('#themeToggle').click()
        assert page.locator('body').get_attribute('data-theme')=='dark'
        assert not errors, f'Browser errors: {errors}'
        print(f'{name} {width}px: PASS')
        page.close()
    browser.close()

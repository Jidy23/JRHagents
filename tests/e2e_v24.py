"""Optional browser smoke tests (requires Playwright and locally installed Chromium)."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'

def run():
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        for width in (320,360,390,768,1024,1440):
            context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1,accept_downloads=True)
            page=context.new_page()
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.set_content((DOCS/'index.html').read_text(encoding='utf-8'), wait_until='domcontentloaded')
            page.add_style_tag(content=(DOCS/'assets/style.css').read_text(encoding='utf-8'))
            for script in ('prompt-data.js','guide.js','app.js'):
                page.add_script_tag(content=(DOCS/'assets'/script).read_text(encoding='utf-8'))
            page.evaluate("""() => {document.execCommand=(cmd) => {window.__clipboard=document.querySelector('textarea[readonly]')?.value;return cmd==='copy';}}""")
            page.wait_for_selector('#clientChoices .client-choice')
            assert page.locator('#panel-mulai').is_visible(), f'{width}: start panel hidden'
            assert page.locator('#outputText').is_visible(), f'{width}: output hidden'
            assert 'npx skills' not in page.locator('#outputText').inner_text(), f'{width}: chat exposed npx'
            assert page.locator('#outputApp').inner_text()=='ChatGPT'
            info=page.evaluate('({viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
            print('Width',width, 'document metrics',info)
            assert info['scroll']<=width+1,f'{width}: horizontal overflow {info}'
            # Full canonical instructions must be copied, not a short marketing prompt.
            page.locator('#primaryCopy').click()
            text=page.evaluate('window.__clipboard')
            assert len(text)>1000 and 'Never claim' in text, (width,len(text))
            # terminal path is opt-in and points to the actual GitHub installer.
            page.locator('[data-mode="coding"]').click()
            assert 'npx skills add Jidy23/JRHagents' in page.locator('#outputText').inner_text()
            page.locator('[data-mode="chat"]').click()
            assert 'npx skills' not in page.locator('#outputText').inner_text()
            # Desktop top tabs / mobile bottom tabs are real navigation.
            if width <= 600: page.locator('.bottom-nav [data-tab="contoh"]').click()
            else: page.locator('#tab-contoh').click()
            assert page.locator('#panel-contoh').is_visible()
            page.locator('#taskContext').fill('website responsif di Android')
            page.locator('#taskType').select_option('design')
            page.locator('#generatePrompt').click()
            assert 'website responsif di Android' in page.locator('#generatedText').inner_text()
            with page.expect_download() as dl:
                page.locator('#downloadGenerated').click()
            download=dl.value
            assert download.suggested_filename.endswith('.md')
            # navigation / filtering / FAQ
            if width<=600: page.locator('.bottom-nav [data-tab="kemampuan"]').click()
            else: page.locator('#tab-kemampuan').click()
            page.locator('#featureFilters button',has_text='Desain').click()
            assert page.locator('#capabilityList .capability-card').count()>=2
            if width<=600: page.locator('.bottom-nav [data-tab="bantuan"]').click()
            else: page.locator('#tab-bantuan').click()
            assert page.locator('#panel-bantuan').is_visible()
            page.locator('#helpUseChat').click()
            assert page.locator('#panel-mulai').is_visible()
            # theme should be stored but not block any control
            page.locator('#themeToggle').click()
            assert page.locator('body').get_attribute('data-theme')=='dark'
            page.locator('#themeToggle').click()
            if width<=600:
                assert page.locator('#setupSteps').is_hidden(), 'Mobile setup should be compact by default'
                page.locator('#toggleSteps').click()
                assert page.locator('#setupSteps').is_visible()
                page.locator('#toggleSteps').click()
            if width in (320,390,1440):
                page.locator('#toast').evaluate('(el)=>el.hidden=true')
                page.screenshot(path=f'/mnt/data/JRHagents_V24_preview_{width}.png',full_page=True,animations='disabled')
            context.close()
        print('JavaScript errors:',errors)
        assert not errors, errors
        browser.close()
        print('Browser end-to-end: PASS (six viewports, copy, download, tabs, filters, theme).')
if __name__=='__main__':run()

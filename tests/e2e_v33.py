"""Offline browser smoke across desktop, tablet and mobile viewports."""
import sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'tests/_screenshots';out.mkdir(exist_ok=True)
html=(ROOT/'docs/index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script defer[^>]*></script>','',html)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in (320,360,390,768,1024,1440):
   context=browser.new_context(viewport={'width':width,'height':820 if width>600 else 760},device_scale_factor=1,permissions=['clipboard-read','clipboard-write'])
   page=context.new_page()
   page.set_default_timeout(3500)
   print('CHECK',width,flush=True)
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.set_content(html,wait_until='load')
   page.add_style_tag(content=(ROOT/'docs/assets/style.css').read_text(encoding='utf-8'))
   page.add_style_tag(content=(ROOT/'docs/assets/support.css').read_text(encoding='utf-8'))
   page.evaluate('''() => {window.__copied = null; Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(s)=>{window.__copied=s},readText:async()=>window.__copied}});try{Object.defineProperty(window,'isSecureContext',{configurable:true,value:true});}catch(e){} }''')
   for name in ('catalog.js','universal.js','app.js','support.js'):page.add_script_tag(content=(ROOT/'docs/assets'/name).read_text(encoding='utf-8'))
   assert page.locator('#screen-mulai').is_visible()
   assert not page.locator('#taskOptions').evaluate('(el)=>el.open'),width
   if width in (390,1440):page.screenshot(path=str(out/f'initial-{width}.png'),full_page=True,animations='disabled',timeout=7000)
   assert page.locator('#typeChat').get_attribute('aria-pressed')=='true'
   assert page.locator('#previewContent').inner_text().startswith('You are JRHagents'),width
   assert 'npx skills add' not in page.locator('#previewContent').inner_text(),width
   assert page.locator('#choicePanel #taskGoal').count()==1,width
   if width<=720:
    assert page.locator('#choicePanel').evaluate('(el)=>el.getBoundingClientRect().width') >= width-80,('choice width',width)
    assert page.locator('#appsGrid').evaluate('(el)=>el.getBoundingClientRect().width') >= width-110,('apps width',width)
   page.locator('#taskOptions summary').click()
   page.locator('#taskTemplates button').first.click()
   assert 'ringkasan riset' in page.locator('#taskGoal').input_value(),width
   page.locator('#taskConstraints').fill('Gunakan sumber primer')
   if width<=720:page.locator('#nextSetup').click()
   masked=page.locator('#previewContent').evaluate('(el)=>getComputedStyle(el).filter')
   assert masked.startswith('blur('),masked
   page.locator('#showPrompt').click()
   assert page.locator('#previewContent').evaluate('(el)=>getComputedStyle(el).filter')=='none'
   page.locator('#showPrompt').click()
   assert page.locator('#previewContent').evaluate('(el)=>getComputedStyle(el).filter').startswith('blur(')
   page.locator('#copyMain').click()
   page.wait_for_timeout(70)
   clip=page.evaluate('window.__copied ?? document.querySelector("#fallbackText").value')
   assert 'You are JRHagents' in clip and len(clip)>1500,width
   assert 'ringkasan riset' in clip and 'Gunakan sumber primer' in clip,width
   page.locator('[data-tab="kemampuan"]:visible').first.click()
   assert page.locator('#catalogCount').inner_text()=='66 / 66',width
   assert page.locator('.cap-card').count()==12,width
   page.locator('#capSearch').fill('CV')
   assert page.locator('#catalogCount').inner_text().split(' / ')[0]=='1',width
   page.locator('.cap-card').first.click()
   assert 'CV' in page.locator('#detailTitle').inner_text(),width
   page.locator('#capSearch').fill('skripsi')
   assert page.locator('#catalogCount').inner_text()=='3 / 66',width
   page.locator('#capSearch').fill('CV')
   page.locator('#useCapability').click()
   assert page.locator('#screen-mulai').is_visible(),width
   page.locator('#copyMain').click()
   clip=page.evaluate('window.__copied ?? document.querySelector("#fallbackText").value')
   assert 'Perbaiki CV' in clip,width
   if width<=720:page.locator('#backToChoice').click()
   page.locator('#typeCoding').click()
   if width<=720:page.locator('#nextSetup').click()
   assert page.locator('#copyMain').inner_text().startswith('Salin perintah'),width
   page.locator('#copyMain').click()
   assert page.evaluate('window.__copied ?? document.querySelector("#fallbackText").value')=='npx skills add Jidy23/JRHagents --skill jrhagents',width
   page.locator('#copyTask').click()
   assert 'CV' in page.evaluate('window.__copied ?? document.querySelector("#fallbackText").value'),width
   if width<=720:page.locator('#backToChoice').click()
   page.locator('#typeChat').click()
   if width<=720:page.locator('#nextSetup').click()
   page.locator('#langToggle').click()
   assert page.locator('#catalogTitle').inner_text()=='Find what you need.',width
   page.locator('[data-tab="panduan"]:visible').first.click()
   assert page.locator('.guide-card').count()==4,width
   page.locator('[data-tab="bantuan"]:visible').first.click()
   assert page.locator('details').count()==7,width
   page.locator('#themeToggle').click()
   assert page.locator('body').get_attribute('data-theme')=='dark',width
   assert page.locator('#taskGoal').evaluate('(el)=>getComputedStyle(el,"::placeholder").color')=='rgb(179, 194, 213)',width
   page.locator('#langToggle').click()
   page.locator('#themeToggle').click()
   page.locator('[data-tab="mulai"]:visible').first.click()
   if width<=720:page.locator('#backToChoice').click()
   page.locator('#toast').evaluate('(el)=>el.hidden=true')
   page.evaluate('window.scrollTo(0,0)')
   if width in (390,1440):page.screenshot(path=str(out/f'{width}.png'),full_page=True,animations='disabled',timeout=7000)
   overflow=page.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
   if overflow>1:
    print('OVERFLOW DETAILS',page.evaluate('''() => ({root:[document.documentElement.clientWidth,document.documentElement.scrollWidth],body:[document.body.clientWidth,document.body.scrollWidth],items:[...document.querySelectorAll('body *')].filter(el => el.scrollWidth>el.clientWidth+4 || el.getBoundingClientRect().right>innerWidth+1).slice(0,30).map(el=>({tag:el.tagName,id:el.id,cls:String(el.className).slice(0,70),dims:[el.clientWidth,el.scrollWidth],rect:[Math.round(el.getBoundingClientRect().left),Math.round(el.getBoundingClientRect().right)]}))})'''),flush=True)
   assert overflow<=1,(width,overflow)
   assert not errors,(width,errors)
   print('PASS viewport',width,'px, interactions, copy, grid, FAQ, language, theme, no overflow')
   context.close()
  browser.close()
finally:
 pass

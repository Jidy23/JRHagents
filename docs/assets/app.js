/* JRHagents V24 — real local UI interactions; never simulates AI execution. */
(function(){'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const guide=globalThis.JRHGuide,fullPrompt=globalThis.JRH_FULL_PROMPT;
if(!guide||!fullPrompt){const target=$('#workspaceTitle');if(target)target.textContent='Panduan tidak dapat dimuat. Muat ulang halaman.';return;}
const app={tab:'mulai',mode:'chat',client:'chatgpt',install:null,task:'audit',generated:'',category:'Semua',query:'',expanded:false,outputExpanded:false,stepsExpanded:window.innerWidth>600};
const toast=$('#toast');let toastTimeout;
function notify(message){toast.textContent=message;toast.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.hidden=true,3200);}
async function copyText(content,source){try{
 if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(content);notify('Sudah disalin. Tempel di aplikasi AI-mu.');return true;}
 const node=document.createElement('textarea');node.value=content;node.setAttribute('readonly','');node.style.cssText='position:fixed;left:-10000px;top:0;';document.body.append(node);node.select();const success=document.execCommand&&document.execCommand('copy');node.remove();if(!success)throw Error('Clipboard not permitted');notify('Berhasil disalin.');return true;
}catch(e){notify('Salin otomatis diblokir. Pilih teks secara manual.');if(source){source.textContent=content;source.classList.add('is-expanded');source.focus();const selection=window.getSelection();if(selection){const range=document.createRange();range.selectNodeContents(source);selection.removeAllRanges();selection.addRange(range);}}return false;}}
function downloadMarkdown(filename,content){const blob=new Blob([content],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('Berkas disiapkan untuk diunduh.');}
// Tabs keep one content pane visible; mobile tabs stay at the bottom.
const tabIds=['mulai','contoh','kemampuan','bantuan'];
function activate(tab,{scroll=true,updateHistory=true}={}){
 if(!tabIds.includes(tab))tab='mulai';app.tab=tab;
 for(const id of tabIds){$('#panel-'+id).hidden=id!==tab;const button=$('#tab-'+id);button.setAttribute('aria-selected',String(id===tab));button.tabIndex=id===tab?0:-1;}
 $$('[data-tab]').forEach(b=>{if(b.closest('.bottom-nav')){if(b.dataset.tab===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}});
 $$('[data-nav-tab]').forEach(a=>a.classList.toggle('is-current',a.dataset.navTab===tab));
 if(updateHistory&&history.replaceState)history.replaceState(null,'','#'+tab);
 if(scroll)$('#workspace').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 closeMenu();
}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>activate(b.dataset.tab)));
$$('[data-nav-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();activate(a.dataset.navTab)}));
$('.workspace-tabs').addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(event.key))return;event.preventDefault();let n=tabIds.indexOf(app.tab);if(event.key==='ArrowRight')n=(n+1)%tabIds.length;else if(event.key==='ArrowLeft')n=(n-1+tabIds.length)%tabIds.length;else if(event.key==='Home')n=0;else n=tabIds.length-1;activate(tabIds[n],{scroll:false});$('#tab-'+tabIds[n]).focus();});
$('#heroStart').addEventListener('click',()=>activate('mulai'));$('#heroExample').addEventListener('click',()=>activate('contoh'));
const drawer=$('#menuDrawer'),menu=$('#mobileMenu');function closeMenu(){drawer.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Buka menu');}
menu.addEventListener('click',()=>{const open=drawer.hidden;drawer.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Tutup menu':'Buka menu');});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();}});window.addEventListener('resize',()=>{if(window.innerWidth>800)closeMenu();},{passive:true});
// Color palette preference; offline and optional.
const themeButton=$('#themeToggle');function setTheme(theme){document.body.dataset.theme=theme;themeButton.setAttribute('aria-label',theme==='dark'?'Pakai tema terang':'Pakai tema gelap');try{localStorage.setItem('jrh-theme',theme);}catch(_){}}
let saved='light';try{const value=localStorage.getItem('jrh-theme');if(value==='dark'||value==='light')saved=value;}catch(_){}setTheme(saved);
themeButton.addEventListener('click',()=>setTheme(document.body.dataset.theme==='dark'?'light':'dark'));
// Platforms and actual install instructions: no npx appears in chatbot mode.
function renderClients(){const choices=$('#clientChoices');choices.replaceChildren();for(const item of guide.getApps(app.mode)){
 const button=document.createElement('button');button.type='button';button.className='client-choice';button.textContent=item.name;button.dataset.client=item.id;button.setAttribute('aria-pressed',String(app.client===item.id));button.addEventListener('click',()=>{app.client=item.id;renderClients();renderSetup();});choices.append(button);
}}
function setMode(mode){if(!['chat','coding'].includes(mode))return;app.mode=mode;app.client=mode==='chat'?'chatgpt':'codex';app.outputExpanded=false;$$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));renderClients();renderSetup();}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
function renderSetup(){const data=guide.getInstall(app.mode,app.client,fullPrompt);app.install=data;
 $('#setupKicker').textContent=data.kicker;$('#setupTitle').textContent=data.title;$('#setupDescription').textContent=data.description;
 $('#outputType').textContent=data.type;$('#outputApp').textContent=data.app;$('#outputTitle').textContent=app.mode==='chat'?'Instruksi JRHagents lengkap':'Perintah instalasi Skill';$('#outputSubtitle').textContent=data.subtitle;
 const steps=$('#setupSteps');steps.replaceChildren();data.steps.forEach(([title,description],i)=>{const row=document.createElement('div');row.className='mini-step';const n=document.createElement('span');n.textContent=String(i+1);const detail=document.createElement('div');const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=description;detail.append(strong,small);row.append(n,detail);steps.append(row);});
 $('#setupNotice').textContent=data.notice;
 updateStepVisibility();
 const pre=$('#outputText');pre.classList.toggle('is-expanded',app.outputExpanded);pre.textContent=app.outputExpanded||data.text.length<260?data.text:data.text.slice(0,255).trim()+'…';
 $('#primaryCopyLabel').textContent=app.mode==='chat'?'Salin instruksi lengkap':'Salin perintah Terminal';$('#secondaryLabel').textContent=app.mode==='chat'?'Unduh .md':'Panduan';
 $('#expandOutput').textContent=app.outputExpanded?'Ringkas instruksi ↑':'Lihat instruksi penuh ↓';$('#expandOutput').setAttribute('aria-expanded',String(app.outputExpanded));
}
function updateStepVisibility(){const steps=$('#setupSteps'),toggle=$('#toggleSteps');steps.hidden=!app.stepsExpanded;toggle.setAttribute('aria-expanded',String(app.stepsExpanded));toggle.textContent=app.stepsExpanded?'Tutup panduan 3 langkah ↑':'Lihat panduan 3 langkah ↓';}
$('#toggleSteps').addEventListener('click',()=>{app.stepsExpanded=!app.stepsExpanded;updateStepVisibility();});
$('#primaryCopy').addEventListener('click',()=>copyText(app.install.text,$('#outputText')));
$('#secondaryAction').addEventListener('click',()=>{if(app.mode==='chat')downloadMarkdown('JRHagents-Instruksi-Universal.md',app.install.text+'\n');else window.open(guide.repo+'/blob/main/docs/INSTALL.md','_blank','noopener,noreferrer');});
$('#expandOutput').addEventListener('click',()=>{app.outputExpanded=!app.outputExpanded;renderSetup();});
$('#helpUseChat').addEventListener('click',()=>{setMode('chat');activate('mulai');});
setMode('chat');
// Example instruction generation is a real local transformation, never a fake AI run.
function renderTask(){app.task=$('#taskType').value;app.generated=guide.makeTask(app.task,$('#taskContext').value);$('#taskTitle').textContent=guide.tasks[app.task].label;$('#generatedText').textContent=app.generated;}
$('#taskType').addEventListener('change',renderTask);$('#generatePrompt').addEventListener('click',()=>{renderTask();notify('Instruksi sudah disusun. Salin untuk memakai di AI.');});
$('#copyGenerated').addEventListener('click',()=>copyText(app.generated,$('#generatedText')));
$('#downloadGenerated').addEventListener('click',()=>downloadMarkdown('JRHagents-'+app.task+'.md','# '+guide.tasks[app.task].label+'\n\n'+app.generated+'\n'));
renderTask();
// Searchable 26 practices, not advertised as connected third-party tools.
function renderFilters(){const target=$('#featureFilters');target.replaceChildren();for(const value of ['Semua','Kode','Desain','Riset','Kualitas','Bisnis','Tulisan','Data','Belajar','Otomasi','Dasar']){
 const b=document.createElement('button');b.type='button';b.className='feature-filter';b.textContent=value;b.setAttribute('aria-pressed',String(value===app.category));b.addEventListener('click',()=>{app.category=value;app.expanded=false;renderFilters();renderFeatures();});target.append(b);
}}
function renderFeatures(){const all=guide.filterCapabilities(app.query,app.category);const shown=app.expanded||app.query||app.category!=='Semua'?all:all.slice(0,6);const target=$('#capabilityList');target.replaceChildren();
 for(const entry of shown){const card=document.createElement('article');card.className='capability-card';const top=document.createElement('div');top.className='capability-card-head';const id=document.createElement('span');id.className='capability-id';id.textContent=String(entry.id).padStart(2,'0');const name=document.createElement('h4');name.textContent=entry.name;top.append(id,name);const detail=document.createElement('p');detail.textContent=entry.description;const kind=document.createElement('span');kind.className='capability-kind';kind.textContent=entry.category+' · Panduan';card.append(top,detail,kind);target.append(card);}
 if(!all.length){const p=document.createElement('p');p.className='no-result';p.textContent='Tidak ditemukan. Coba kata lain atau pilih Semua.';target.append(p);}
 $('#featureCount').textContent='Menampilkan '+shown.length+' dari '+all.length+' kemampuan';$('#showFeatures').hidden=Boolean(app.query||app.category!=='Semua'||all.length<=6);$('#showFeatures').textContent=app.expanded?'Tampilkan ringkas ↑':'Lihat semua 26 →';
}
$('#featureSearch').addEventListener('input',e=>{app.query=e.target.value.trim();renderFeatures();});$('#showFeatures').addEventListener('click',()=>{app.expanded=!app.expanded;renderFeatures();});renderFilters();renderFeatures();
// Accessible lightweight 3D enhancement: only fine-pointer devices and without reduced motion.
const scene=$('#visualScene');if(window.matchMedia('(hover: hover) and (pointer: fine)').matches&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const visual=$('.visual-wrap');visual.addEventListener('pointermove',event=>{const rect=visual.getBoundingClientRect();const x=(event.clientX-rect.left)/rect.width-.5;const y=(event.clientY-rect.top)/rect.height-.5;scene.style.setProperty('--ry',(-7+x*10).toFixed(1)+'deg');scene.style.setProperty('--rx',(5-y*8).toFixed(1)+'deg');},{passive:true});visual.addEventListener('pointerleave',()=>{scene.style.setProperty('--ry','-7deg');scene.style.setProperty('--rx','5deg');});}
const aliases={install:'mulai',instalasi:'mulai',cara:'mulai',coba:'contoh',fitur:'kemampuan',faq:'bantuan'};
const initial=location.hash.replace('#','');activate(tabIds.includes(initial)?initial:(aliases[initial]||'mulai'),{scroll:false,updateHistory:false});
window.addEventListener('hashchange',()=>{const raw=location.hash.slice(1),value=aliases[raw]||raw;if(tabIds.includes(value)&&value!==app.tab)activate(value,{scroll:false,updateHistory:false});});
})();

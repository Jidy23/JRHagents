/* JRHagents static app: no network, no mocked API, real on-device audit. */
(function(){'use strict';
const $=(q,parent=document)=>parent.querySelector(q);const $$=(q,parent=document)=>Array.from(parent.querySelectorAll(q));
const model=globalThis.JRHModel, installs=globalThis.JRHDirectInstall, auditor=globalThis.JRHBrowserAudit;
if(!model||!installs||!auditor)return;
const state={os:'windows',mode:'skill',category:'All',expanded:false,result:null};
const toast=$('#toast');let toastTimer;
function notify(text){toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},3000);}
async function copyText(value){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(value);else{const node=document.createElement('textarea');node.value=value;node.style.position='fixed';node.style.opacity='0';document.body.appendChild(node);node.select();if(!document.execCommand('copy'))throw Error('copy');node.remove();}notify('Berhasil disalin.');return true;}catch(_){notify('Gagal menyalin otomatis. Pilih teks perintah lalu salin manual.');return false;}}
$$('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>copyText(btn.dataset.copy)));
$('#copyPrompt').addEventListener('click',()=>copyText($('#promptText').textContent));
$('#exampleTask').addEventListener('change',()=>{$('#promptText').textContent=model.tasks[$('#exampleTask').value]?.prompt||model.tasks.audit.prompt;});
const nav=$('#mobileNav'),menu=$('#menuToggle');menu.addEventListener('click',()=>{const active=!nav.classList.contains('open');nav.classList.toggle('open',active);menu.setAttribute('aria-expanded',String(active));});$$('a',nav).forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));
const themeKey='jrhagents-theme';let theme='light';try{theme=localStorage.getItem(themeKey)||'light';}catch(_){}document.body.dataset.theme=theme==='dark'?'dark':'light';
$('#themeToggle').addEventListener('click',()=>{const next=document.body.dataset.theme==='dark'?'light':'dark';document.body.dataset.theme=next;try{localStorage.setItem(themeKey,next);}catch(_){}});
function setMode(mode){if(!['skill','mcp','plugin'].includes(mode))return;state.mode=mode;$$('[data-mode]').forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});$$('[data-choose]').forEach(b=>b.classList.toggle('active',b.dataset.choose===mode));renderInstall();}
function setOS(os){if(!['windows','mac','linux'].includes(os))return;state.os=os;$$('[data-os]').forEach(b=>{const on=b.dataset.os===os;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});renderInstall();}
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));$$('[data-os]').forEach(b=>b.addEventListener('click',()=>setOS(b.dataset.os)));
$$('[data-choose]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.choose);$('#install').scrollIntoView({behavior:'smooth',block:'start'});}));
$('#client').addEventListener('change',renderInstall);$('#projectPath').addEventListener('input',renderInstall);$('#installScope').addEventListener('change',renderInstall);
function renderInstall(){
const steps=$('#installSteps'),note=$('#installSupport'),client=$('#client').value;
const advanced=state.mode==='mcp';
$('#osGroup').hidden=!advanced;$('#projectGroup').hidden=!advanced;$('#scopeGroup').hidden=state.mode!=='skill';
steps.replaceChildren();let data;
try{data=installs.get(state.os,client,state.mode,$('#projectPath').value,$('#installScope').value);}catch(err){note.textContent=err.message;note.className='support-note error';$('#wizardTitle').textContent='Periksa pilihanmu';return;}
const label=installs.clientInfo?.[client]?.name||client;
const kind={skill:'Skill',mcp:'MCP',plugin:'Plugin'}[state.mode];
note.textContent=data.supported?'Cocok untuk '+label+': '+data.help:'Belum tersedia untuk '+label+': '+data.help;
note.className='support-note '+(data.supported?'good':'caution');
$('#wizardTitle').textContent=data.supported?kind+' · '+data.steps.length+' langkah':'Belum didukung: '+kind+' di '+label;
$('#wizardSubtitle').textContent=data.supported?'Salin perintah, jalankan sesuai tempat yang disebutkan.':'Jangan menggunakan instruksi dari aplikasi lain.';
const prereq={skill:'Skill membutuhkan Node.js agar perintah npx berfungsi.',mcp:'MCP lokal membutuhkan Python 3.9+.',plugin:'Plugin Claude Code membutuhkan versi aplikasi yang mendukung marketplace.'};
$('#installPrereq').textContent=prereq[state.mode];
const link=$('#installHelpLink');link.href=state.mode==='skill'?'https://nodejs.org/en/download':state.mode==='mcp'?'https://www.python.org/downloads/':'https://code.claude.com/docs/en/plugins';
if(!data.supported){const p=document.createElement('p');p.className='not-supported';p.textContent=data.help;const a=document.createElement('a');a.href=data.link;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Lihat cara yang didukung ↗';steps.append(p,a);return;}
data.steps.forEach((item,i)=>{
const block=document.createElement('section');block.className='step-item';
const info=document.createElement('div');info.className='step-label';
const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');
const desc=document.createElement('div');const strong=document.createElement('strong');strong.textContent=item.title;
const small=document.createElement('p');small.textContent=item.description;desc.append(strong,small);info.append(n,desc);
const where=document.createElement('span');where.className='run-location';where.textContent='Ketik di: '+(item.where||'Terminal');
const code=document.createElement('div');code.className='code';const txt=document.createElement('code');txt.textContent=item.command;
const copy=document.createElement('button');copy.type='button';copy.className='copy';copy.textContent='Salin';copy.setAttribute('aria-label','Salin langkah '+(i+1));copy.addEventListener('click',()=>copyText(item.command));
code.append(txt,copy);block.append(info,where,code);steps.appendChild(block);
});
}
renderInstall();
const drop=$('#dropzone'),file=$('#fileInput'),folder=$('#folderInput');$('#chooseFiles').addEventListener('click',()=>file.click());$('#chooseFolder').addEventListener('click',()=>folder.click());
file.addEventListener('change',()=>runAudit(file.files));folder.addEventListener('change',()=>runAudit(folder.files));
drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover');});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));
drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');if(e.dataTransfer?.files?.length)runAudit(e.dataTransfer.files);});
$('#sampleAudit').addEventListener('click',()=>runAudit(auditor.exampleFiles));
let auditToken=0;
async function runAudit(files){const token=++auditToken;$('#resultIntro').textContent='Sedang membaca berkas di perangkatmu...';$('#auditResults').replaceChildren();$('#downloadReport').disabled=true;try{const data=await auditor.auditFiles(files);if(token!==auditToken)return;state.result=data;renderAudit(data);}catch(err){if(token!==auditToken)return;$('#resultIntro').textContent='Berkas belum bisa dibaca: '+err.message;notify('Pemeriksaan gagal. Coba pilih berkas yang lain.');}}
const severityName={high:'Penting',medium:'Perlu dicek',info:'Catatan'};
function renderAudit(data){$('#resultIntro').textContent=data.filesSelected+' berkas dipilih · '+data.filesSkipped+' dilewati karena format, ukuran, atau keamanan.';$('#metricFiles').textContent=data.filesScanned;$('#metricIssues').textContent=data.findings.length;$('#metricStack').textContent=data.stack.length;
const target=$('#auditResults');target.replaceChildren();if(!data.findings.length){const box=document.createElement('div');box.className='result-empty';const h=document.createElement('strong');h.textContent='Tidak ditemukan pola yang dicari.';const p=document.createElement('p');p.textContent='Bukan jaminan proyek bebas error. Coba pemeriksaan lebih lengkap dengan CLI dan tes proyek.';box.append(h,p);target.append(box);}else{
const sorted=[...data.findings].sort((a,b)=>({high:0,medium:1,info:2}[a.severity]-{high:0,medium:1,info:2}[b.severity]));sorted.slice(0,16).forEach(item=>{const row=document.createElement('article');row.className='finding';const status=document.createElement('span');status.className='finding-severity '+item.severity;status.textContent=severityName[item.severity];const head=document.createElement('div');const h=document.createElement('strong');h.textContent=item.name;const p=document.createElement('small');p.textContent=item.file+(item.line?':'+item.line:'')+' · '+item.advice;head.append(h,p);row.append(status,head);target.appendChild(row);});if(sorted.length>16){const rest=document.createElement('p');rest.className='remaining';rest.textContent='Masih ada '+(sorted.length-16)+' temuan lain dalam laporan JSON.';target.appendChild(rest);}}
const limits=$('#auditLimits');limits.hidden=!data.limits.length;limits.textContent=data.limits.join(' ');$('#downloadReport').disabled=false;$('#clearAudit').disabled=false;}
$('#downloadReport').addEventListener('click',()=>{if(!state.result)return;const blob=new Blob([JSON.stringify({...state.result,generatedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='jrhagents-audit.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Laporan JSON disiapkan untuk diunduh.');});
$('#clearAudit').addEventListener('click',()=>{auditToken++;state.result=null;file.value='';folder.value='';$('#metricFiles').textContent='—';$('#metricIssues').textContent='—';$('#metricStack').textContent='—';$('#auditResults').replaceChildren();$('#resultIntro').textContent='Hasil dihapus dari halaman ini.';$('#downloadReport').disabled=true;$('#clearAudit').disabled=true;$('#auditLimits').hidden=true;});
const statusFor=feature=>{const s=feature.status;if(/Native CLI|Native reports|Native project context|Opt-in CLI|Native CLI heuristic/.test(s))return ['Lokal','native'];if(/Inspired/.test(s))return ['Inspirasi','reference'];return ['Panduan','guidance'];};
const categories={All:'Semua',Core:'Dasar',Engineering:'Kode',Design:'Desain',Research:'Riset',Quality:'Kualitas'};model.categories.forEach(cat=>{const b=document.createElement('button');b.type='button';b.className='filter';b.textContent=categories[cat]||cat;b.dataset.category=cat;b.addEventListener('click',()=>{state.category=cat;state.expanded=false;renderFeatures();});$('#featureFilters').appendChild(b);});
function renderFeatures(){const term=$('#featureSearch').value;const all=model.filterFeatures(term,state.category);const shown=state.expanded||term.trim()||state.category!=='All'?all:all.slice(0,8);const grid=$('#featureGrid');grid.replaceChildren();shown.forEach(f=>{const c=document.createElement('article');c.className='feature-card';const id=document.createElement('span');id.className='feature-id';id.textContent=String(f.id).padStart(2,'0');const h=document.createElement('h3');h.textContent=f.name;const p=document.createElement('p');p.textContent=f.description;const status=document.createElement('span');const [s,k]=statusFor(f);status.className='feature-state '+k;status.textContent=s;c.append(id,h,p,status);grid.appendChild(c);});if(!all.length){const p=document.createElement('p');p.className='no-features';p.textContent='Tidak ditemukan. Coba kata kunci lain.';grid.append(p);}
$('#featureCount').textContent=shown.length+' dari '+all.length+' kemampuan';$('#featureMore').hidden=Boolean(term.trim())||state.category!=='All'||all.length<=8;$('#featureMore').textContent=state.expanded?'Lebih sedikit ↑':'Lihat semua 26 kemampuan ↓';$$('.filter').forEach(b=>{const on=b.dataset.category===state.category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
$('#featureSearch').addEventListener('input',renderFeatures);$('#featureMore').addEventListener('click',()=>{state.expanded=!state.expanded;renderFeatures();});renderFeatures();
})();

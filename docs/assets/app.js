/* JRHagents Pages — progressive enhancement; static and offline-readable. */
(function () {
  'use strict';
  const model = globalThis.JRHModel;
  if (!model) return;
  const $ = (selector, parent=document) => parent.querySelector(selector);
  const $$ = (selector, parent=document) => Array.from(parent.querySelectorAll(selector));
  const body=document.body;
  const state={os:'windows',mode:'skill',category:'All',expanded:false,example:'all',previousFocus:null};
  const preview={
    skill:{icon:'✦',title:'Beri instruksi seperti biasa',description:'AI coding membaca panduan JRHagents dan membantu mengerjakan tugas.',sample:'“Tolong cek proyek ini dan jelaskan masalahnya.”'},
    mcp:{icon:'⬡',title:'Gunakan alat pemeriksaan lokal',description:'Klien yang mendukung MCP dapat memanggil lima tool read-only.',sample:'Cek lingkungan, audit, rute tugas, rencana, atau status.'},
    plugin:{icon:'▧',title:'Paket untuk platform kompatibel',description:'Manifest plugin membantu platform yang mendukung format tersebut mengenali paket.',sample:'Impor plugin lewat aplikasi yang menyediakan fitur ini.'}
  };
  const modeDescriptions={
    skill:'AI coding membaca aturan kerja JRHagents untuk membantu kamu mengaudit, merencanakan, atau memperbaiki proyek.',
    mcp:'Klien MCP yang kompatibel bisa mengakses lima tool lokal read-only. Perlu menambahkan konfigurasi JSON ke aplikasi AI.',
    plugin:'Manifest plugin disediakan untuk platform yang mendukung Agent Plugins. Impor dilakukan dari pengaturan platform tersebut.'
  };
  function setPreview(mode){
    if (!preview[mode]) return;
    $$('.preview-tab').forEach(btn=>{const active=btn.dataset.preview===mode;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));});
    $('#previewIcon').textContent=preview[mode].icon;
    $('#previewTitle').textContent=preview[mode].title;
    $('#previewDescription').textContent=preview[mode].description;
    $('#previewSample').textContent=preview[mode].sample;
  }
  $$('.preview-tab').forEach(btn=>btn.addEventListener('click',()=>setPreview(btn.dataset.preview)));
  function setOS(os){
    if(!['windows','mac','linux'].includes(os))return;
    state.os=os;
    $$('[data-os]').forEach(btn=>{const a=btn.dataset.os===os;btn.classList.toggle('active',a);btn.setAttribute('aria-pressed',String(a));});
    updateInstall();
  }
  function setMode(mode){
    if(!modeDescriptions[mode])return;
    state.mode=mode;
    $$('[data-mode]').forEach(btn=>{const a=btn.dataset.mode===mode;btn.classList.toggle('active',a);btn.setAttribute('aria-pressed',String(a));});
    $('#selectedModeDescription').textContent=modeDescriptions[mode];
    updateInstall();
  }
  function updateInstall(){
    const py=state.os==='windows'?'py':'python3';
    $('#packageCommand').textContent=py+' -m pip install .';
    $('#verifyCommand').textContent=py+' -m jrhagents --version';
    const path=$('#projectPath').value;
    const client=$('#client').value;
    const isPlugin=state.mode==='plugin';
    $('#integrationStepTitle').textContent=state.mode==='skill'?'Pasang Skill ke proyekmu':state.mode==='mcp'?'Buat konfigurasi MCP':'Periksa paket Plugin';
    $('#integrationStepDescription').textContent=state.mode==='skill'?'Jalankan dari folder JRHagents, lalu mulai ulang aplikasi AI coding.':state.mode==='mcp'?'Salin hasil JSON ke pengaturan MCP aplikasi dan mulai ulang. Jangan menimpa koneksi lain.':'Buka plugin.json dan ikuti cara impor resmi aplikasi yang kompatibel.';
    $('#integrationTip').textContent=state.mode==='skill'?'Folder proyek harus sudah ada. Tanda titik (.) berarti folder saat ini.':state.mode==='mcp'?'Perintah hanya menampilkan konfigurasi; koneksi MCP belum aktif sampai kamu mengaturnya di aplikasi.':'Tidak semua aplikasi AI menerima Agent Plugins. Jangan menganggap plugin aktif otomatis.';
    $('#installWarning').textContent=state.mode==='skill'?'Skill dapat digunakan oleh AI coding yang mendukung pembacaan SKILL.md. Pemasangan tidak otomatis membuka akses API atau menjalankan AI.':state.mode==='mcp'?'Server MCP JRHagents mempunyai lima tool lokal read-only. Konfigurasi memerlukan versi aplikasi yang mendukung MCP.': 'Manifest plugin adalah paket integrasi, bukan plugin universal yang pasti dapat dipasang di semua aplikasi.';
    const copyButton=$('#installCopy');
    try{
      const cmd=model.installCommand(client,state.os,path,'project',state.mode);
      $('#installCommand').textContent=state.mode==='plugin'?'https://github.com/Jidy23/JRHagents/blob/main/plugin.json':cmd;
      $('#pathError').hidden=true;
      copyButton.disabled=false;
    }catch(err){
      $('#installCommand').textContent='Periksa lokasi folder proyek di atas.';
      $('#pathError').textContent=err.message;
      $('#pathError').hidden=false;
      copyButton.disabled=true;
    }
  }
  $$('[data-os]').forEach(btn=>btn.addEventListener('click',()=>setOS(btn.dataset.os)));
  $$('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
  $$('[data-choose]').forEach(btn=>btn.addEventListener('click',()=>{setMode(btn.dataset.choose);$('#setup').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  $('#projectPath').addEventListener('input',updateInstall);
  $('#client').addEventListener('change',updateInstall);
  updateInstall();
  // Real examples, not a simulated execution environment.
  function setExamples(type){
    state.example=type;
    $$('.example-tab').forEach(btn=>{const on=btn.dataset.example===type;btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});
    $$('[data-example-kind]').forEach(card=>{card.hidden=type!=='all'&&card.dataset.exampleKind!==type;});
  }
  $$('.example-tab').forEach(btn=>btn.addEventListener('click',()=>setExamples(btn.dataset.example)));
  // Capability status intentionally distinguishes installed tools from agent guidance.
  const nativeTerms=['Native CLI','Native reports','Native project context','Opt-in CLI','Native CLI heuristic'];
  function statusFor(feature){
    const name=feature.status;
    if(nativeTerms.includes(name))return {name:'Fungsi lokal',cls:'native'};
    if(name==='Guidance only'||name==='Skill guidance'||name==='Native workflow')return {name:'Panduan kerja',cls:'guidance'};
    if(name.startsWith('Inspired by'))return {name:'Referensi desain',cls:'external'};
    return {name:'Panduan / alur',cls:'guidance'};
  }
  const categoryLabels={All:'Semua',Core:'Dasar',Engineering:'Kode',Design:'Desain',Research:'Riset',Quality:'Kualitas'};
  const iconFor={Core:'✦',Engineering:'⌘',Design:'◈',Research:'⌕',Quality:'✓'};
  const chips=$('#featureFilters');
  model.categories.forEach(cat=>{
    const btn=document.createElement('button');btn.type='button';btn.className='filter-chip';btn.textContent=categoryLabels[cat]||cat;
    btn.dataset.category=cat;
    btn.setAttribute('aria-pressed',String(cat==='All'));
    btn.addEventListener('click',()=>{state.category=cat;state.expanded=false;renderFeatures();});
    chips.appendChild(btn);
  });
  function renderFeatures(){
    const term=$('#featureSearch').value;
    const matches=model.filterFeatures(term,state.category);
    const showAll=state.expanded||Boolean(term.trim())||state.category!=='All';
    const shown=showAll?matches:matches.slice(0,8);
    const grid=$('#featureGrid');grid.replaceChildren();
    shown.forEach(feature=>{
      const status=statusFor(feature);
      const card=document.createElement('article');card.className='feature-card';
      const top=document.createElement('div');top.className='feature-card-top';
      const ico=document.createElement('span');ico.className='feature-icon';ico.textContent=iconFor[feature.category]||'✦';ico.setAttribute('aria-hidden','true');
      const num=document.createElement('span');num.className='feature-id';num.textContent=String(feature.id).padStart(2,'0');
      top.append(ico,num);
      const heading=document.createElement('h3');heading.textContent=feature.name;
      const p=document.createElement('p');p.textContent=feature.description;
      const statusNode=document.createElement('span');statusNode.className='feature-status '+status.cls;statusNode.textContent=status.name;
      card.append(top,heading,p,statusNode);grid.appendChild(card);
    });
    if(matches.length===0){const message=document.createElement('p');message.className='feature-empty';message.textContent='Belum ada kemampuan yang cocok. Coba kata kunci lain.';grid.appendChild(message);}
    const more=$('#featureMore');more.hidden=Boolean(term.trim())||state.category!=='All'||matches.length<=8;
    more.setAttribute('aria-expanded',String(state.expanded));more.textContent=state.expanded?'Tampilkan lebih sedikit ↑':'Lihat semua 26 kemampuan ↓';
    $('#featureCount').textContent=shown.length+' dari '+matches.length+' kemampuan ditampilkan';
    $$('.filter-chip').forEach(btn=>{const active=btn.dataset.category===state.category;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
  }
  $('#featureSearch').addEventListener('input',renderFeatures);
  $('#featureMore').addEventListener('click',()=>{state.expanded=!state.expanded;renderFeatures();});
  renderFeatures();
  // Copy feedback is only shown after a successful copy.
  const toast=$('#copyToast');let toastTimer;
  async function copyText(text){
    try{
      if (navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
      else{
        const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error('Copy failed');
      }
      toast.textContent='Berhasil disalin. Tempel di tempat yang sesuai.';
    }catch(err){toast.textContent='Belum bisa menyalin otomatis. Pilih teks lalu salin secara manual.';}
    toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},3300);
  }
  $$('[data-copy-target]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;const target=document.getElementById(btn.dataset.copyTarget);if(target)void copyText(target.textContent);}));
  // Mobile navigation is a real menu; not just a decorative hamburger.
  const menu=$('#menuToggle'),nav=$('#mobileNav');
  function closeMenu(){nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Buka menu');}
  menu.addEventListener('click',()=>{nav.hidden=!nav.hidden;menu.setAttribute('aria-expanded',String(!nav.hidden));menu.setAttribute('aria-label',nav.hidden?'Buka menu':'Tutup menu');});
  $$('a',nav).forEach(link=>link.addEventListener('click',closeMenu));
  window.addEventListener('resize',()=>{if(window.innerWidth>920)closeMenu();});
  // Keep light as default while allowing an optional dark content mode.
  const theme=$('#themeToggle');
  let initial='light';try{initial=localStorage.getItem('jrhagents-theme')==='dark'?'dark':'light';}catch(_){}
  function setTheme(value){body.dataset.theme=value;theme.setAttribute('aria-pressed',String(value==='dark'));theme.setAttribute('aria-label',value==='dark'?'Gunakan tema terang':'Gunakan tema gelap');}
  setTheme(initial);
  theme.addEventListener('click',()=>{const value=body.dataset.theme==='dark'?'light':'dark';setTheme(value);try{localStorage.setItem('jrhagents-theme',value);}catch(_){}});
  $('#copyrightYear').textContent=new Date().getFullYear();
  // Search palette: anchors into real content; no fake search service.
  const dialog=$('#searchDialog'),searchInput=$('#globalSearch'),results=$('#searchResults');
  const basicLinks=[
    {name:'Cara kerja dalam 3 langkah',description:'Lihat alur dari awal sampai selesai',href:'#how'},
    {name:'Skill, MCP, dan Plugin',description:'Kenali perbedaan sebelum memilih',href:'#choose'},
    {name:'Panduan instalasi',description:'Windows, macOS, dan Linux',href:'#setup'},
    {name:'Contoh perintah',description:'Salin contoh yang benar-benar tersedia',href:'#examples'},
    {name:'26 kemampuan',description:'Lihat daftar dan status fitur',href:'#capabilities'},
    {name:'FAQ',description:'Pertanyaan dan solusi awal',href:'#faq'}
  ];
  function renderSearch(){
    const q=searchInput.value.trim().toLocaleLowerCase('id');
    const links=basicLinks.filter(item=>!q||(item.name+' '+item.description).toLocaleLowerCase('id').includes(q));
    const matchingFeatures=q?model.filterFeatures(q,'All').slice(0,6).map(f=>({name:f.name,description:'Kemampuan #'+f.id+' · '+f.category,href:'#capabilities',focus:f.name})):[];
    const found=[...links,...matchingFeatures].slice(0,11);
    results.replaceChildren();
    if(found.length===0){const p=document.createElement('p');p.className='feature-empty';p.textContent='Tidak ketemu. Coba kata seperti “instalasi”, “audit”, atau “desain”.';results.appendChild(p);return;}
    found.forEach(item=>{
      const a=document.createElement('a');a.href=item.href;a.className='search-result';a.setAttribute('role','option');
      const strong=document.createElement('strong');strong.textContent=item.name;
      const small=document.createElement('span');small.textContent=item.description;a.append(strong,small);
      a.addEventListener('click',()=>{closeSearch();if(item.focus){$('#featureSearch').value=item.focus;state.category='All';renderFeatures();}});
      results.appendChild(a);
    });
  }
  function openSearch(){state.previousFocus=document.activeElement;dialog.hidden=false;searchInput.value='';renderSearch();document.body.style.overflow='hidden';searchInput.focus();}
  function closeSearch(){dialog.hidden=true;document.body.style.overflow='';if(state.previousFocus?.focus)state.previousFocus.focus();}
  $('#searchTrigger').addEventListener('click',openSearch);
  $('#closeSearch').addEventListener('click',closeSearch);
  $('[data-close-search]').addEventListener('click',closeSearch);
  searchInput.addEventListener('input',renderSearch);
  searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=$('.search-result',results);if(first)first.click();}});
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(dialog.hidden)openSearch();else closeSearch();}
    if(e.key==='Escape'){if(!dialog.hidden)closeSearch();else if(!nav.hidden)closeMenu();}
    if(e.key==='Tab'&&!dialog.hidden){const focusable=[searchInput,...$$('a',results),$('#closeSearch')];const index=focusable.indexOf(document.activeElement);if(e.shiftKey&&index===0){e.preventDefault();focusable[focusable.length-1].focus();}else if(!e.shiftKey&&index===focusable.length-1){e.preventDefault();focusable[0].focus();}}
  });
})();

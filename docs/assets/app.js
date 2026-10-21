/* JRHagents Pages V23: all interactions are local. No remote AI, API, tracking or installation. */
(()=>{'use strict';
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>Array.from(root.querySelectorAll(q));
  const repo='https://github.com/Jidy23/JRHagents';
  const command='npx skills add Jidy23/JRHagents --skill jrhagents';
  const universalUrl=repo+'/blob/main/UNIVERSAL_PROMPT.md';
  const universalShort='JRHagents, bantu saya menyelesaikan tugas dengan hasil yang bisa diverifikasi. Pahami tujuan, batasan, dan informasi yang tersedia; pilih pendekatan yang sesuai dengan kemampuan AI ini; kerjakan hanya dengan akses dan izin yang benar-benar ada. Jangan mengarang sumber, hasil tes, integrasi, atau perubahan file. Bedakan yang sudah selesai, belum diuji, dan masih terkendala. Berikan hasil yang jelas dan satu langkah berikutnya. Gunakan bahasa saya.';
  const installUrl=repo+'/blob/main/docs/INSTALL.md';
  const state={path:'coding',client:'codex',filter:'Semua',expanded:false,lastPrompt:''};

  // Accessible, failure-aware clipboard: successful feedback only after verified copy.
  let toastTimer;
  function notice(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true},3200);}
  async function copy(value){
    try {
      if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(value);notice('Berhasil disalin. Tempel di tempat yang sesuai.');return true;}
      const field=document.createElement('textarea');field.value=value;field.setAttribute('readonly','');field.style.position='fixed';field.style.left='-9999px';document.body.append(field);field.focus();field.select();let ok=false;try{ok=document.execCommand('copy');}finally{field.remove();}if(!ok)throw Error('Clipboard unavailable');notice('Berhasil disalin.');return true;
    }catch(_){notice('Salin otomatis gagal. Pilih teks lalu salin secara manual.');return false;}
  }
  function downloadText(filename,body){const blob=new Blob([body],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);}

  // Navigation and color scheme.
  const nav=$('#mobileNav'),menu=$('#menuToggle');
  function closeMenu(){nav.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Buka navigasi');}
  menu.addEventListener('click',()=>{const opening=nav.hidden;nav.hidden=!opening;menu.setAttribute('aria-expanded',String(opening));menu.setAttribute('aria-label',opening?'Tutup navigasi':'Buka navigasi');});
  $$('a',nav).forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!nav.hidden){closeMenu();menu.focus();}});
  window.addEventListener('resize',()=>{if(window.innerWidth>850)closeMenu();},{passive:true});
  const themeBtn=$('#themeToggle');
  try {const saved=localStorage.getItem('jrh-theme');if(saved==='dark'||saved==='light')document.body.dataset.theme=saved;}catch(_){}
  function refreshThemeButton(){const dark=document.body.dataset.theme==='dark';themeBtn.setAttribute('aria-label',dark?'Aktifkan tema terang':'Aktifkan tema gelap');themeBtn.title=dark?'Tema terang':'Tema gelap';}
  refreshThemeButton();
  themeBtn.addEventListener('click',()=>{const next=document.body.dataset.theme==='dark'?'light':'dark';document.body.dataset.theme=next;refreshThemeButton();try{localStorage.setItem('jrh-theme',next);}catch(_){}});

  // Install guidance is honest: web UI never performs an installation.
  const clientNames={codex:'Codex',claude:'Claude Code',cursor:'Cursor',gemini:'Gemini CLI',copilot:'GitHub Copilot',opencode:'OpenCode',windsurf:'Windsurf',other:'AI coding pilihanmu'};
  const codingDetails=[['Siapkan Node.js','Untuk menjalankan installer di Terminal'],['Jalankan perintah','Pilih aplikasi dan beri izin bila diminta'],['Buka AI lalu coba JRHagents','Tulis: “JRHagents, audit proyek ini.”']];
  const chatDetails=[['Buka instruksi universal','Tersedia di repositori GitHub'],['Salin isi instruksinya','Tempel ke percakapan atau pengaturan AI'],['Mulai beri tugas','Tidak menambah akses tool atau model']];
  const pathButtons=$$('[data-path]');
  function makeDetails(items){const parent=$('#installDetail');parent.replaceChildren();for(const [i,[title,desc]] of items.entries()){const row=document.createElement('div');const badge=document.createElement('span');badge.className='detail-index';badge.textContent=String(i+1);const content=document.createElement('span');const bold=document.createElement('strong');bold.textContent=title;const small=document.createElement('small');small.textContent=desc;content.append(bold,small);row.append(badge,content);parent.append(row);}}
  function renderInstall(){
    const isCoding=state.path==='coding';pathButtons.forEach(btn=>{const active=btn.dataset.path===state.path;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));});
    $('#clientArea').hidden=!isCoding;$('#installCodeLine').hidden=!isCoding;$('#manualActions').hidden=isCoding;
    $('#outputTitle').textContent=isCoding?'Instalasi dari GitHub':'Gunakan tanpa instalasi';
    $('#outputKicker').textContent=isCoding?'LANGKAH 03 · SALIN PERINTAH':'LANGKAH 02 · BUKA INSTRUKSI';
    $('#installActionTitle').textContent=isCoding?'Satu perintah untuk mulai.':'Buka, salin, lalu tempel.';
    $('#installActionDescription').textContent=isCoding?'Untuk '+clientNames[state.client]+': buka Terminal, jalankan perintah ini, lalu ikuti petunjuk installer.':'Tidak perlu terminal. Salin instruksi universal ke ChatGPT, Claude web, atau AI chat yang kamu gunakan.';
    $('#installationHint').textContent=isCoding?'Skill berisi instruksi. '+clientNames[state.client]+' tetap memakai model, akses, dan izin bawaan aplikasinya.':'Ini menggunakan instruksi manual, bukan pemasangan skill native atau fitur AI baru.';
    $('#installDisclaimer').textContent=isCoding?'Tidak perlu Python, ZIP, atau API JRHagents untuk memasang Skill.':'Instruksi universal tidak memberi chatbot akses file, browser atau API baru.';
    $('#installAuxLink').href=isCoding?'https://nodejs.org/en/download':installUrl;
    $('#installAuxLink').textContent=isCoding?'Belum punya Node.js? ↗':'Lihat panduan lengkap ↗';
    makeDetails(isCoding?codingDetails:chatDetails);
  }
  pathButtons.forEach(btn=>btn.addEventListener('click',()=>{state.path=btn.dataset.path;renderInstall();}));
  $('#clientSelect').addEventListener('change',e=>{state.client=e.target.value;renderInstall();});
  $('#copyInstall').addEventListener('click',()=>copy(command));
  $('#copyUniversal').addEventListener('click',()=>copy(universalShort));
  renderInstall();

  // The task designer generates usable instructions, not simulated AI execution.
  const presets={
    design:{title:'Rapikan desain website',role:'perancang UI/UX dan penguji aksesibilitas',action:'Evaluasi tata letak, tipografi, keterbacaan, navigasi, tampilan mobile, dan interaksi yang sudah tersedia.',steps:['Periksa tampilan dan fungsi sebelum diubah','Prioritaskan masalah yang benar-benar terlihat','Perbaiki secara konsisten tanpa merusak fungsi','Uji pada ukuran layar dan laporkan hasil']},
    coding:{title:'Bangun atau perbaiki fitur',role:'software engineer yang teliti',action:'Pahami kode yang ada, susun kriteria selesai, buat perubahan sekecil mungkin, dan periksa regresinya.',steps:['Petakan kode, dependensi dan batasan','Tetapkan perilaku yang diharapkan','Ubah kode secara terukur','Jalankan tes yang tersedia dan catat hasil']},
    research:{title:'Riset dengan sumber yang jelas',role:'peneliti yang kritis',action:'Uraikan pertanyaan riset, cari sumber yang benar-benar dapat diakses, dan bedakan bukti, interpretasi, dan ketidakpastian.',steps:['Tentukan pertanyaan dan rentang waktu','Kumpulkan sumber yang relevan dan nyata','Bandingkan hasil serta kesenjangan bukti','Simpulkan dengan rujukan dan keterbatasan']},
    writing:{title:'Tulis dengan jelas dan natural',role:'editor profesional',action:'Susun tulisan yang sesuai pembaca, tujuan, dan nada, dengan struktur yang masuk akal dan tidak bertele-tele.',steps:['Tentukan pembaca dan tujuan','Buat struktur yang mudah dipindai','Tulis dengan bahasa alami dan presisi','Periksa kejelasan, konsistensi, serta fakta']},
    data:{title:'Analisis data dengan teliti',role:'analis data',action:'Periksa asal dan kualitas data, gunakan metode yang sesuai, jelaskan angka beserta satuan, asumsi, dan maknanya.',steps:['Cek sumber, satuan dan data yang hilang','Pilih metode dan jelaskan asumsi','Hitung atau analisis hanya jika data tersedia','Interpretasi hasil tanpa mengarang angka']},
    business:{title:'Pilih keputusan bisnis yang masuk akal',role:'analis bisnis dan produk',action:'Nilai masalah pelanggan, opsi solusi, risiko, biaya, dan langkah awal yang paling bisa diuji.',steps:['Tetapkan masalah dan pelanggan sasaran','Bandingkan pilihan berdasarkan bukti','Pilih satu prioritas dan risiko utamanya','Susun uji pasar berbiaya rendah']},
    learning:{title:'Pelajari topik dengan sistematis',role:'mentor yang jelas dan sabar',action:'Jelaskan konsep dari dasar, gunakan contoh konkret, cek pemahaman, dan tingkatkan kesulitan secara bertahap.',steps:['Kenali pengetahuan awal','Jelaskan ide utama dengan analogi','Berikan contoh dan latihan singkat','Periksa pemahaman dan koreksi kesalahan']},
    review:{title:'Audit dan cek hasil',role:'reviewer kualitas yang kritis',action:'Tinjau pekerjaan yang tersedia, cari masalah yang bisa dibuktikan, bedakan yang sudah diuji dari yang belum.',steps:['Tentukan lingkup dan standar pemeriksaan','Inspeksi bukti yang benar-benar tersedia','Urutkan risiko dan perbaikan penting','Laporkan DONE, PARTIAL atau BLOCKED']},
    automation:{title:'Rancang otomatisasi yang aman',role:'arsitek workflow',action:'Petakan input, output, pemicu, izin, langkah, titik gagal, dan alat yang tersedia sebelum menerapkan otomatisasi.',steps:['Petakan alur manual dan hasil yang diinginkan','Tentukan pemicu, izin dan integrasi yang nyata','Rancang fallback dan perlindungan data','Uji pada contoh aman sebelum digunakan']}
  };
  function createTask(){
    const kind=$('#taskType').value;const preset=presets[kind]||presets.design;
    const raw=$('#taskDetail').value.trim().replace(/\s+/g,' ');const detail=raw.slice(0,320);
    const header='JRHagents, bertindaklah sebagai '+preset.role+'.';
    const request=detail?'Kebutuhan saya: '+detail+'.':'Tugas saya: '+preset.title+'.';
    const prompt=[header,request,preset.action,'Gunakan hanya berkas, sumber dan tool yang benar-benar tersedia. Jangan mengklaim menjalankan tes, mengakses data, atau mengubah proyek tanpa bukti. Jelaskan hasil, keterbatasan, dan satu tindakan berikutnya.'].join('\n\n');
    const resultSteps=preset.steps;
    state.lastPrompt='# '+preset.title+'\n\n'+prompt+'\n\n## Checklist\n'+resultSteps.map(s=>'- [ ] '+s).join('\n')+'\n';
    $('#resultHeading').textContent=preset.title;$('#resultText').textContent=prompt;$('#resultState').textContent=detail?'Sesuai kebutuhanmu':'Contoh siap pakai';
    const list=$('#resultSteps');list.replaceChildren();resultSteps.forEach(s=>{const li=document.createElement('li');li.textContent=s;list.append(li);});
  }
  const charCount=$('#charCount');$('#taskDetail').addEventListener('input',()=>{charCount.textContent=$('#taskDetail').value.length+'/320';});
  $('#generateTask').addEventListener('click',()=>{createTask();notice('Instruksi dibuat. Salin dan kirim ke AI-mu.');});
  $('#taskType').addEventListener('change',createTask);
  $('#copyTask').addEventListener('click',()=>copy($('#resultText').textContent));
  $('#downloadTask').addEventListener('click',()=>{if(!state.lastPrompt)createTask();const name=$('#taskType').value;downloadText('jrhagents-'+name+'-workflow.md',state.lastPrompt);notice('File Markdown siap diunduh.');});
  createTask();

  // 26 practices grounded in canonical references/CAPABILITIES.md; these are NOT integrations.
  const caps=[
    [1,'Analisis sistem','Pahami arsitektur dari kode dan bukti yang dibaca','Kode','⌘'],
    [2,'Review kode','Sederhanakan, cari edge case, dan tentukan tes','Kode','</>'],
    [3,'Karakter desain','Kurangi UI generik dan buat visual lebih jelas','Desain','◈'],
    [4,'Tulisan natural','Sesuaikan bahasa dengan pembaca','Tulisan','✎'],
    [5,'Pengetahuan berbasis sumber','Gunakan dokumen yang benar-benar tersedia','Riset','▤'],
    [6,'Polish UI','Audit alignment, spacing dan interaksi','Desain','✦'],
    [7,'Pola UI/UX','Gunakan pola responsif dan aksesibel','Desain','▧'],
    [8,'Cek kebaruan','Periksa tanggal sumber jika ada akses web','Riset','◷'],
    [9,'Rencana pengumpulan data','Kumpulkan data hanya dengan izin dan tool nyata','Riset','◎'],
    [10,'Diagram alur','Buat model proses atau arsitektur','Otomasi','◇'],
    [11,'Pemilihan tujuan','Temukan hasil utama yang diminta','Dasar','↗'],
    [12,'Peta konteks','Ringkas berkas, kendala, dan kebutuhan','Dasar','⌗'],
    [13,'Deteksi kemampuan AI','Sesuaikan tugas dengan akses host','Dasar','⊡'],
    [14,'Cek persiapan','Periksa akses dan syarat sebelum bekerja','Kualitas','◉'],
    [15,'Rencana adaptif','Pecah pekerjaan jadi tahap yang aman','Dasar','≋'],
    [16,'Konsistensi desain','Selaraskan komponen, ukuran dan warna','Desain','▦'],
    [17,'Verifikasi tampilan','Uji beberapa layar jika browser tersedia','Kualitas','▣'],
    [18,'Anti-mock','Tidak mengaku integrasi bekerja tanpa tes','Kualitas','⊘'],
    [19,'Uji dan perbaiki','Cari akar error dan uji ulang','Kualitas','✓'],
    [20,'Perlindungan data','Jaga izin, rahasia, dan informasi pribadi','Keamanan','⬡'],
    [21,'Perubahan aman','Batasi diff dan siapkan pemulihan','Kode','↶'],
    [22,'Hemat konteks','Pakai hanya referensi dan tool yang dibutuhkan','Dasar','◌'],
    [23,'Catatan bukti','Jelaskan apa yang benar-benar diperiksa','Kualitas','▤'],
    [24,'Asal sumber','Rujuk data dan tandai ketidakpastian','Riset','⌕'],
    [25,'Serah-terima konteks','Catat keputusan yang aman untuk dilanjutkan','Dasar','⇄'],
    [26,'Gerbang selesai','Cocokkan hasil dengan kriteria selesai','Kualitas','◆']
  ];
  const cats=['Semua','Dasar','Kode','Desain','Riset','Tulisan','Otomasi','Kualitas','Keamanan'];
  const filters=$('#categoryFilters');
  cats.forEach(cat=>{const b=document.createElement('button');b.type='button';b.textContent=cat;b.setAttribute('aria-pressed',String(cat===state.filter));b.addEventListener('click',()=>{state.filter=cat;state.expanded=false;renderCaps();});filters.appendChild(b);});
  function renderCaps(){
    const term=$('#capSearch').value.toLowerCase().trim();
    const filtered=caps.filter(c=>(state.filter==='Semua'||c[3]===state.filter)&&(!term||[c[1],c[2],c[3]].join(' ').toLowerCase().includes(term)));
    const showAll=state.expanded||term||state.filter!=='Semua';const shown=showAll?filtered:filtered.slice(0,8);
    $$('button',filters).forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===state.filter)));
    const grid=$('#capabilityGrid');grid.replaceChildren();
    if(!shown.length){const p=document.createElement('p');p.textContent='Belum ada hasil. Coba kata lain atau pilih Semua.';grid.appendChild(p);}
    shown.forEach(([number,name,description,category,icon])=>{const card=document.createElement('article');card.className='cap-card';const head=document.createElement('div');head.className='cap-card-head';const glyph=document.createElement('span');glyph.className='cap-card-icon';glyph.textContent=icon;glyph.setAttribute('aria-hidden','true');const id=document.createElement('span');id.className='cap-card-id';id.textContent=String(number).padStart(2,'0');head.append(glyph,id);const title=document.createElement('h3');title.textContent=name;const p=document.createElement('p');p.textContent=description;const tag=document.createElement('span');tag.className='cap-card-tag';tag.textContent=category;card.append(head,title,p,tag);grid.append(card);});
    $('#capabilityCount').textContent='Menampilkan '+shown.length+' dari '+filtered.length+' kemampuan relevan.';
    const more=$('#showAllCapabilities');more.hidden=Boolean(term||state.filter!=='Semua');more.textContent=state.expanded?'Tampilkan lebih sedikit ↑':'Lihat semua 26 kemampuan ↗';
  }
  $('#capSearch').addEventListener('input',()=>{state.expanded=false;renderCaps();});
  $('#showAllCapabilities').addEventListener('click',()=>{state.expanded=!state.expanded;renderCaps();});
  renderCaps();

  // Tiny motion flourish: pointer-driven parallax on capable devices only.
  const visual=$('.hero-visual'),stage=$('#visualStage');
  if(window.matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)').matches){let pending=false;let x=0,y=0;
    visual.addEventListener('pointermove',event=>{const rect=visual.getBoundingClientRect();x=((event.clientX-rect.left)/rect.width-.5);y=((event.clientY-rect.top)/rect.height-.5);if(!pending){pending=true;requestAnimationFrame(()=>{stage.style.transform='rotateY('+(x*4).toFixed(2)+'deg) rotateX('+(-y*4).toFixed(2)+'deg)';pending=false;});}},{passive:true});
    visual.addEventListener('pointerleave',()=>{stage.style.transform='';},{passive:true});
  }
})();

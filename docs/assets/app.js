/* Browser-only, zero third-party requests, no analytics or storage. */
(function () {
  'use strict';
  const model = window.JRHModel;
  if (!model) return;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const body = document.body;
  let category = 'All';
  let toastTimeout;

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => { el.hidden = true; }, 2600);
  }
  async function copy(text) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      toast('Berhasil disalin.');
    } catch (error) {
      // Fallback for opening docs over file:// and non-secure contexts.
      const el = document.createElement('textarea');
      el.value = text; el.readOnly = true; el.style.position='fixed';el.style.opacity='0';
      document.body.appendChild(el); el.focus(); el.select();
      const success = document.execCommand && document.execCommand('copy');
      el.remove();
      toast(success ? 'Berhasil disalin.' : 'Salin manual: pilih teks pada kotak perintah.');
    }
  }

  function renderFeatures() {
    const items = model.filterFeatures($('#featureSearch').value,category);
    const target=$('#featureGrid');
    target.replaceChildren();
    $('#featureCount').textContent = items.length+' dari '+model.features.length+' kemampuan';
    $('#emptyMessage').hidden = items.length>0;
    const frag=document.createDocumentFragment();
    for (const item of items) {
      const card=document.createElement('article');
      card.className='feature-card';
      card.innerHTML='<div class="feature-top"><span class="feature-num">'+String(item.id).padStart(2,'0')+'</span><span class="feature-category">'+model.escapeHtml(item.category)+'</span></div><h3>'+model.escapeHtml(item.name)+'</h3><p>'+model.escapeHtml(item.description)+'</p><span class="feature-status">'+model.escapeHtml(item.status)+'</span>';
      frag.appendChild(card);
    }
    target.appendChild(frag);
  }
  $('#featureSearch').addEventListener('input',renderFeatures);
  $$('#filters .filter').forEach(btn=>btn.addEventListener('click',()=>{
    category=btn.dataset.category;
    $$('#filters .filter').forEach(item=>{
      const selected=item===btn;
      item.classList.toggle('active',selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    renderFeatures();
  }));
  renderFeatures();

  function setStep(step) {
    $$('[data-panel]').forEach(panel=>{panel.hidden=panel.dataset.panel!==String(step);});
    $$('.step-link').forEach(btn=>{
      const active=btn.dataset.step===String(step);
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-current',active?'step':'false');
    });
    if (step===2) updateCommand();
  }
  $$('.step-link').forEach(btn=>btn.addEventListener('click',()=>setStep(Number(btn.dataset.step))));
  $$('.next-step').forEach(btn=>btn.addEventListener('click',()=>setStep(Number(btn.dataset.next))));

  const client=$('#client'), os=$('#os'), projectPath=$('#projectPath');
  function updateCommand() {
    try {
      const command=model.installCommand(client.value,os.value,projectPath.value,'project');
      $('#installCommand').textContent=command;
      $('#pathError').hidden=true;
      $('[data-copy-target="installCommand"]').disabled=false;
    } catch(err) {
      $('#installCommand').textContent='Perbaiki lokasi folder proyek di atas.';
      $('#pathError').textContent=err.message;
      $('#pathError').hidden=false;
      $('[data-copy-target="installCommand"]').disabled=true;
    }
    $('#reloadHint').textContent=model.clientData[client.value].reload;
  }
  for(const item of [client,os,projectPath]) item.addEventListener(item.tagName==='INPUT'?'input':'change',updateCommand);
  updateCommand();
  $('#taskChoice').addEventListener('change',function(){
    $('#samplePrompt').textContent=model.tasks[this.value].prompt;
  });
  $$('[data-copy-target]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.disabled)return;
    const target=document.getElementById(btn.dataset.copyTarget);
    if (target) void copy(target.textContent);
  }));
  const theme=$('#themeToggle');
  theme.addEventListener('click',()=>{
    const next=body.dataset.theme==='dark'?'light':'dark';
    body.dataset.theme=next;
    theme.setAttribute('aria-pressed', String(next==='light'));
    theme.setAttribute('aria-label',next==='light'?'Ganti ke tema gelap':'Ganti ke tema terang');
  });
})();

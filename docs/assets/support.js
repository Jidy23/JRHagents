/* JRHagents V35 Support. Opt-in UI; never sends a payment or loads an API. */
(() => {
  'use strict';
  const openButton = document.getElementById('supportNavButton');
  const dialog = document.getElementById('jrhSupportDialog');
  const closeButton = document.getElementById('closeSupport');
  const qr = document.getElementById('supportQR');
  if (!openButton || !dialog || !closeButton || !qr) return;
  const dict = {
    id: {nav:'Dukung',title:'Apresiasi untuk JRHagents',intro:'JRHagents tetap gratis. Kalau bermanfaat, kamu bisa membantu lewat kontribusi GitHub atau apresiasi sukarela.',recipient:'Penerima yang tertera di QRIS',warning:'Nama QRIS berbeda dari JRHagents. Pastikan nama penerima sama di aplikasi pembayaran. Batalkan jika berbeda.',stepOne:'Buka aplikasi pembayaran yang mendukung QRIS.',stepTwo:'Pindai kode atau impor dari galeri.',stepThree:'Periksa penerima dan masukkan nominal sukarela.',download:'Simpan gambar QRIS ↓',contribute:'Lebih suka kontribusi kode?',footnote:'Tidak ada nominal wajib, fitur yang dikunci, atau verifikasi pembayaran oleh website ini.',close:'Tutup dialog'},
    en: {nav:'Support',title:'Support JRHagents',intro:'JRHagents stays free. If it helps, you can contribute on GitHub or choose a voluntary QRIS appreciation.',recipient:'Recipient printed on this QRIS',warning:'The recipient name is different from JRHagents. Confirm the recipient in your payment app. Cancel if it does not match.',stepOne:'Open a payment app that supports QRIS.',stepTwo:'Scan the code or import it from your gallery.',stepThree:'Verify the recipient and enter any amount you choose.',download:'Save QRIS image ↓',contribute:'Prefer to contribute code?',footnote:'No minimum amount, locked features, or website payment verification.',close:'Close dialog'}
  };
  let lastActive = null;
  function applyLanguage() {
    const lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'id';
    document.querySelectorAll('[data-support]').forEach(node => {const key = node.dataset.support; if (dict[lang][key]) node.textContent = dict[lang][key];});
    openButton.setAttribute('aria-label',dict[lang].nav+' JRHagents');
    openButton.title = dict[lang].nav+' JRHagents';
    closeButton.setAttribute('aria-label',dict[lang].close);
  }
  function openDialog() {
    lastActive = document.activeElement;
    if (!qr.getAttribute('src')) qr.setAttribute('src',qr.dataset.src);
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open','');
    closeButton.focus();
  }
  function closeDialog() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lastActive && lastActive.isConnected) lastActive.focus();
    if (location.hash === '#support') history.replaceState(null, '', location.pathname + location.search + '#mulai');
  }
  openButton.addEventListener('click',openDialog);
  closeButton.addEventListener('click',closeDialog);
  dialog.addEventListener('click', e => {if (e.target === dialog) closeDialog();});
  dialog.addEventListener('close', () => {if (lastActive && lastActive.isConnected) lastActive.focus();});
  new MutationObserver(applyLanguage).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  applyLanguage();
  // A Support link is an explicit opt-in; normal page visits never trigger a payment dialog.
  if (location.hash === '#support') openDialog();
  window.addEventListener('hashchange', () => { if (location.hash === '#support' && !dialog.open) openDialog(); });
})();

/* JRHagents Support V34 — opt-in, no payment processing, no trackers. */
(() => {
  'use strict';
  const help = document.getElementById('screen-bantuan');
  const footer = document.querySelector('.footer-row');
  if (!help || !footer || document.getElementById('jrhSupportDialog')) return;
  const repo = 'https://github.com/Jidy23/JRHagents';
  const imgPath = 'assets/qris-support.png';
  const strings = {
    id: {
      kicker: 'DUKUNG OPEN SOURCE', title: 'Bantu karya ini terus berkembang.',
      desc: 'JRHagents tetap gratis. Kamu bisa menyumbang ide, memperbaiki kode, atau memberi apresiasi sukarela—semuanya sama berharganya.',
      codeTitle: 'Kontribusi di GitHub', codeDesc: 'Bantu dokumentasi, laporkan bug, atau ikut mengembangkan.',
      codeLink: 'Lihat cara berkontribusi', qrisTitle: 'Apresiasi via QRIS',
      qrisDesc: 'Opsional, tanpa nominal wajib atau fitur berbayar.', qrisButton: 'Lihat QRIS',
      foot: 'Dukung proyek', dialogKicker: 'APRESIASI SUKARELA', dialogTitle: 'Terima kasih sudah mendukung.',
      dialogLead: 'JRHagents gratis dan terbuka. Kalau proyek ini bermanfaat, kamu boleh mendukung pengembangannya lewat QRIS.',
      recipientLabel: 'Nama penerima yang tercantum pada QRIS',
      recipientNote: 'Nama penerimanya KOPDES NUSANTARA, bukan JRHagents. Pastikan sesuai di aplikasi pembayaran sebelum melanjutkan. Jika berbeda, batalkan transaksi.',
      step1: 'Buka aplikasi pembayaran yang mendukung QRIS.',
      step2: 'Pindai QRIS, atau simpan gambar ini dan impor dari galeri.',
      step3: 'Periksa penerima, tentukan nominal sendiri, lalu konfirmasi di aplikasi pembayaran.',
      save: 'Simpan gambar QRIS', github: 'Bantu lewat GitHub',
      disclaimer: 'Tidak ada pelacakan transaksi, nominal minimum, atau konfirmasi pembayaran otomatis di situs ini. Dukungan bukan pembelian produk.',
      close: 'Tutup dialog', footerDetail: 'Kontribusi karya atau apresiasi sukarela'
    },
    en: {
      kicker: 'SUPPORT OPEN SOURCE', title: 'Help keep this project moving.',
      desc: 'JRHagents stays free. Contributing ideas, improving code, or giving optional appreciation all help.',
      codeTitle: 'Contribute on GitHub', codeDesc: 'Improve documentation, report issues, or contribute code.',
      codeLink: 'How to contribute', qrisTitle: 'Support with QRIS',
      qrisDesc: 'Optional. No required amount or paid features.', qrisButton: 'View QRIS',
      foot: 'Support the project', dialogKicker: 'VOLUNTARY APPRECIATION', dialogTitle: 'Thanks for supporting.',
      dialogLead: 'JRHagents is free and open source. If it helps you, you can optionally support its development via QRIS.',
      recipientLabel: 'Recipient name printed on this QRIS',
      recipientNote: 'The recipient is KOPDES NUSANTARA, not JRHagents. Confirm the name in your payment app first. Cancel if it does not match.',
      step1: 'Open a payment app supporting QRIS.',
      step2: 'Scan the QR code, or save this image and import it from your gallery.',
      step3: 'Verify the recipient, choose your own amount, and confirm inside your payment app.',
      save: 'Save QRIS image', github: 'Contribute on GitHub',
      disclaimer: 'No transaction tracking, minimum payment, or automatic payment confirmation on this website. This is not a product purchase.',
      close: 'Close dialog', footerDetail: 'Contribute code or offer voluntary appreciation'
    }
  };
  const card = document.createElement('section');
  card.className = 'support-card';
  card.setAttribute('aria-labelledby', 'supportHeading');
  card.innerHTML = `
    <div class="support-card-top"><span class="support-icon" aria-hidden="true">✳</span><span class="support-kicker" data-support="kicker"></span></div>
    <div class="support-card-body"><div class="support-card-copy"><h3 id="supportHeading" data-support="title"></h3><p data-support="desc"></p></div>
    <div class="support-card-actions">
      <a class="support-option" href="${repo}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer"><span class="support-option-symbol" aria-hidden="true">{ }</span><span><strong data-support="codeTitle"></strong><small data-support="codeDesc"></small></span><span class="support-arrow" aria-hidden="true">↗</span></a>
      <button class="support-option" type="button" data-open-support><span class="support-option-symbol" aria-hidden="true">♡</span><span><strong data-support="qrisTitle"></strong><small data-support="qrisDesc"></small></span><span class="support-arrow" aria-hidden="true">→</span></button>
    </div></div>`;
  help.appendChild(card);
  const footerButton = document.createElement('button');
  footerButton.type = 'button';
  footerButton.className = 'support-footer-link';
  footerButton.setAttribute('data-open-support', '');
  footerButton.setAttribute('aria-haspopup', 'dialog');
  footerButton.setAttribute('data-support', 'foot');
  footer.appendChild(footerButton);
  const dialog = document.createElement('dialog');
  dialog.id = 'jrhSupportDialog';
  dialog.className = 'support-dialog';
  dialog.setAttribute('aria-labelledby', 'supportDialogTitle');
  dialog.setAttribute('aria-describedby', 'supportDialogLead');
  dialog.innerHTML = `
    <div class="support-dialog-inner">
      <header class="support-dialog-head"><span class="support-kicker" data-support="dialogKicker"></span><button type="button" class="support-close" data-support-close aria-label="Tutup dialog" title="Tutup">×</button></header>
      <h2 id="supportDialogTitle" data-support="dialogTitle"></h2><p id="supportDialogLead" data-support="dialogLead"></p>
      <div class="support-payment-grid">
        <div class="support-qr-container"><img src="${imgPath}" width="456" height="456" alt="QRIS payment code for KOPDES NUSANTARA" decoding="async"><span class="support-qr-caption">QRIS · Indonesia</span><a class="support-save" href="${imgPath}" download="JRHagents-Support-QRIS.png" data-support="save"></a></div>
        <div class="support-payment-details"><small data-support="recipientLabel"></small><strong class="support-merchant">KOPDES NUSANTARA</strong><p class="support-receiver-warning" data-support="recipientNote"></p>
          <ol class="support-instructions"><li data-support="step1"></li><li data-support="step2"></li><li data-support="step3"></li></ol>
        </div>
      </div>
      <div class="support-dialog-bottom"><p data-support="disclaimer"></p><a href="${repo}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" data-support="github"></a></div>
    </div>`;
  document.body.append(dialog);
  let lastFocus = null;
  const close = () => { if (dialog.open && typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); if (lastFocus?.isConnected) lastFocus.focus(); };
  const open = trigger => {
    lastFocus = trigger;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.querySelector('[data-support-close]').focus();
  };
  document.querySelectorAll('[data-open-support]').forEach(button => button.addEventListener('click', () => open(button)));
  dialog.querySelector('[data-support-close]').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { if (lastFocus?.isConnected) lastFocus.focus(); });
  const applyLanguage = () => {
    const lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'id';
    for (const element of document.querySelectorAll('[data-support]')) {
      const value = strings[lang][element.getAttribute('data-support')];
      if (value) element.textContent = value;
    }
    const label = strings[lang].close;
    const closeButton = dialog.querySelector('[data-support-close]');
    closeButton.setAttribute('aria-label', label);
    closeButton.title = label;
  };
  new MutationObserver(applyLanguage).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  applyLanguage();
})();

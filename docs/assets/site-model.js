/* JRHagents site content and pure helpers. Works in browser and Node; no dependencies. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.JRHModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const features = [
    [1,'System mapping','Pahami arsitektur proyek yang kamu punya.','Engineering','Inspired by REA'],
    [2,'Code review','Periksa kualitas kode dan kompleksitas.','Engineering','Inspired by Ponytail'],
    [3,'Distinctive design','Buat arah visual yang terasa dirancang manusia.','Design','Inspired by Hallmark'],
    [4,'Natural writing','Ubah tulisan teknis menjadi mudah dipahami.','Research','Inspired by Humanizer'],
    [5,'Knowledge workflows','Gunakan dokumen sebagai dasar jawaban, bila konektor tersedia.','Research','Inspired by Onyx'],
    [6,'Visual refinement','Periksa hierarki, grid, dan detail antarmuka.','Design','Inspired by Impeccable'],
    [7,'UX patterns','Perbaiki navigasi, alur, dan konsistensi komponen.','Design','Inspired by UI/UX Pro Max'],
    [8,'Fresh research','Tinjau sumber terbaru jika tool pencarian tersedia.','Research','Inspired by Last 30 Days'],
    [9,'Data extraction','Rancang ekstraksi data yang sah dan sesuai izin.','Research','Inspired by Scrapling'],
    [10,'Diagrams','Jelaskan alur sistem melalui diagram yang dapat diedit.','Engineering','Inspired by Diagram Design'],
    [11,'Intent router','Memilih alur kerja berdasarkan instruksi biasa.','Core','Native workflow'],
    [12,'Project map','Mendeteksi tanda stack, struktur, dan proyek Git.','Engineering','Native CLI'],
    [13,'Model routing','Prinsip memilih model saat provider benar-benar dikonfigurasi.','Core','Guidance only'],
    [14,'Environment doctor','Mendeteksi ketersediaan CLI lokal tanpa membuka API key.','Core','Native CLI'],
    [15,'Task planning','Mengubah permintaan menjadi langkah kerja yang terukur.','Core','Native CLI'],
    [16,'Design DNA','Menjaga gaya visual antarhalaman tetap konsisten.','Design','Skill guidance'],
    [17,'Visual QA','Checklist responsivitas, kontras, dan interaksi.','Design','Skill guidance'],
    [18,'No-mock gate','Memisahkan fitur nyata dari placeholder atau simulasi.','Quality','Skill guidance'],
    [19,'Test & verify','Menjalankan tes proyek hanya jika pengguna mengizinkan.','Quality','Opt-in CLI'],
    [20,'Secret shield','Mengenali pola kredensial tanpa menampilkan nilainya.','Quality','Native CLI heuristic'],
    [21,'Change guard','Mendorong perubahan kecil yang bisa dibatalkan.','Quality','Skill guidance'],
    [22,'Cost awareness','Mengurangi pemanggilan tool yang tidak diperlukan.','Core','Skill guidance'],
    [23,'Evidence ledger','Mencatat hasil tes dan status yang dapat diperiksa.','Quality','Native reports'],
    [24,'Source freshness','Memeriksa waktu, asal, dan kualitas referensi.','Research','Skill guidance'],
    [25,'Decision memory','Menyimpan konteks proyek lokal untuk kerja berkelanjutan.','Core','Native project context'],
    [26,'Release readiness','Membatasi klaim siap rilis tanpa bukti pengujian.','Quality','Native checks']
  ].map(function (f) { return {id:f[0],name:f[1],description:f[2],category:f[3],status:f[4]}; });
  const categories = ['All','Core','Engineering','Design','Research','Quality'];
  const clientData = {
    codex: {label:'Codex', folder:'.agents/skills/jrhagents', reload:'Mulai ulang sesi Codex agar skill ditemukan.'},
    claude: {label:'Claude Code',folder:'.claude/skills/jrhagents',reload:'Buka ulang sesi Claude Code pada proyek.'},
    gemini: {label:'Gemini CLI',folder:'.gemini/skills/jrhagents',reload:'Jalankan /skills reload lalu /skills list jika didukung.'},
    cursor: {label:'Cursor',folder:'.cursor/skills/jrhagents',reload:'Restart / reload agent skills di Cursor.'},
    copilot: {label:'GitHub Copilot',folder:'.github/skills/jrhagents',reload:'Mulai ulang sesi Copilot agent mode.'},
    opencode: {label:'OpenCode',folder:'.opencode/skills/jrhagents',reload:'Reload OpenCode agar skill terdeteksi.'},
    windsurf: {label:'Windsurf',folder:'.windsurf/skills/jrhagents',reload:'Restart Windsurf dan cek ketersediaan skill.'}
  };
  const tasks = {
    audit: {label:'Audit proyek',prompt:'JRHagents, audit proyek ini, prioritaskan satu masalah penting, dan berikan bukti pemeriksaan.'},
    polish: {label:'Rapikan UI',prompt:'JRHagents, rapikan UI proyek ini agar bersih dan responsif, pertahankan perilaku fitur, lalu verifikasi hasilnya.'},
    build: {label:'Bangun fitur',prompt:'JRHagents, buat fitur yang saya jelaskan dengan acceptance criteria, pertahankan kode yang sudah ada, dan jalankan tes relevan.'},
    research: {label:'Riset',prompt:'JRHagents, riset topik ini dengan sumber yang dapat diverifikasi dan jelaskan keterbatasan datanya.'},
    release: {label:'Cek sebelum rilis',prompt:'JRHagents, periksa kesiapan rilis proyek ini; jangan deploy sebelum saya menyetujui.'}
  };
  function filterFeatures(query, category) {
    const q = String(query || '').trim().toLocaleLowerCase('id');
    return features.filter(function (f) {
      return (!category || category==='All' || f.category===category) &&
        (!q || (f.name+' '+f.description+' '+f.category+' '+f.status).toLocaleLowerCase('id').includes(q));
    });
  }
  function validatePath(value) {
    const v=String(value || '').trim();
    if (!v) return '.';
    if (/[\r\n\x00-\x1f]/.test(v)) throw new Error('Lokasi proyek tidak boleh mengandung baris baru atau karakter kontrol.');
    if (v.length>240) throw new Error('Lokasi proyek terlalu panjang.');
    return v;
  }
  function quoteShell(value, os) {
    const val=validatePath(value);
    if (os === 'windows') {
      if (/["%\^&|<>!]/.test(val)) throw new Error('Untuk keamanan, gunakan lokasi Windows tanpa simbol khusus: " % ^ & | < > !');
      return '"'+val+'"';
    }
    return "'"+val.replace(/'/g,"'\\''")+"'";
  }
  function installCommand(client, os, path, scope, mode="skill") {
    if (!Object.prototype.hasOwnProperty.call(clientData,client)) throw new Error('Klien tidak valid.');
    if (!['windows','mac','linux'].includes(os)) throw new Error('Sistem operasi tidak valid.');
    const python = os === 'windows' ? 'py' : 'python3';
    if (mode === 'plugin') return 'https://github.com/Jidy23/JRHagents';
    const target = scope === 'user' ? ' --scope user' : ' --scope project --project '+quoteShell(path,os);
    if (mode === 'mcp') {
      const targetClient=['claude','cursor','copilot'].includes(client) ? client : 'generic';
      return python+' scripts/jrhagents.py mcp-config --client '+targetClient+' --project '+quoteShell(path,os);
    }
    if (mode !== 'skill') throw new Error('Format integrasi tidak valid.');
    return python+' scripts/jrhagents.py install --client '+client+target;
  }
  function escapeHtml(s) {return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  return {features,categories,clientData,tasks,filterFeatures,installCommand,validatePath,escapeHtml};
});

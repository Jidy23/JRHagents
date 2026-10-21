/* JRHagents V24 platform paths and capability data. Pure JS, Node-testable. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JRHGuide=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const repo='https://github.com/Jidy23/JRHagents';
const command='npx skills add Jidy23/JRHagents --skill jrhagents';
const appLists={chat:[['chatgpt','ChatGPT'],['claudeweb','Claude'],['geminiweb','Gemini'],['otherchat','Chatbot lain']],coding:[['codex','Codex'],['claudecode','Claude Code'],['cursor','Cursor'],['geminicli','Gemini CLI'],['copilot','Copilot'],['windsurf','Windsurf'],['opencode','OpenCode']]};
const categories=['Semua','Kode','Desain','Riset','Tulisan','Data','Bisnis','Belajar','Otomasi','Kualitas','Dasar'];
const capabilities=[
[1,'Analisis sistem','Pahami komponen dan alur sistem dari bukti yang tersedia.','Kode'],
[2,'Review kode','Rapikan implementasi dan periksa kasus tepi.','Kode'],
[3,'Desain tidak generik','Buat keputusan visual yang khas dan konsisten.','Desain'],
[4,'Bahasa natural','Ubah tulisan agar jelas sesuai pembacanya.','Tulisan'],
[5,'Landasan dokumen','Gunakan dokumen yang benar-benar dapat dibaca AI.','Riset'],
[6,'Polish antarmuka','Periksa jarak, tipografi, tombol, dan feedback.','Desain'],
[7,'Pola UI/UX','Pilih navigasi dan komponen yang mudah digunakan.','Desain'],
[8,'Riset terkini','Periksa kebaruan sumber jika AI punya akses web.','Riset'],
[9,'Pengumpulan data','Rencanakan pengambilan data yang berizin.','Riset'],
[10,'Diagram sistem','Jelaskan hubungan komponen melalui diagram.','Kode'],
[11,'Pahami tujuan','Pilih hasil terpenting dari permintaan pengguna.','Dasar'],
[12,'Peta konteks','Petakan file, batasan, dan fakta yang diketahui.','Dasar'],
[13,'Pilih kemampuan','Sesuaikan pekerjaan dengan alat AI yang tersedia.','Dasar'],
[14,'Pemeriksaan awal','Cek akses, alat, dan persyaratan sebelum bertindak.','Kualitas'],
[15,'Rencana adaptif','Pecah tugas besar menjadi langkah yang aman.','Bisnis'],
[16,'Sistem desain','Jaga komponen dan tampilan tetap selaras.','Desain'],
[17,'Quality check visual','Uji perangkat dan interaksi jika browser tersedia.','Kualitas'],
[18,'Anti fitur palsu','Jangan mengaku selesai jika belum berfungsi.','Kualitas'],
[19,'Test · Fix · Verify','Uji masalah, perbaiki, lalu uji kembali.','Kode'],
[20,'Keamanan & izin','Lindungi rahasia dan batasi tindakan berisiko.','Kualitas'],
[21,'Perubahan terkontrol','Simpan diff dan cara pemulihan sebelum rilis.','Kode'],
[22,'Hemat konteks','Gunakan referensi seperlunya agar tetap ringkas.','Dasar'],
[23,'Bukti pekerjaan','Bedakan klaim, hasil tes, dan hal belum diperiksa.','Kualitas'],
[24,'Validasi sumber','Pisahkan referensi valid dari asumsi.','Riset'],
[25,'Handoff proyek','Catat keputusan teknis yang boleh disimpan.','Otomasi'],
[26,'Pemeriksaan rilis','Pastikan syarat selesai benar-benar terpenuhi.','Kualitas']
].map(([id,name,description,category])=>({id,name,description,category}));
const tasks={
 audit:{label:'Audit proyek',prompt:'Audit proyek ini. Prioritaskan masalah yang berdampak, beri lokasi dan bukti yang benar-benar diperiksa. Jangan mengarang hasil pengujian. Akhiri dengan satu perbaikan terpenting.'},
 design:{label:'Rapikan desain UI',prompt:'Rapikan desain UI agar clean, nyaman di HP, stabil, dan responsif. Pertahankan fitur yang sudah bekerja. Periksa interaksi, ukuran layar, fokus keyboard dan reduced-motion bila tool tersedia.'},
 build:{label:'Buat fitur aplikasi',prompt:'Bangun fitur yang diminta dengan perubahan sekecil mungkin. Periksa struktur proyek lebih dulu, tulis kriteria selesai, kerjakan bila ada akses, lalu jalankan tes yang benar-benar tersedia.'},
 research:{label:'Riset',prompt:'Riset topik ini menggunakan sumber yang dapat diverifikasi. Bedakan fakta, analisis, dan dugaan; tulis tanggal sumber bila relevan. Jangan mengarang hasil pencarian internet.'},
 writing:{label:'Tulis dokumen',prompt:'Tulis naskah yang terstruktur, natural dan sesuai audiens. Fokus pada kejelasan, kelengkapan informasi, konsistensi istilah, dan sumber yang memang tersedia.'},
 data:{label:'Analisis data',prompt:'Analisis data yang diberikan. Periksa definisi, satuan, missing values, metode, serta batasan inferensi. Hubungkan hasil statistik dengan makna praktis; jangan menciptakan angka.'},
 business:{label:'Ide bisnis',prompt:'Evaluasi ide bisnis dari sisi masalah pelanggan, proposisi nilai, kompetitor, biaya, risiko, dan langkah validasi paling murah. Pilih satu prioritas dengan alasan yang jelas.'},
 learning:{label:'Belajar sesuatu',prompt:'Ajarkan topik secara bertahap dengan bahasa sederhana, contoh nyata, dan latihan singkat untuk memastikan pemahaman. Jelaskan istilah teknis hanya jika diperlukan.'},
 release:{label:'Cek sebelum rilis',prompt:'Tinjau kesiapan rilis: fungsi inti, build, pengujian, keamanan, aksesibilitas, performa, dokumentasi, dan rollback. Tandai PASSED, FAILED, atau NOT RUN berdasarkan bukti.'}
};
function getApps(mode){if(!appLists[mode])throw Error('Mode belum didukung');return appLists[mode].map(([id,name])=>({id,name}));}
function getInstall(mode,client,fullPrompt){const app=getApps(mode).find(a=>a.id===client);if(!app)throw Error('Aplikasi tidak cocok dengan jenis pemasangan');
if(mode==='chat'){
 if(!fullPrompt||fullPrompt.length<300)throw Error('Instruksi universal tidak lengkap');
 return {mode,client,app:app.name,title:'Salin, tempel, selesai.',description:'Tidak perlu terminal, Node.js, API key, atau endpoint. Pilih pesan biasa atau instruksi khusus yang tersedia di '+app.name+'.',kicker:'CARA PAKAI TANPA TERMINAL',type:'INSTRUKSI SIAP TEMPEL',subtitle:'Instruksi JRHagents lengkap. Salin semuanya, lalu kirim ke AI.',text:fullPrompt,steps:[['Salin instruksi','Tekan tombol Salin instruksi lengkap.'],['Buka '+app.name,'Tempel dalam chat atau fitur instruksi khusus yang ada.'],['Berikan tugas','Contoh: “JRHagents, audit proyek ini.”']],notice:'Jika create_skill meminta URL API, jangan gunakan itu. Pilih instruksi chat; tidak perlu API key.'};
 }
 return {mode,client,app:app.name,title:'Pasang Skill dari GitHub.',description:'Perintah ini hanya bekerja di Terminal komputer dengan Node.js. Jangan tempel ke chat AI.',kicker:'INSTALASI UNTUK AI CODING',type:'PERINTAH TERMINAL',subtitle:'Jalankan perintah di Terminal komputermu, bukan di jendela chat.',text:command,steps:[['Buka Terminal komputer','Pastikan Node.js dan internet tersedia.'],['Salin dan jalankan','Installer akan meminta pilihan aplikasi bila didukung.'],['Buka '+app.name,'Coba: “JRHagents, audit proyek ini.”']],notice:'Kalau aplikasi AI tidak punya terminal, beralih ke “Chatbot biasa”. Pemasangan native tetap bergantung pada versi dan dukungan Agent Skills di aplikasi yang dipilih.'};
}
function makeTask(kind,context){if(!tasks[kind])throw Error('Tugas tidak dikenal');let t=String(context||'').trim().slice(0,400);let p='JRHagents, '+tasks[kind].prompt;
if(t)p+='\n\nKonteks tugas saya: '+t;
p+='\n\nGunakan hanya akses yang benar-benar tersedia. Jika tidak punya tool atau data, jelaskan batasannya dan tetap berikan hasil terbaik yang bisa dibuat. Akhiri dengan satu aksi berikutnya.';return p;}
function filterCapabilities(query,category){const q=String(query||'').trim().toLocaleLowerCase('id');return capabilities.filter(x=>(category==='Semua'||!category||x.category===category)&&(!q||(x.name+' '+x.description+' '+x.category).toLocaleLowerCase('id').includes(q)));}
return {repo,command,appLists,categories,capabilities,tasks,getApps,getInstall,makeTask,filterCapabilities};
});

/* JRHagents V20 — verified direct-from-GitHub installation recipes.
   Pure JS: browser and Node, no network request and no external state. */
(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.JRHDirectInstall=model;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SOURCE='Jidy23/JRHagents';
const REPO='https://github.com/'+SOURCE;
const clientInfo={
  codex:{name:'Codex',agent:'codex',ready:'Buka Codex, lalu minta: JRHagents, audit proyek ini dan tunjukkan buktinya.'},
  claude:{name:'Claude Code',agent:'claude-code',ready:'Buka Claude Code dan minta: JRHagents, audit proyek ini dan tunjukkan buktinya.'},
  gemini:{name:'Gemini CLI',agent:'gemini-cli',ready:'Buka Gemini CLI. Gunakan /skills list, lalu minta JRHagents mengaudit proyek.'},
  cursor:{name:'Cursor',agent:'cursor',ready:'Buka Cursor Agent dan minta JRHagents mengaudit proyek.'},
  copilot:{name:'GitHub Copilot',agent:'github-copilot',ready:'Buka Copilot dalam mode agent yang mendukung Skills, lalu minta audit proyek.'},
  opencode:{name:'OpenCode',agent:'opencode',ready:'Buka OpenCode, lalu minta skill JRHagents melakukan audit proyek.'},
  windsurf:{name:'Windsurf',agent:'windsurf',ready:'Buka Windsurf dengan dukungan Skills, lalu minta JRHagents mengaudit proyek.'},
  vscode:{name:'VS Code',agent:null,ready:'Untuk VS Code pilih GitHub Copilot (Skill) atau MCP (alat lokal).'}
};
const mcpClients=['claude','cursor','gemini','copilot','vscode'];
function pathQuote(value,os){const p=String(value==null?'.':value).trim()||'.';if(p.length>240||/[\x00-\x1f]/.test(p))throw Error('Lokasi folder tidak valid.');if(os==='windows'){if(/["%^&|<>!]/.test(p))throw Error('Lokasi Windows memuat simbol khusus yang berisiko untuk perintah.');return '"'+p+'"';}return "'"+p.replace(/'/g,"'\\''")+"'";}
function step(title,description,command,where='Terminal'){return {title,description,command,where};}
function get(os='windows',client='codex',mode='skill',path='.',scope='user'){
 if(!['windows','mac','linux'].includes(os))throw Error('Sistem operasi tidak dikenal.');
 if(!clientInfo[client])throw Error('Aplikasi AI tidak tersedia.');
 if(!['skill','mcp','plugin'].includes(mode))throw Error('Cara pemasangan tidak dikenal.');
 if(!['user','project'].includes(scope))throw Error('Cakupan tidak dikenal.');
 const info=clientInfo[client];
 if(mode==='skill'){
   if(!info.agent)return {supported:false,mode,steps:[],help:'VS Code saja bukan klien Skill. Pilih GitHub Copilot atau MCP.',link:REPO};
   const command='npx skills add '+SOURCE+' --skill jrhagents -a '+info.agent+(scope==='user'?' -g':'');
   return {supported:true,mode,method:'github-skill',needs:'Node.js dan akses internet',steps:[
     step('Pasang langsung dari GitHub','Buka Terminal. Installer akan mengambil JRHagents dari GitHub dan menanyakan izin bila diperlukan.',command),
     step('Mulai pakai di '+info.name,'Buka aplikasi AI-mu. Ini instruksi bahasa biasa, bukan perintah terminal.','JRHagents, audit proyek ini dan tunjukkan buktinya.','Aplikasi AI')
   ],help:scope==='user'?'Hanya perlu pasang sekali untuk profil pengguna ini. Skill mengikuti izin dan kemampuan AI coding yang kamu gunakan.':'Jalankan perintah di terminal folder proyek supaya Skill hanya berlaku untuk proyek itu.',link:'https://github.com/vercel-labs/skills/blob/main/docs/commands.md',troubleshooting:'Jika npx tidak ditemukan, instal Node.js LTS dari https://nodejs.org/en/download dan buka terminal baru.'};
 }
 if(mode==='plugin'){
   if(client!=='claude')return {supported:false,mode,steps:[],help:'Plugin native JRHagents saat ini hanya disiapkan untuk Claude Code. Pilih Skill untuk aplikasi lain.',link:REPO+'/tree/main/.claude-plugin'};
   return {supported:true,mode,method:'claude-marketplace',needs:'Claude Code versi yang mendukung plugin',steps:[
     step('Tambahkan marketplace GitHub','Ketik perintah ini di dalam Claude Code, bukan di terminal biasa.','/plugin marketplace add '+SOURCE,'Claude Code'),
     step('Pasang plugin JRHagents','Pilih plugin yang sudah tersedia dari marketplace tadi.','/plugin install jrhagents@jrhagents','Claude Code'),
     step('Gunakan dengan kalimat biasa','Minta kemampuan sesuai pekerjaanmu.','JRHagents, rapikan UI ini tanpa merusak fitur.','Claude Code')
   ],help:'Plugin tidak memerlukan unduhan ZIP manual. Instalasi sebenarnya harus dikonfirmasi di aplikasi Claude Code.',link:REPO+'/tree/main/.claude-plugin',troubleshooting:'Jika marketplace tidak ditemukan, periksa kompatibilitas versi Claude Code dan nama marketplace.'};
 }
 if(!mcpClients.includes(client))return {supported:false,mode,steps:[],help:'Setup MCP otomatis untuk '+info.name+' belum didukung. Skill tetap dapat digunakan.',link:REPO+'/blob/main/docs/MCP.md'};
 const py=os==='windows'?'py':'python3';
 const python=os==='windows'?'.\\.jrh-venv\\Scripts\\python.exe':'./.jrh-venv/bin/python';
 const args=' --mode mcp --client '+client+' --project '+pathQuote(path,os);
 return {supported:true,mode,method:'local-mcp',needs:'Python 3.9+, internet, dan klien MCP',steps:[
   step('Buat lingkungan Python khusus','Mencegah benturan dengan Python atau proyek lain.',py+' -m venv .jrh-venv'),
   step('Pasang MCP dari GitHub','Mengambil source JRHagents resmi, bukan paket tak dikenal.',python+' -m pip install "'+REPO+'/archive/refs/heads/main.zip"'),
   step('Hubungkan ke '+info.name,'Menambahkan lima alat baca proyek tanpa menghapus server lain.',python+' -m jrhagents setup'+args),
   step('Pastikan paket terpasang','Restart aplikasi AI dan cek daftar tool MCP.',python+' -m jrhagents --version')
 ],help:'Lima tool MCP hanya membaca proyek lokal. Tidak bisa mengedit kode atau menjalankan AI sendiri. Gunakan hanya pada proyek yang kamu percayai.',link:REPO+'/blob/main/docs/MCP.md',troubleshooting:'Jika Python tidak terdeteksi, pasang Python dari python.org. Jika konfigurasi sudah ada dan berbeda, setup berhenti tanpa menimpanya.'};
}
return {get,clientInfo,mcpClients,SOURCE,REPO,pathQuote};
});

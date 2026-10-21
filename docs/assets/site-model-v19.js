/* Pure cross-platform installer command generator, tested in Node and browser. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JRHInstall=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BASE='https://github.com/Jidy23/JRHagents/archive/refs/heads/main.zip';
const clients={codex:'Codex',claude:'Claude Code',gemini:'Gemini CLI',cursor:'Cursor',copilot:'GitHub Copilot',opencode:'OpenCode',windsurf:'Windsurf',vscode:'VS Code (MCP)'};
const mcpSupported=['claude','cursor','gemini','copilot','vscode'];
function quotePath(path,os){const s=String(path||'.').trim()||'.';if(/[\r\n\0-\x1f]/.test(s)||s.length>240)throw new Error('Lokasi folder tidak valid.');if(os==='windows'){if(/["%\^&|<>!]/.test(s))throw new Error('Hindari simbol khusus pada path Windows.');return '"'+s+'"';}return "'"+s.replace(/'/g,"'\\''")+"'";}
function get(os='windows',client='codex',mode='skill',path='.',scope='project'){
 if(!['windows','mac','linux'].includes(os))throw new Error('Sistem operasi tidak dikenal');
 if(!clients[client])throw new Error('Aplikasi AI tidak dikenal');
 if(!['skill','mcp','plugin'].includes(mode))throw new Error('Mode tidak dikenal');
 if(!['project','user'].includes(scope))throw new Error('Cakupan tidak dikenal');
 const py=os==='windows'?'py':'python3';const launch=os==='windows'?'.\\.jrh-venv\\Scripts\\python.exe':'./.jrh-venv/bin/python';
 const pathValue=quotePath(path,os);
 const steps=[
  {title:'Periksa Python',description:'Pastikan Python 3.9 atau lebih baru tersedia.',command:py+' --version',kind:'check'},
  {title:'Buat lingkungan aman',description:'Mencegah benturan dengan paket Python lain.',command:py+' -m venv .jrh-venv',kind:'install'},
  {title:'Pasang JRHagents dari GitHub',description:'Memasang source resmi langsung dari GitHub, bukan paket PyPI dengan nama mirip.',command:launch+' -m pip install "'+BASE+'"',kind:'install'}
 ];
 if(mode==='plugin'){
  return {supported:client==='claude',mode,steps:[],help:client==='claude'?'Plugin Claude Code tersedia sebagai struktur proyek. Instalasi melalui marketplace memerlukan konfigurasi marketplace dan aplikasi Claude Code yang kompatibel.':'Plugin native untuk aplikasi ini belum tersedia. Gunakan mode Skill atau MCP.',link:'https://github.com/Jidy23/JRHagents/tree/main/.claude-plugin'};
 }
 if(mode==='mcp'&&!mcpSupported.includes(client))return {supported:false,mode,steps:[],help:'Pemasangan MCP otomatis belum tersedia untuk '+clients[client]+'. Pilih Cursor, Claude Code, Gemini CLI, Copilot, atau VS Code, atau ikuti konfigurasi manual.',link:'https://github.com/Jidy23/JRHagents/blob/main/docs/MCP.md'};
 const cmd=launch+' -m jrhagents setup --mode '+mode+' --client '+client+(scope==='user'&&mode==='skill'?' --scope user':' --project '+pathValue);
 steps.push({title:mode==='skill'?'Pasang skill ke aplikasi AI':'Hubungkan MCP ke aplikasi AI',description:mode==='skill'?'Salin instruksi JRHagents ke folder skill aplikasi AI.':'Menambahkan server MCP tanpa menghapus server lainnya.',command:cmd,kind:'setup'});
 steps.push({title:'Pastikan terpasang',description:'Lihat versi paket lokal. Setelah itu, mulai ulang aplikasi AI.',command:launch+' -m jrhagents --version',kind:'verify'});
 return {supported:true,mode,steps,help:mode==='mcp'?'MCP hanya membaca proyek. Jika pengaturan aplikasi sudah berbeda, JRHagents tidak menimpanya.':'Skill adalah instruksi untuk AI coding—bukan AI cloud yang langsung berjalan sendiri.',link:'https://github.com/Jidy23/JRHagents/blob/main/docs/INSTALL.md'};
}
return {get,BASE,clients,mcpSupported,quotePath};
});

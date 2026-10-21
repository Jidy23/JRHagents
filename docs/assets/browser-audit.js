/* Browser-only bounded static audit. No fetch, no telemetry, no code execution. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.JRHBrowserAudit=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const MAX_FILES=240, MAX_BYTES=6*1024*1024, MAX_FILE_BYTES=300*1024, MAX_FINDINGS=100;
const binary=/\.(?:png|jpe?g|gif|webp|svgz|ico|pdf|docx?|xlsx?|zip|gz|mp[34]|wav|woff2?|ttf|eot|map|lockb|exe|dmg|sqlite3?)$/i;
const ignorePath=/(^|\/)(?:node_modules|\.git|\.venv|venv|dist|build|coverage|\.next)(\/|$)/i;
const extensions=/\.(?:js|jsx|ts|tsx|py|html?|css|scss|vue|svelte|json|ya?ml|toml|md|sh|env|txt|sql)$/i;
const rules=[
 {id:'possible-secret',severity:'high',name:'Kemungkinan kredensial tertulis di kode',pattern:/(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{25,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/},
 {id:'insecure-http',severity:'medium',name:'Alamat HTTP di kode',pattern:/\bhttp:\/\/(?!localhost\b|127\.0\.0\.1\b|0\.0\.0\.0\b|example\.com\b)/i},
 {id:'todo',severity:'info',name:'Tugas tertunda (TODO/FIXME)',pattern:/\b(?:TODO|FIXME)\b/i},
 {id:'placeholder',severity:'medium',name:'Tautan sementara (#)',pattern:/href\s*=\s*["']#["']/i},
 {id:'console',severity:'info',name:'Log pengembangan',pattern:/\bconsole\.log\s*\(/},
];
function cleanPath(name){return String(name||'berkas').replace(/\\/g,'/').slice(0,220).replace(/[\r\n\t]/g,' ');}
function result(status,files,scanned,skipped,bytes,findings,stack,limits){return {schema:'jrhagents.browser-audit.v1',status,privacy:'Dianalisis di perangkat; kode dan nilai token tidak dimasukkan dalam laporan.',filesSelected:files,filesScanned:scanned,filesSkipped:skipped,bytesScanned:bytes,stack:[...stack],findings,limits};}
async function auditFiles(files){
 const input=Array.from(files||[]);if(input.length===0)return result('empty',0,0,0,0,[],new Set(),[]);
 const stack=new Set(), findings=[];let scanned=0,skipped=0,bytes=0;const limits=[];
 if(input.length>MAX_FILES)limits.push('Hanya 240 berkas pertama yang diperiksa.');
 for(const f of input.slice(0,MAX_FILES)){
  const path=cleanPath(f.webkitRelativePath||f.name);
  const size=Number(f.size)||0;
  if(ignorePath.test(path)||binary.test(path)||!extensions.test(path)||size>MAX_FILE_BYTES||bytes+size>MAX_BYTES){skipped++;continue;}
  if(/(^|\/)\.env(?:\..+)?$/i.test(path)&&!/\.example$|\.sample$/i.test(path)){
    findings.push({id:'env-file',severity:'high',name:'Berkas lingkungan pribadi terdeteksi',file:path,line:0,advice:'Pastikan tidak ikut ke repositori publik. Nilainya tidak dibaca.'});skipped++;continue;
  }
  if(typeof f.text!=='function'){skipped++;continue;}
  let source;try{source=await f.text();}catch(_){skipped++;continue;}
  if(typeof source!=='string'||source.includes('\0')){skipped++;continue;}
  scanned++;bytes+=size;
  if(/package\.json$/i.test(path)){try{const p=JSON.parse(source);if(p.dependencies?.react||p.devDependencies?.react)stack.add('React');if(p.dependencies?.next)stack.add('Next.js');if(p.devDependencies?.vite)stack.add('Vite');}catch(_){findings.push({id:'invalid-package',severity:'medium',name:'package.json tidak valid',file:path,line:0,advice:'Periksa sintaks JSON.'});}}
  if(/\.py$/i.test(path))stack.add('Python');if(/\.tsx?$/.test(path))stack.add('TypeScript');if(/\.html?$/.test(path))stack.add('HTML');
  const lines=source.split(/\r?\n/).slice(0,8000);
  for(let i=0;i<lines.length&&findings.length<MAX_FINDINGS;i++){
   for(const rule of rules){
    if(rule.pattern.test(lines[i]))findings.push({id:rule.id,severity:rule.severity,name:rule.name,file:path,line:i+1,advice:rule.id==='possible-secret'?'Segera pindahkan token ke konfigurasi aman dan rotasi jika sudah terekspos.':'Tinjau dan perbaiki sesuai kebutuhan.'});
    if(findings.length>=MAX_FINDINGS)break;
   }
  }
 }
 if(findings.length>=MAX_FINDINGS)limits.push('Temuan dibatasi 100 agar laporan tetap ringkas.');
 if(bytes>=MAX_BYTES)limits.push('Ukuran sumber yang diperiksa dibatasi 6 MB.');
 return result('complete',input.length,scanned,skipped,bytes,findings,stack,limits);
}
const EXAMPLE=[{name:'contoh.html',size:170,text:async()=>'<html><body><a href="#">Menu</a>\n<script>console.log("cek"); // TODO rapikan</script></body></html>'}, {name:'package.json',size:71,text:async()=>'{"devDependencies":{"vite":"^5.0.0"},"dependencies":{"react":"^18"}}'}];
return {auditFiles,exampleFiles:EXAMPLE,MAX_FILES,MAX_BYTES,cleanPath};
});

"""Self-contained accessible offline HTML dashboard; no external dependencies."""
from __future__ import annotations
import html
import json
from pathlib import Path
from .core import audit, status, project_dir, utc_now

CSS = r'''
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:light dark;--bg:#f4f7fb;--card:#fff;--text:#11233c;--muted:#53657d;--border:#dce5f1;--brand:#205bd9;--soft:#e7efff;--good:#20774b;--bad:#bd4242}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);line-height:1.55}main{max-width:1050px;margin:auto;padding:clamp(16px,4vw,44px)}header{padding:26px 0 14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px}h1{font-size:clamp(27px,5vw,42px);letter-spacing:-.05em;line-height:1.2;margin:4px 0}h2{font-size:18px;margin:0 0 16px;letter-spacing:-.02em}.eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--brand);font-weight:800}.muted,small{color:var(--muted)}.shell{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0}.metric,.card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px}.metric strong{display:block;font-size:30px;letter-spacing:-.03em}.metric span{color:var(--muted);font-size:13px}.grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.card{margin-bottom:14px}.pill{font-size:12px;font-weight:800;border-radius:99px;padding:6px 12px;background:var(--soft);color:var(--brand);display:inline-block}.warn{color:var(--bad)}.ok{color:var(--good)}table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}td,th{text-align:left;border-bottom:1px solid var(--border);padding:12px 8px;overflow-wrap:anywhere}th{color:var(--muted);font-weight:700}li{margin:8px 0}code{overflow-wrap:anywhere}footer{padding:24px 0;font-size:12px;color:var(--muted)}.full{grid-column:1/-1}:focus-visible{outline:3px solid var(--brand);outline-offset:3px}@media(max-width:750px){.grid{grid-template-columns:1fr}.shell{grid-template-columns:repeat(2,minmax(0,1fr))}.metric,.card{padding:16px}}@media(prefers-color-scheme:dark){:root{--bg:#0a1423;--card:#101f33;--text:#eef3ff;--muted:#acbad0;--border:#26374c;--brand:#8fb7ff;--soft:#1c3453;--good:#80d8a9;--bad:#ff9292}}
'''

def esc(v):
    return html.escape(str(v), quote=True)

def _rows(items):
    if not items:
        return '<tr><td colspan="4">Tidak ada temuan pada cakupan pemeriksaan.</td></tr>'
    return "\n".join('<tr><td>'+esc(x.get("severity",""))+'</td><td>'+esc(x.get("code",""))+'</td><td>'+esc(x.get("file",""))+'</td><td>'+esc(x.get("line","-"))+'</td></tr>' for x in items)

def _list(items):
    return "".join("<li>"+esc(x)+"</li>" for x in items) or "<li>Tidak ada</li>"

def build_html(report):
    a = report["audit"]
    v = report.get("verification", {})
    checks = v.get("checks", [])
    check_rows = "\n".join("<tr><td>"+esc(x.get("name", ""))+"</td><td>"+esc(x.get("status", ""))+"</td><td colspan='2'>"+esc(x.get("detail", x.get("error", "Lihat data JSON")))+"</td></tr>" for x in checks)
    if not check_rows:
        check_rows = '<tr><td colspan="4">Belum ada hasil verifikasi yang disimpan.</td></tr>'
    path = esc(a["project"])
    return f'''<!doctype html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>JRHagents · Project Report</title><style>{CSS}</style></head><body><main><header><div><div class="eyebrow">JRHagents · V13 · Offline Report</div><h1>Project Intelligence</h1><div class="muted">Pemeriksaan lokal · {esc(report['generated_at'])}</div></div><span class="pill">READ-ONLY AUDIT</span></header><p class="muted">Proyek: <code>{path}</code></p><section class="shell" aria-label="Metrik utama"><div class="metric"><strong>{esc(a['files_inspected'])}</strong><span>Berkas ditinjau</span></div><div class="metric"><strong>{esc(len(a['findings']))}</strong><span>Potensi temuan</span></div><div class="metric"><strong>{esc(len(a['framework_markers']))}</strong><span>Penanda framework</span></div><div class="metric"><strong>{esc(v.get('status', '—'))}</strong><span>Status verifikasi</span></div></section><div class="grid"><section class="card"><h2>Temuan keamanan indikatif</h2><table><thead><tr><th>Risiko</th><th>Jenis</th><th>Berkas</th><th>Baris</th></tr></thead><tbody>{_rows(a['findings'])}</tbody></table></section><section class="card"><h2>Profil proyek</h2><p><b>Framework:</b> {esc(', '.join(a['framework_markers']) or 'Tidak terdeteksi')}</p><p><b>Lockfile:</b> {esc(', '.join(a['lockfiles']) or 'Tidak terdeteksi')}</p><p><b>Tes:</b> {esc('Ada indikasi' if a['tests_detected'] else 'Belum terdeteksi')}</p><p><b>Berkas Git berubah:</b> {esc(a['git_modified_tracked_files'] if a['git_modified_tracked_files'] is not None else 'Tidak tersedia')}</p><h2>Observasi</h2><ul>{_list(a['observations'])}</ul></section><section class="card full"><h2>Bukti verifikasi</h2><table><thead><tr><th style="width:30%">Check</th><th style="width:18%">Status</th><th colspan="2">Detail</th></tr></thead><tbody>{check_rows}</tbody></table></section><section class="card full"><h2>Batasan penting</h2><ul>{_list(a['limitations'])}</ul><p class="muted">Laporan ini bukan bukti aplikasi siap produksi. Pengujian aktif, browser, aksesibilitas dan deploy harus diverifikasi secara terpisah. Tidak ada API eksternal yang digunakan untuk laporan.</p></section></div><footer>JRHagents · 100% offline HTML, zero external trackers, no secret values displayed.</footer></main></body></html>'''

def generate_report(project="."):
    root = project_dir(project)
    a = audit(root)
    v = None
    candidate = root / ".jrhagents" / "last-verify.json"
    if candidate.exists() and not candidate.is_symlink():
        try:
            obj = json.loads(candidate.read_text(encoding="utf-8"))
            if obj.get("project") == str(root): v = obj
        except (OSError, ValueError):
            pass
    data = {"generated_at": utc_now(), "audit": a, "verification": v, "status": status(root)}
    out = root / ".jrhagents" / "reports"
    if out.parent.is_symlink() or out.is_symlink(): raise ValueError("Output report symlink tidak diizinkan")
    out.mkdir(parents=True, exist_ok=True)
    target_html, target_json = out / "index.html", out / "report.json"
    if any(x.is_symlink() for x in (target_html, target_json)):
        raise ValueError("Tidak menulis output melalui symlink")
    target_html.write_text(build_html(data), encoding="utf-8")
    target_json.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"html": str(target_html), "json": str(target_json), "finding_count": len(a["findings"]), "verification_status": v.get("status") if v else "not_run"}

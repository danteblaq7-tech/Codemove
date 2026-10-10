// NEW FILE – client/src/lib/csv.js
// Downloads a table (array of rows) as a UTF-8 CSV that opens correctly in Excel.
// Cells starting with = + - @ are prefixed with ' so Excel can't run them as formulas.
export function downloadCsv(name, table) {
  const safe = (v) => { const s = String(v ?? ''); return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };
  const url = URL.createObjectURL(new Blob(['\uFEFF' + table.map((r) => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

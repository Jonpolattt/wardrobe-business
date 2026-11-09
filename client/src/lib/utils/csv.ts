/** Downloads rows as a UTF-8 CSV file (with BOM so that Excel opens Cyrillic correctly). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const s = String(value);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const content = rows.map((r) => r.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

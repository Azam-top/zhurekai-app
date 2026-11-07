/** Web preview: opens the report in a new tab, where it can be printed to PDF. */
export async function exportPdf(html: string, _title: string): Promise<void> {
  const w = window.open('', '_blank');
  if (!w) throw new Error('popup blocked');
  w.document.write(html);
  w.document.close();
}

import * as XLSX from 'xlsx';

/**
 * Cleanly exports any array of plain objects into an Excel (.xlsx) file.
 * Automatically derives columns, preserves data types, and downloads directly.
 */
export const exportToExcel = (
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Records'
): void => {
  if (!data || data.length === 0) {
    alert('No data available to export for the selected filters.');
    return;
  }

  // Generate worksheet from JSON objects
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths based on content
  const columnWidths = Object.keys(data[0] || {}).map((key) => {
    const maxValLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== null && row[key] !== undefined ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxValLen + 2, 12), 50) };
  });
  worksheet['!cols'] = columnWidths;

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Trigger browser download
  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(workbook, safeFileName);
};

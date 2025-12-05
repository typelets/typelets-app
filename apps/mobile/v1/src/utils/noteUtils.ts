/**
 * Note utility functions
 */

import { isDiagramContent } from './noteTypeDetection';

/**
 * Extract cell value from Univer cell data
 */
function getCellValue(cell: any): string {
  if (!cell) return '';
  // Try multiple possible value locations in Univer format
  // v = direct value, p.body.dataStream = rich text, s = string reference
  let value = '';
  if (cell.v !== undefined && cell.v !== null) {
    value = cell.v.toString();
  } else if (cell.p?.body?.dataStream) {
    value = cell.p.body.dataStream.replace(/\r\n$/, '').replace(/\n$/, '');
  }
  return value.trim();
}

/**
 * Check if cell has any data (value, formula, or rich text)
 */
function cellHasData(cell: any): boolean {
  if (!cell) return false;

  // Check for non-empty value (string, number, boolean)
  if (cell.v !== undefined && cell.v !== null) {
    // Numbers and booleans are valid data
    if (typeof cell.v === 'number' || typeof cell.v === 'boolean') return true;
    // Non-empty strings are valid data
    if (typeof cell.v === 'string' && cell.v.trim() !== '') return true;
  }

  // Check for formula
  if (cell.f !== undefined && cell.f !== '') return true;

  // Check for rich text content
  if (cell.p?.body?.dataStream && cell.p.body.dataStream.replace(/[\r\n]/g, '').length > 0) return true;

  return false;
}

/**
 * Check if a row has any actual content
 */
function rowHasContent(rowData: any): boolean {
  if (!rowData) return false;
  const colIndices = Object.keys(rowData).map(Number).filter(n => !isNaN(n));
  for (const colIndex of colIndices) {
    if (cellHasData(rowData[colIndex])) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a preview for spreadsheet content
 * Parses Univer JSON format and extracts meaningful preview text
 */
export function getSheetPreview(content: string): string {
  try {
    const data = JSON.parse(content);

    // Get the first sheet's data
    const sheets = data.sheets || {};
    const sheetIds = Object.keys(sheets);

    if (sheetIds.length === 0) {
      return 'Empty spreadsheet';
    }

    const firstSheet = sheets[sheetIds[0]];
    const cellData = firstSheet?.cellData || {};

    // Get row indices sorted
    const allRowIndices = Object.keys(cellData).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);

    if (allRowIndices.length === 0) {
      return 'Empty spreadsheet';
    }

    const cellValues: string[] = [];

    // Extract cell values from first two rows (regardless of content)
    const rowsToCheck = allRowIndices.slice(0, 2);
    for (const rowIndex of rowsToCheck) {
      const rowData = cellData[rowIndex] || {};
      const colIndices = Object.keys(rowData).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);

      for (const colIndex of colIndices) {
        const value = getCellValue(rowData[colIndex]);
        if (value && cellValues.length < 6) {
          cellValues.push(value);
        }
      }

      // Stop if we have enough values
      if (cellValues.length >= 6) break;
    }

    // Build preview string - just show cell values
    if (cellValues.length > 0) {
      const headerPreview = cellValues.join(', ');
      const truncated = headerPreview.length > 60 ? headerPreview.substring(0, 57) + '...' : headerPreview;
      return truncated;
    }

    return 'Spreadsheet';
  } catch {
    return 'Spreadsheet';
  }
}

/**
 * Detect if content is primarily a diagram and return a friendly preview
 */
function getDiagramPreview(text: string): string | null {
  if (isDiagramContent(text)) {
    return 'Diagram';
  }
  return null;
}

/**
 * Strip HTML tags and decode entities from HTML content
 * Also detects diagrams and returns friendly preview
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  // Remove HTML tags (apply repeatedly to handle nested/incomplete tags)
  let previous;
  let text = html;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);

  // Decode common HTML entities (decode &amp; last to prevent double-unescaping)
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

  // Check if content is a diagram before normalizing whitespace
  const diagramPreview = getDiagramPreview(text);
  if (diagramPreview) {
    return diagramPreview;
  }

  // Remove extra whitespace and normalize
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

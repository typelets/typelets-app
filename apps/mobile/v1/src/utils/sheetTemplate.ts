/**
 * Empty spreadsheet template in Univer format
 * Creates a basic workbook with one empty sheet
 */

export interface IWorkbookData {
  id: string;
  name: string;
  sheetOrder: string[];
  sheets: { [sheetId: string]: IWorksheetData };
  styles?: { [styleId: string]: IStyleData | null };
}

interface IWorksheetData {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  defaultRowHeight: number;
  defaultColumnWidth: number;
  cellData: { [row: string]: { [col: string]: ICellData } };
}

interface ICellData {
  v?: string | number | boolean | null;
  s?: string | IStyleData | null;
  f?: string | null;
  t?: number | null;
}

interface IStyleData {
  ff?: string;
  fs?: number;
  it?: number;
  bl?: number;
  ul?: { s?: number };
  st?: { s?: number };
  cl?: { rgb?: string };
  bg?: { rgb?: string };
  ht?: number;
  vt?: number;
  tb?: number;
  n?: { pattern?: string };
}

/**
 * Creates an empty spreadsheet workbook with one sheet
 */
export function createEmptySheet(title: string = 'Untitled Spreadsheet'): string {
  const sheetId = `sheet_${Date.now()}`;
  const workbookId = `workbook_${Date.now()}`;

  const workbook: IWorkbookData = {
    id: workbookId,
    name: title,
    sheetOrder: [sheetId],
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: 'Sheet1',
        rowCount: 100,
        columnCount: 26,
        defaultRowHeight: 21,
        defaultColumnWidth: 73,
        cellData: {},
      },
    },
    styles: {},
  };

  return JSON.stringify(workbook);
}

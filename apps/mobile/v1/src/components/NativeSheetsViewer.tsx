import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDefaultSheetZoomPreference } from '../lib/preferences';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Background colors for glass effect - exported for parent to use
export const GLASS_BG_DARK = 'rgba(255, 255, 255, 0.01)';
export const GLASS_BG_LIGHT = 'rgba(0, 0, 0, 0.01)';

// Sheet header background colors - exported for parent to match tab bar
export const SHEET_HEADER_BG_DARK = '#252629';
export const SHEET_HEADER_BG_LIGHT = '#f5f5f5';

// Excel date serial number range (1900-2099)
const MIN_DATE_SERIAL = 1;
const MAX_DATE_SERIAL = 73050;
// Heuristic range for auto-detecting dates (2000-2050)
const AUTO_DATE_MIN = 36526;
const AUTO_DATE_MAX = 54789;

// Alignment mappers - defined outside component to avoid recreation
const getHorizontalAlign = (ht?: number): 'flex-start' | 'center' | 'flex-end' => {
  switch (ht) {
    case 2: return 'center';
    case 3: return 'flex-end';
    default: return 'flex-start';
  }
};

const getVerticalAlign = (vt?: number): 'flex-start' | 'center' | 'flex-end' => {
  switch (vt) {
    case 1: return 'flex-start';
    case 3: return 'flex-end';
    default: return 'center';
  }
};

const getTextAlign = (ht?: number): 'left' | 'center' | 'right' => {
  switch (ht) {
    case 2: return 'center';
    case 3: return 'right';
    default: return 'left';
  }
};

// Types based on Univer's data structure
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

interface IRowData {
  h?: number;
  hd?: number;
}

interface IColumnData {
  w?: number;
  hd?: number;
}

interface IMergeCell {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

interface IWorksheetData {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  defaultRowHeight: number;
  defaultColumnWidth: number;
  cellData: { [row: string]: { [col: string]: ICellData } };
  rowData?: { [row: string]: IRowData };
  columnData?: { [col: string]: IColumnData };
  mergeData?: IMergeCell[];
}

interface IWorkbookData {
  id: string;
  name: string;
  sheetOrder: string[];
  sheets: { [sheetId: string]: Partial<IWorksheetData> };
  styles?: { [styleId: string]: IStyleData | null };
}

export interface SheetControlsData {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  sheetNames: string[];
  activeSheetIndex: number;
  hasMultipleSheets: boolean;
  tabBarHeight: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSelectSheet: (index: number) => void;
}

interface NativeSheetsViewerProps {
  content: string;
  theme: {
    colors: {
      foreground: string;
      mutedForeground: string;
      border: string;
      muted: string;
      background: string;
    };
    isDark: boolean;
  };
  onLoaded?: () => void;
  hideLoadingOverlay?: boolean;
  /** Extra top inset for sheet tabs when present */
  topInset?: number;
  /** Callback to provide sheet controls data to parent for rendering outside ScrollView */
  onControlsReady?: (controls: SheetControlsData) => void;
}

// Constants - match typical Excel/Sheets defaults (these are only used as last resort)
const BASE_ROW_HEIGHT = 21;
const BASE_COLUMN_WIDTH = 64;
const BASE_ROW_HEADER_WIDTH = 36;
const BASE_COLUMN_HEADER_HEIGHT = 20;
const HEADER_FONT_SIZE = 10;
const BUFFER = 30;
const MIN_ZOOM = 0.50;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Desktop reference width - Univer column widths are designed for desktop screens
const DESKTOP_REFERENCE_WIDTH = 550;
const MOBILE_SCALE_FACTOR = SCREEN_WIDTH / DESKTOP_REFERENCE_WIDTH;

// Excel epoch
const EXCEL_EPOCH = new Date(1899, 11, 30).getTime();

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isTimeOnlyFormat(pattern?: string): boolean {
  if (!pattern) return false;
  const lowerPattern = pattern.toLowerCase();
  // Time only if has h/s but no d/y (m is ambiguous - minutes vs months)
  const hasTime = lowerPattern.includes('h') || lowerPattern.includes('s');
  const hasDate = lowerPattern.includes('d') || lowerPattern.includes('y');
  return hasTime && !hasDate;
}

function formatTime(serial: number, pattern?: string): string {
  // Time is the fractional part of the serial number
  const timeFraction = serial % 1;
  const totalMinutes = Math.round(timeFraction * 24 * 60);
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const lowerPattern = pattern?.toLowerCase() || '';
  const use12Hour = lowerPattern.includes('am') || lowerPattern.includes('pm') || lowerPattern.includes('a/p');

  if (use12Hour) {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function excelSerialToFormatted(serial: number, pattern?: string): string {
  if (typeof serial !== 'number' || isNaN(serial)) {
    return String(serial);
  }

  // Check if this is time-only format (values typically < 1 or pattern indicates time)
  if (isTimeOnlyFormat(pattern)) {
    return formatTime(serial, pattern);
  }

  // For date serial numbers
  if (serial < MIN_DATE_SERIAL || serial > MAX_DATE_SERIAL) {
    return String(serial);
  }

  const date = new Date(EXCEL_EPOCH + serial * 24 * 60 * 60 * 1000);
  if (isNaN(date.getTime())) return String(serial);

  const lowerPattern = pattern?.toLowerCase() || '';

  // Check for time component in pattern
  const hasTime = lowerPattern.includes('h') || lowerPattern.includes('s');

  // Check for long day name format (dddd)
  const hasLongDay = lowerPattern.includes('dddd');
  // Check for long month name format (mmmm)
  const hasLongMonth = lowerPattern.includes('mmmm');
  // Check for short month name format (mmm but not mmmm)
  const hasShortMonth = /mmm(?!m)/.test(lowerPattern);
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();

  let dateStr = '';

  // Format like "Friday, December 26, 2025"
  if (hasLongDay && hasLongMonth) {
    dateStr = `${DAYS_FULL[dayOfWeek]}, ${MONTHS_FULL[month]} ${day}, ${year}`;
  }
  // Format like "Dec 26, 2025"
  else if (hasShortMonth) {
    dateStr = `${MONTHS_SHORT[month]} ${day}, ${year}`;
  }
  // Format like "December 26, 2025"
  else if (hasLongMonth) {
    dateStr = `${MONTHS_FULL[month]} ${day}, ${year}`;
  }
  // Default numeric format
  else {
    dateStr = `${month + 1}/${day}/${year}`;
  }

  // Add time if pattern includes time component
  if (hasTime) {
    const timeStr = formatTime(serial, pattern);
    return `${dateStr} ${timeStr}`;
  }

  return dateStr;
}

function isDateOrTimeFormat(pattern?: string): boolean {
  if (!pattern) return false;
  const lowerPattern = pattern.toLowerCase();
  return ['d', 'm', 'y', 'h', 's'].some(p => lowerPattern.includes(p));
}

export function NativeSheetsViewer({
  content,
  theme,
  onLoaded,
  hideLoadingOverlay,
  topInset = 0,
  onControlsReady,
}: NativeSheetsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Load saved zoom preference on mount
  useEffect(() => {
    const loadZoomPreference = async () => {
      try {
        const savedZoom = await getDefaultSheetZoomPreference();
        setZoom(savedZoom);
      } catch (error) {
        // Keep default zoom on error
        if (__DEV__) {
          console.error('Failed to load sheet zoom preference:', error);
        }
      }
    };
    loadZoomPreference();
  }, []);

  // Track scroll for virtualization only (not for header sync)
  const scrollXRef = useRef(0);
  const scrollYRef = useRef(0);
  const [, forceUpdate] = useState(0);

  // Animated values for smooth header sync
  const scrollXAnim = useRef(new Animated.Value(0)).current;
  const scrollYAnim = useRef(new Animated.Value(0)).current;
  const lastRenderX = useRef(0);
  const lastRenderY = useRef(0);

  // Scaled dimensions
  const ROW_HEADER_WIDTH = BASE_ROW_HEADER_WIDTH * zoom;
  const COLUMN_HEADER_HEIGHT = BASE_COLUMN_HEADER_HEIGHT * zoom;

  // Parse workbook
  const workbook = useMemo<IWorkbookData | null>(() => {
    try {
      const data = JSON.parse(content);
      return data as IWorkbookData;
    } catch {
      return null;
    }
  }, [content]);

  const sheetInfo = useMemo(() => {
    if (!workbook) return { names: ['Sheet1'], ids: ['sheet1'] };
    const { sheetOrder, sheets } = workbook;
    return {
      names: sheetOrder.map((id) => sheets[id]?.name || 'Sheet'),
      ids: sheetOrder,
    };
  }, [workbook]);

  const currentSheet = useMemo<Partial<IWorksheetData> | null>(() => {
    if (!workbook) return null;
    return workbook.sheets[sheetInfo.ids[activeSheetIndex]] || null;
  }, [workbook, sheetInfo.ids, activeSheetIndex]);

  // Find actual data bounds - show at least 50 rows and 15 columns for empty sheets
  const MIN_ROWS = 50;
  const MIN_COLS = 15;

  const dataBounds = useMemo(() => {
    if (!currentSheet?.cellData) return { maxRow: MIN_ROWS, maxCol: MIN_COLS };

    let maxRow = 0;
    let maxCol = 0;

    const cellData = currentSheet.cellData;
    for (const rowStr of Object.keys(cellData)) {
      const row = parseInt(rowStr, 10);
      if (isNaN(row)) continue;

      const rowData = cellData[rowStr];
      for (const colStr of Object.keys(rowData)) {
        const col = parseInt(colStr, 10);
        if (isNaN(col)) continue;

        const cell = rowData[colStr];
        if (cell?.v !== undefined && cell?.v !== null && cell?.v !== '') {
          maxRow = Math.max(maxRow, row);
          maxCol = Math.max(maxCol, col);
        }
      }
    }

    // Ensure minimum visible area for empty or small sheets
    // Add 10 extra rows beyond the data
    return {
      maxRow: Math.max(MIN_ROWS, maxRow + 10),
      maxCol: Math.max(MIN_COLS, maxCol + 2)
    };
  }, [currentSheet?.cellData]);

  // Calculate dimensions (scaled by zoom)
  // Use the sheet's default dimensions, falling back to our base constants only if not specified
  const { rowHeights, columnWidths, totalHeight, totalWidth } = useMemo(() => {
    if (!currentSheet) return { rowHeights: [], columnWidths: [], totalHeight: 0, totalWidth: 0 };

    const sheetDefaultHeight = currentSheet.defaultRowHeight || BASE_ROW_HEIGHT;
    const sheetDefaultWidth = currentSheet.defaultColumnWidth || BASE_COLUMN_WIDTH;

    const heights: number[] = [];
    const widths: number[] = [];

    for (let i = 0; i <= dataBounds.maxRow; i++) {
      const rd = currentSheet.rowData?.[String(i)];
      // Use row-specific height if set, otherwise use sheet's default
      const height = rd?.h !== undefined ? rd.h : sheetDefaultHeight;
      heights.push(rd?.hd === 1 ? 0 : height * zoom);
    }

    for (let i = 0; i <= dataBounds.maxCol; i++) {
      const cd = currentSheet.columnData?.[String(i)];
      // Use column-specific width if set, otherwise use sheet's default
      // Scale down from desktop reference width to mobile screen
      const width = cd?.w !== undefined ? cd.w : sheetDefaultWidth;
      const scaledWidth = width * MOBILE_SCALE_FACTOR;
      widths.push(cd?.hd === 1 ? 0 : scaledWidth * zoom);
    }

    return {
      rowHeights: heights,
      columnWidths: widths,
      totalHeight: heights.reduce((a, b) => a + b, 0),
      totalWidth: widths.reduce((a, b) => a + b, 0),
    };
  }, [currentSheet, dataBounds, zoom]);

  // Precompute positions
  const rowYPositions = useMemo(() => {
    const positions: number[] = [];
    let y = 0;
    for (let i = 0; i < rowHeights.length; i++) {
      positions.push(y);
      y += rowHeights[i];
    }
    return positions;
  }, [rowHeights]);

  const colXPositions = useMemo(() => {
    const positions: number[] = [];
    let x = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      positions.push(x);
      x += columnWidths[i];
    }
    return positions;
  }, [columnWidths]);

  const getStyle = useCallback((cell: ICellData | undefined): IStyleData | null => {
    if (!cell?.s) return null;
    if (typeof cell.s === 'string') return workbook?.styles?.[cell.s] || null;
    return cell.s as IStyleData;
  }, [workbook?.styles]);

  const getCellValue = useCallback((cell: ICellData | undefined, style: IStyleData | null): string => {
    if (!cell || cell.v === undefined || cell.v === null) return '';
    const value = cell.v;

    if (typeof value === 'number') {
      const pattern = style?.n?.pattern;
      // If pattern indicates date/time format
      if (pattern && isDateOrTimeFormat(pattern)) {
        return excelSerialToFormatted(value, pattern);
      }
      // Heuristic: numbers in typical date serial range without formula
      if (!cell.f && value >= AUTO_DATE_MIN && value <= AUTO_DATE_MAX) {
        return excelSerialToFormatted(value, pattern);
      }
      // Time-only values (fractional numbers < 1 with time pattern)
      if (!cell.f && value > 0 && value < 1 && pattern) {
        return formatTime(value, pattern);
      }
    }
    return String(value);
  }, []);

  const getColumnLabel = (index: number): string => {
    let label = '';
    let i = index;
    while (i >= 0) {
      label = String.fromCharCode(65 + (i % 26)) + label;
      i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, z + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, z - 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const handleSelectSheet = useCallback((index: number) => {
    setActiveSheetIndex(index);
  }, []);

  useEffect(() => {
    if (currentSheet) {
      setLoading(false);
      onLoaded?.();
    }
  }, [currentSheet, onLoaded]);

  const hasMultipleSheets = sheetInfo.names.length > 1;
  const borderColor = theme.isDark ? '#444' : '#ddd';
  const headerBg = theme.isDark ? '#252629' : '#f5f5f5';
  const cellBg = theme.colors.background;
  // Tabs are now at top (rendered by parent), so no bottom space needed
  const tabBarHeight = 0;

  // Notify parent about controls data so it can render glass controls outside ScrollView
  useEffect(() => {
    if (currentSheet && onControlsReady) {
      onControlsReady({
        zoom,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        sheetNames: sheetInfo.names,
        activeSheetIndex,
        hasMultipleSheets,
        tabBarHeight,
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onZoomReset: handleZoomReset,
        onSelectSheet: handleSelectSheet,
      });
    }
  }, [currentSheet, onControlsReady, zoom, sheetInfo.names, activeSheetIndex, hasMultipleSheets, tabBarHeight, handleZoomIn, handleZoomOut, handleZoomReset, handleSelectSheet]);

  if (!workbook || !currentSheet) {
    return (
      <View style={[styles.container, { backgroundColor: cellBg }]}>
        {loading && !hideLoadingOverlay ? (
          <View style={[styles.centered, { backgroundColor: cellBg }]}>
            <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
            <Text style={[styles.loadingText, { color: theme.colors.mutedForeground }]}>
              Loading Sheet
            </Text>
          </View>
        ) : (
          <View style={[styles.centered, { backgroundColor: cellBg }]}>
            <Text style={{ color: theme.colors.mutedForeground }}>
              Unable to load spreadsheet
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Calculate visible range based on current scroll
  const getVisibleRange = () => {
    const scrollX = scrollXRef.current;
    const scrollY = scrollYRef.current;

    // Find first visible row
    let accHeight = 0;
    let startRow = 0;
    for (let i = 0; i < rowHeights.length; i++) {
      if (accHeight + rowHeights[i] > scrollY) {
        startRow = i;
        break;
      }
      accHeight += rowHeights[i];
    }
    // Apply buffer but ensure we don't go below 0
    startRow = Math.max(0, startRow - BUFFER);

    // Find last visible row
    let endRow = startRow;
    accHeight = rowYPositions[startRow] || 0;
    for (let i = startRow; i < rowHeights.length; i++) {
      endRow = i;
      if (accHeight > scrollY + SCREEN_HEIGHT + 200) break;
      accHeight += rowHeights[i];
    }
    endRow = Math.min(rowHeights.length - 1, endRow + BUFFER);

    // Find first visible column
    let accWidth = 0;
    let startCol = 0;
    for (let i = 0; i < columnWidths.length; i++) {
      if (accWidth + columnWidths[i] > scrollX) {
        startCol = i;
        break;
      }
      accWidth += columnWidths[i];
    }
    startCol = Math.max(0, startCol - BUFFER);

    // Find last visible column
    let endCol = startCol;
    accWidth = colXPositions[startCol] || 0;
    for (let i = startCol; i < columnWidths.length; i++) {
      endCol = i;
      if (accWidth > scrollX + SCREEN_WIDTH + 200) break;
      accWidth += columnWidths[i];
    }
    endCol = Math.min(columnWidths.length - 1, endCol + BUFFER);

    return { startRow, endRow, startCol, endCol };
  };

  const visibleRange = getVisibleRange();

  // Build merge cell lookup: key is "row-col", value is merge info or 'skip' for non-start cells
  const mergeMap = useMemo(() => {
    const map = new Map<string, IMergeCell | 'skip'>();
    if (!currentSheet?.mergeData) return map;

    for (const merge of currentSheet.mergeData) {
      // Mark the start cell with the merge info
      map.set(`${merge.startRow}-${merge.startColumn}`, merge);
      // Mark all other cells in the merge as 'skip'
      for (let r = merge.startRow; r <= merge.endRow; r++) {
        for (let c = merge.startColumn; c <= merge.endColumn; c++) {
          if (r !== merge.startRow || c !== merge.startColumn) {
            map.set(`${r}-${c}`, 'skip');
          }
        }
      }
    }
    return map;
  }, [currentSheet?.mergeData]);

  // Get list of merged cells that need to be rendered (including those starting outside visible range)
  const getMergedCellsToRender = useCallback(() => {
    if (!currentSheet?.mergeData) return [];
    const { startRow, endRow, startCol, endCol } = visibleRange;

    return currentSheet.mergeData.filter(merge => {
      // Check if merge overlaps with visible range
      const overlapRow = merge.startRow <= endRow && merge.endRow >= startRow;
      const overlapCol = merge.startColumn <= endCol && merge.endColumn >= startCol;
      return overlapRow && overlapCol;
    });
  }, [currentSheet?.mergeData, visibleRange]);

  // Helper to render a single cell
  const renderCell = (row: number, col: number, mergeInfo?: IMergeCell) => {
    const cell = currentSheet?.cellData?.[row]?.[col];
    const style = getStyle(cell);
    const value = getCellValue(cell, style);
    const bgColor = style?.bg?.rgb || cellBg;
    const textColor = style?.cl?.rgb || theme.colors.foreground;

    // Default font size is 11 in Excel/Sheets
    const baseFontSize = style?.fs || 11;
    const fontSize = baseFontSize * zoom;

    // Calculate cell dimensions (expand if merged)
    let cellWidth = columnWidths[col] || 0;
    let cellHeight = rowHeights[row] || 0;
    if (mergeInfo) {
      // Sum up widths and heights for merged cells
      cellWidth = 0;
      cellHeight = 0;
      for (let c = mergeInfo.startColumn; c <= mergeInfo.endColumn; c++) {
        cellWidth += columnWidths[c] || 0;
      }
      for (let r = mergeInfo.startRow; r <= mergeInfo.endRow; r++) {
        cellHeight += rowHeights[r] || 0;
      }
    }

    // Check if text wrapping is enabled
    // Univer enum: 1=OVERFLOW, 2=WRAP, 3=CLIP (but some versions use different values)
    // Your data shows tb:3 for wrapped text, so check for both 2 and 3
    const isWrapped = style?.tb === 2 || style?.tb === 3;

    // Calculate available text width (cell width minus padding)
    const textWidth = cellWidth - 8; // 4px padding on each side

    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.cell,
          {
            position: 'absolute',
            left: colXPositions[col] || 0,
            top: rowYPositions[row] || 0,
            width: cellWidth,
            height: cellHeight,
            backgroundColor: bgColor,
            borderRightColor: borderColor,
            borderBottomColor: borderColor,
            justifyContent: getVerticalAlign(style?.vt),
            alignItems: getHorizontalAlign(style?.ht),
            zIndex: mergeInfo ? 2 : 0, // Merged cells on top
            overflow: 'hidden',
            paddingHorizontal: 4,
            paddingVertical: 2,
          },
        ]}
      >
        {isWrapped ? (
          <Text
            style={{
              fontSize,
              color: textColor,
              fontWeight: style?.bl === 1 ? 'bold' : 'normal',
              fontStyle: style?.it === 1 ? 'italic' : 'normal',
              fontFamily: style?.ff || undefined,
              textAlign: getTextAlign(style?.ht),
              textDecorationLine: style?.ul?.s === 1 ? 'underline' : style?.st?.s === 1 ? 'line-through' : 'none',
              width: textWidth,
            }}
          >
            {value}
          </Text>
        ) : (
          <Text
            style={{
              fontSize,
              color: textColor,
              fontWeight: style?.bl === 1 ? 'bold' : 'normal',
              fontStyle: style?.it === 1 ? 'italic' : 'normal',
              fontFamily: style?.ff || undefined,
              textAlign: getTextAlign(style?.ht),
              textDecorationLine: style?.ul?.s === 1 ? 'underline' : style?.st?.s === 1 ? 'line-through' : 'none',
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
        )}
      </View>
    );
  };

  // Render cells
  const renderCells = () => {
    const cells: React.ReactNode[] = [];
    const { startRow, endRow, startCol, endCol } = visibleRange;
    const renderedMerges = new Set<string>();

    // First, render merged cells that overlap with visible range
    const mergedCells = getMergedCellsToRender();
    for (const merge of mergedCells) {
      const key = `${merge.startRow}-${merge.startColumn}`;
      if (!renderedMerges.has(key)) {
        renderedMerges.add(key);
        cells.push(renderCell(merge.startRow, merge.startColumn, merge));
      }
    }

    // Then render regular cells in visible range
    for (let row = startRow; row <= endRow; row++) {
      const h = rowHeights[row];
      if (h === 0) continue;

      for (let col = startCol; col <= endCol; col++) {
        const w = columnWidths[col];
        if (w === 0) continue;

        // Check if this cell is part of a merge
        const mergeInfo = mergeMap.get(`${row}-${col}`);
        if (mergeInfo === 'skip') continue; // Skip non-start cells of a merge
        if (mergeInfo && typeof mergeInfo !== 'string') {
          // Already rendered as merged cell
          if (renderedMerges.has(`${row}-${col}`)) continue;
        }

        cells.push(renderCell(row, col));
      }
    }
    return cells;
  };

  // Render all column headers (scrolled via Animated transform)
  const renderColumnHeaders = () => {
    return columnWidths.map((w, col) => {
      if (w === 0) return null;
      return (
        <View
          key={`ch-${col}`}
          style={[
            styles.headerCell,
            {
              width: w,
              height: COLUMN_HEADER_HEIGHT,
              backgroundColor: headerBg,
              borderRightColor: borderColor,
              borderBottomColor: borderColor,
            },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.colors.mutedForeground, fontSize: HEADER_FONT_SIZE * zoom }]}>
            {getColumnLabel(col)}
          </Text>
        </View>
      );
    });
  };

  // Render all row headers (scrolled via Animated transform)
  const renderRowHeaders = () => {
    return rowHeights.map((h, row) => {
      if (h === 0) return null;
      return (
        <View
          key={`rh-${row}`}
          style={[
            styles.headerCell,
            {
              width: ROW_HEADER_WIDTH,
              height: h,
              backgroundColor: headerBg,
              borderRightColor: borderColor,
              borderBottomColor: borderColor,
            },
          ]}
        >
          <Text style={[styles.headerText, { color: theme.colors.mutedForeground, fontSize: HEADER_FONT_SIZE * zoom }]}>
            {row + 1}
          </Text>
        </View>
      );
    });
  };

  // Scroll event handler for virtualization re-renders
  const handleScrollEvent = useCallback((x: number, y: number) => {
    scrollXRef.current = x;
    scrollYRef.current = y;
    // Re-render when scrolled enough to need new cells, or when returning to start
    const needsRender =
      Math.abs(x - lastRenderX.current) > 10 ||
      Math.abs(y - lastRenderY.current) > 10 ||
      (y < 5 && lastRenderY.current >= 5) ||
      (x < 5 && lastRenderX.current >= 5);
    if (needsRender) {
      lastRenderX.current = x;
      lastRenderY.current = y;
      forceUpdate(n => n + 1);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: cellBg }]}>
      {loading && !hideLoadingOverlay && (
        <View style={[styles.loadingOverlay, { backgroundColor: cellBg }]}>
          <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
        </View>
      )}

      {/* Corner */}
      <View
        style={[
          styles.corner,
          {
            top: topInset,
            width: ROW_HEADER_WIDTH,
            height: COLUMN_HEADER_HEIGHT,
            backgroundColor: headerBg,
            borderRightColor: borderColor,
            borderBottomColor: borderColor,
          },
        ]}
      />

      {/* Column headers - synced via Animated transform */}
      <View style={[styles.columnHeaderWrapper, { top: topInset, left: ROW_HEADER_WIDTH, height: COLUMN_HEADER_HEIGHT }]}>
        <Animated.View
          style={{
            flexDirection: 'row',
            transform: [{ translateX: Animated.multiply(scrollXAnim, -1) }],
          }}
        >
          {renderColumnHeaders()}
        </Animated.View>
      </View>

      {/* Row headers - synced via Animated transform */}
      <View style={[styles.rowHeaderWrapper, { top: topInset + COLUMN_HEADER_HEIGHT, bottom: tabBarHeight, width: ROW_HEADER_WIDTH }]}>
        <Animated.View
          style={{
            transform: [{ translateY: Animated.multiply(scrollYAnim, -1) }],
          }}
        >
          {renderRowHeaders()}
        </Animated.View>
      </View>

      {/* Main scrollable grid */}
      <View style={[styles.gridContainer, { top: topInset + COLUMN_HEADER_HEIGHT, left: ROW_HEADER_WIDTH, bottom: tabBarHeight }]}>
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={1}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollXAnim } } }],
            {
              useNativeDriver: true,
              listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                handleScrollEvent(e.nativeEvent.contentOffset.x, scrollYRef.current);
              },
            }
          )}
        >
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={1}
            bounces={false}
            nestedScrollEnabled={true}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollYAnim } } }],
              {
                useNativeDriver: true,
                listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  handleScrollEvent(scrollXRef.current, e.nativeEvent.contentOffset.y);
                },
              }
            )}
            contentContainerStyle={{ height: totalHeight, width: totalWidth }}
          >
            <View style={{ width: totalWidth, height: totalHeight }}>
              {renderCells()}
            </View>
          </Animated.ScrollView>
        </Animated.ScrollView>
      </View>

      {/* Glass controls (zoom, tabs) are rendered by parent outside ScrollView for proper liquid glass */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  corner: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  columnHeaderWrapper: {
    position: 'absolute',
    right: 0,
    zIndex: 5,
    overflow: 'hidden',
  },
  rowHeaderWrapper: {
    position: 'absolute',
    left: 0,
    zIndex: 5,
    overflow: 'hidden',
  },
  gridContainer: {
    position: 'absolute',
    right: 0,
    overflow: 'hidden',
  },
  cell: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    fontWeight: '500',
  },
});

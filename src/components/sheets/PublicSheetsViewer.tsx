import { useEffect, useRef, useState, useId } from 'react';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US';
import {
  WorkbookEditablePermission,
  WorksheetSelectProtectedCellsPermission,
  WorksheetSelectUnProtectedCellsPermission,
} from '@univerjs/sheets';

import '@univerjs/preset-sheets-core/lib/index.css';

interface PublicSheetsViewerProps {
  content: string;
  darkMode?: boolean;
}

type LoadingState = 'loading' | 'ready' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkbookData = any;

const DEFAULT_WORKBOOK_DATA: WorkbookData = {
  id: 'workbook-1',
  name: 'Untitled Spreadsheet',
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Sheet1',
      rowCount: 100,
      columnCount: 26,
    },
  },
};

function parseWorkbookData(data: string): WorkbookData {
  if (!data) return DEFAULT_WORKBOOK_DATA;
  try {
    const parsed = JSON.parse(data);
    return parsed as WorkbookData;
  } catch {
    return DEFAULT_WORKBOOK_DATA;
  }
}

// Generate a content hash for cache key
function generateContentHash(content: string): string {
  // Use a simple but more reliable hash than just length + slice
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `${content.length}-${hash}`;
}

// Store instances in a Map keyed by unique instance ID to support multiple viewers
// This survives React strict mode while allowing multiple instances
interface ViewerInstance {
  univer: ReturnType<typeof createUniver>;
  contentHash: string;
}

const viewerInstances = new Map<string, ViewerInstance>();

export function PublicSheetsViewer({ content, darkMode = false }: PublicSheetsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState<string | null>(null);

  // Generate a stable unique ID for this component instance
  const instanceId = useId();

  // Toggle dark mode when it changes (without reinitializing)
  useEffect(() => {
    const instance = viewerInstances.get(instanceId);
    if (instance) {
      instance.univer.univerAPI.toggleDarkMode(darkMode);
    }
  }, [darkMode, instanceId]);

  // Initialize Univer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const contentHash = generateContentHash(content);
    const existingInstance = viewerInstances.get(instanceId);

    // Already initialized with same content - just make sure it's ready
    if (existingInstance && existingInstance.contentHash === contentHash) {
      setState('ready');
      return;
    }

    // Content changed or new instance - need to reinitialize
    if (existingInstance) {
      try {
        existingInstance.univer.univer.dispose();
      } catch {
        // Ignore disposal errors
      }
      viewerInstances.delete(instanceId);
    }

    setState('loading');
    setError(null);

    // Clear container
    container.innerHTML = '';

    try {
      const workbookData = parseWorkbookData(content);

      // Create Univer instance
      const univerInstance = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
        },
        darkMode,
        presets: [
          UniverSheetsCorePreset({
            container,
          }),
        ],
      });

      const { univerAPI } = univerInstance;

      // Create workbook with initial data
      const workbook = univerAPI.createWorkbook(workbookData);

      // Set workbook to read-only mode and disable cell selection
      if (workbook) {
        const unitId = workbook.getId();
        const permission = univerAPI.getPermission();
        if (permission && unitId) {
          // Disable editing
          permission.setWorkbookPermissionPoint(unitId, WorkbookEditablePermission, false);

          // Disable cell selection for all worksheets
          const sheets = workbook.getSheets();
          sheets.forEach((sheet) => {
            const sheetId = sheet.getSheetId();
            permission.setWorksheetPermissionPoint(unitId, sheetId, WorksheetSelectProtectedCellsPermission, false);
            permission.setWorksheetPermissionPoint(unitId, sheetId, WorksheetSelectUnProtectedCellsPermission, false);
          });
        }
      }

      viewerInstances.set(instanceId, {
        univer: univerInstance,
        contentHash,
      });
      setState('ready');
    } catch (err) {
      console.error('PublicSheetsViewer: Failed to initialize:', err);
      setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
      setState('error');
    }

    // Cleanup function - handles both strict mode and actual unmount
    return () => {
      // Don't dispose immediately in dev mode (React Strict Mode)
      // Use requestAnimationFrame to defer and check if container is actually gone
    };
  }, [content, darkMode, instanceId]);

  // Cleanup on actual page unload
  useEffect(() => {
    const container = containerRef.current;
    const currentInstanceId = instanceId;

    return () => {
      // This runs on actual unmount (not strict mode double-render)
      // We use requestAnimationFrame to let strict mode remount happen first
      requestAnimationFrame(() => {
        if (!document.body.contains(container)) {
          const instance = viewerInstances.get(currentInstanceId);
          if (instance) {
            try {
              instance.univer.univer.dispose();
            } catch {
              // Ignore disposal errors
            }
            viewerInstances.delete(currentInstanceId);
          }
        }
      });
    };
  }, [instanceId]);

  // Check if mobile/touch device
  const isMobile = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Mobile readonly mode: disable pointer events and implement custom touch scroll
  // Based on: https://github.com/dream-num/univer/discussions/2198
  useEffect(() => {
    if (!isMobile || state !== 'ready') return;

    const container = containerRef.current;
    const instance = viewerInstances.get(instanceId);
    if (!container || !instance) return;

    const { univerAPI } = instance.univer;
    const workbook = univerAPI.getActiveWorkbook();
    if (!workbook) return;

    // Disable pointer events on the Univer container to prevent keyboard
    container.style.pointerEvents = 'none';

    // Track touch state for scrolling
    let lastX = 0;
    let lastY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      lastX = touch.clientX;
      lastY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaX = lastX - touch.clientX;
      const deltaY = lastY - touch.clientY;
      lastX = touch.clientX;
      lastY = touch.clientY;

      // Execute scroll command
      try {
        const activeSheet = workbook.getActiveSheet();
        if (activeSheet) {
          univerAPI.executeCommand('sheet.operation.set-scroll', {
            unitId: workbook.getId(),
            sheetId: activeSheet.getSheetId(),
            offsetX: deltaX,
            offsetY: deltaY,
          });
        }
      } catch {
        // Ignore scroll errors
      }
    };

    // Add touch handlers to the parent (which still has pointer events)
    const parent = container.parentElement;
    if (parent) {
      parent.addEventListener('touchstart', handleTouchStart, { passive: true });
      parent.addEventListener('touchmove', handleTouchMove, { passive: true });
    }

    return () => {
      container.style.pointerEvents = '';
      if (parent) {
        parent.removeEventListener('touchstart', handleTouchStart);
        parent.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [isMobile, state, instanceId]);

  if (state === 'error') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-red-50 dark:bg-red-900/20">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Failed to load spreadsheet</p>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hide Univer permission dialogs and zoom slider */}
      <style>{`
        /* Hide zoom slider */
        .sheets-viewer-container [class*="zoom-slider"],
        .sheets-viewer-container [class*="zoomSlider"],
        .sheets-viewer-container input[type="range"],
        .sheets-viewer-container [class*="zoom-container"],
        .sheets-viewer-container [class*="zoomContainer"] {
          display: none !important;
        }

        /* Hide Univer permission dialogs - be specific to avoid hiding the sheet */
        .univer-dialog-container,
        .univer-confirm-dialog,
        .univer-message,
        .univer-notification,
        .univer-alert,
        .univer-message-wrapper,
        [role="dialog"],
        [role="alertdialog"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }

        /* Mobile readonly mode - disable all pointer events on Univer internals */
        @media (pointer: coarse) {
          .sheets-viewer-container .univer-app,
          .sheets-viewer-container .univer-container,
          .sheets-viewer-container [class*="univer-"],
          .sheets-viewer-container canvas {
            pointer-events: none !important;
          }
        }
      `}</style>
      <div className={`sheets-viewer-container relative h-full w-full overflow-hidden`}>
        {state === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-[#1a1a1a]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        <div
          ref={containerRef}
          className="h-full w-full"
        />
      </div>
    </>
  );
}

export default PublicSheetsViewer;

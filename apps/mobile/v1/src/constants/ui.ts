/**
 * Shared UI constants for consistent design across the app
 */

const SHARED_BORDER_RADIUS = 8;

export const NOTE_CARD = {
  BORDER_RADIUS: SHARED_BORDER_RADIUS,
  PADDING: 12,
  SPACING: 8,
  TITLE_SIZE: 17,
  PREVIEW_SIZE: 15,
  TIMESTAMP_SIZE: 13,
} as const;

export const FOLDER_CARD = {
  BORDER_RADIUS: SHARED_BORDER_RADIUS,
  PADDING: 12,
  SPACING: 8,
  NAME_SIZE: 14,
  COUNT_SIZE: 12,
} as const;

export const ACTION_BUTTON = {
  BORDER_RADIUS: SHARED_BORDER_RADIUS,
  PADDING: 12,
  ICON_SPACING: 12,
  TEXT_SIZE: 14,
} as const;

export const SECTION = {
  SPACING: 20,
} as const;

export const FOLDER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#78716c', '#1f2937', '#374151'
] as const;

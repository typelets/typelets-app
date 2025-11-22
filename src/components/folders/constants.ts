import { FileText, Star, Archive, Trash2, Globe } from 'lucide-react';

import type { ViewMode } from '@/types/note';

export const FOLDER_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#78716c',
  '#1f2937',
  '#374151',
] as const;

export const SPECIAL_VIEWS = [
  {
    id: 'all' as ViewMode,
    label: 'All Notes',
    icon: FileText,
  },
  {
    id: 'starred' as ViewMode,
    label: 'Starred',
    icon: Star,
  },
  {
    id: 'public' as ViewMode,
    label: 'Public',
    icon: Globe,
  },
  {
    id: 'archived' as ViewMode,
    label: 'Archived',
    icon: Archive,
  },
  {
    id: 'trash' as ViewMode,
    label: 'Trash',
    icon: Trash2,
  },
] as const;

export const DRAG_OPACITY = '0.5';
export const ANIMATION_DURATION = 200;

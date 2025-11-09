/**
 * Note utility functions
 */

import { isDiagramContent } from './noteTypeDetection';

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

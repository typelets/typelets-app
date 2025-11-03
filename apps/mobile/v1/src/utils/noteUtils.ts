/**
 * Note utility functions
 */

/**
 * Strip HTML tags and decode entities from HTML content
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

  // Remove extra whitespace and normalize
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

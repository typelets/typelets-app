/**
 * Cloudflare Worker for SSR Public Notes
 *
 * This worker intercepts requests to /p/* routes and returns
 * server-rendered HTML with full content for SEO.
 */

interface Env {
  API_URL: string;
  ENVIRONMENT: string;
}

interface PublicNote {
  slug: string;
  title: string;
  content: string;
  type?: 'note' | 'diagram' | 'code';
  authorName?: string;
  publishedAt: string;
  updatedAt: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Only handle /p/* routes
    if (!path.startsWith('/p/')) {
      // Pass through to origin (your SPA)
      return fetch(request);
    }

    // Extract slug from path
    const slug = path.replace('/p/', '').split('/')[0];

    if (!slug) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // Fetch note from your API
      const apiUrl = `${env.API_URL}/public-notes/${slug}`;
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        if (apiResponse.status === 404) {
          return generateErrorPage('Note Not Found', 'This note may have been unpublished or the link is incorrect.');
        }
        throw new Error('Failed to fetch note');
      }

      const note: PublicNote = await apiResponse.json();

      // Generate full HTML page
      const html = generateHTML(note, url.origin);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          // Cache for 1 hour in browser, 24 hours at edge
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          // Allow stale content while revalidating
          'CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          // Disable Cloudflare Web Analytics injection for /p/* routes
          'cf-disable-beacon': '1',
        },
      });
    } catch (error) {
      console.error('SSR Error:', error);
      return generateErrorPage('Error Loading Note', 'Something went wrong while loading this note. Please try again later.');
    }
  },
};

function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}

function stripHtmlTags(html: string): string {
  // Remove all < and > characters individually to extract plain text
  // Used only for meta description generation, not for HTML rendering
  return html.replace(/</g, '').replace(/>/g, '').trim();
}

function extractFirstImage(html: string): string | null {
  // Extract the first image src from HTML content
  // Matches both <img src="..."> and <img ... src="...">
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/i;
  const match = html.match(imgRegex);
  if (match && match[1]) {
    const src = match[1];
    // Skip base64 data URIs as they're too large for og:image
    if (src.startsWith('data:')) {
      return null;
    }
    return src;
  }
  return null;
}

function formatDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return 'Unknown date';
  }
}

function generateHTML(note: PublicNote, origin: string): string {
  const title = note.title ? `${escapeHtml(note.title)} - Typelets` : 'Typelets - Shared Note';
  const description = note.content
    ? escapeHtml(stripHtmlTags(note.content).slice(0, 160).trim()) + '...'
    : 'A note shared via Typelets';
  const noteUrl = `${origin}/p/${note.slug}`;

  // Extract first image from content, or use default OG image
  const contentImage = note.content ? extractFirstImage(note.content) : null;
  const ogImage = contentImage || `${origin}/og-image.png`;
  // Use summary_large_image if we have an image, otherwise summary
  const twitterCardType = contentImage ? 'summary_large_image' : 'summary';

  // Process content: strip sensitive data attributes
  let processedContent = note.content || '';
  processedContent = processedContent.replace(/data-note-id="[^"]*"/gi, '');
  processedContent = processedContent.replace(/data-note-link="[^"]*"/gi, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- SEO Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}" />
  ${note.authorName ? `<meta name="author" content="${escapeHtml(note.authorName)}" />` : ''}
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${noteUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${noteUrl}" />
  <meta property="og:site_name" content="Typelets" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:alt" content="${escapeHtml(note.title || 'Typelets Note')}" />
  ${note.authorName ? `<meta property="article:author" content="${escapeHtml(note.authorName)}" />` : ''}
  <meta property="article:published_time" content="${note.publishedAt}" />
  <meta property="article:modified_time" content="${note.updatedAt}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCardType}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:site" content="@typelets" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="${escapeHtml(note.title || 'Typelets Note')}" />

  <!-- Favicons -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" href="/favicon.ico" />

  <!-- Theme -->
  <meta name="theme-color" content="#3b82f6" />

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- Prevent flash + Theme Detection -->
  <style>
    :root {
      --background: #ffffff;
      --foreground: #111827;
    }
    html { background-color: #111827; color-scheme: dark; }
    html.light { background-color: #ffffff; color-scheme: light; }
    html.dark { background-color: #111827; color-scheme: dark; }
    body { margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }
  </style>
  <script>
    (function() {
      const storageKey = 'typelets-ui-theme';
      const theme = localStorage.getItem(storageKey) || 'system';
      let resolvedTheme = theme;
      if (theme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.add(resolvedTheme);
    })();
  </script>

  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapeHtml(note.title || 'Untitled Note')}",
    "description": "${description}",
    "url": "${noteUrl}",
    "image": "${ogImage}",
    "datePublished": "${note.publishedAt}",
    "dateModified": "${note.updatedAt}",
    ${note.authorName ? `"author": { "@type": "Person", "name": "${escapeHtml(note.authorName)}" },` : ''}
    "publisher": {
      "@type": "Organization",
      "name": "Typelets",
      "url": "https://typelets.com"
    }
  }
  </script>

  ${getStyles()}
</head>
<body>
  <div id="root">
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="sticky-header">
        <div class="header-content">
          <span class="header-text">
            <a href="https://typelets.com" target="_blank" rel="noopener noreferrer" class="header-link">Typelets</a> Shared Note
          </span>
          <button id="theme-toggle" class="theme-button" title="Toggle theme">
            <svg class="sun-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="moon-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- Content -->
      <main class="main-content">
        <article class="article">
          <h1 class="article-title">${escapeHtml(note.title || 'Untitled Note')}</h1>

          <div class="article-meta">
            ${note.authorName ? `
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>${escapeHtml(note.authorName)}</span>
            </div>
            ` : ''}
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Published ${formatDate(note.publishedAt)}</span>
            </div>
            ${note.updatedAt !== note.publishedAt ? `
            <span class="meta-updated">(Updated ${formatDate(note.updatedAt)})</span>
            ` : ''}
          </div>

          <div class="tiptap-content">
            ${processedContent}
          </div>
        </article>
      </main>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-content">
          <p>Shared via <a href="https://typelets.com" target="_blank" rel="noopener noreferrer" class="footer-link">Typelets</a></p>
        </div>
      </footer>
    </div>
  </div>

  <script>
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', function() {
      const html = document.documentElement;
      const isDark = html.classList.contains('dark');
      html.classList.remove('dark', 'light');
      html.classList.add(isDark ? 'light' : 'dark');
      localStorage.setItem('typelets-ui-theme', isDark ? 'light' : 'dark');
    });
  </script>
</body>
</html>`;
}

function getStyles(): string {
  return `<style>
    /* Base */
    .min-h-screen { min-height: 100vh; }
    .bg-gray-50 { background-color: #f9fafb; }
    .dark .bg-gray-50, html.dark .bg-gray-50 { background-color: #111827; }

    /* Header */
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid #e5e7eb;
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(8px);
    }
    html.dark .sticky-header {
      border-bottom-color: #1f2937;
      background-color: rgba(17, 24, 39, 0.8);
    }
    .header-content {
      max-width: 64rem;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
    }
    @media (min-width: 640px) { .header-content { padding: 16px; } }
    .header-text {
      font-size: 14px;
      font-weight: 500;
      color: #4b5563;
    }
    html.dark .header-text { color: #d1d5db; }
    .header-link {
      color: #2563eb;
      transition: color 0.15s;
    }
    .header-link:hover { color: #1d4ed8; }
    html.dark .header-link { color: #60a5fa; }
    html.dark .header-link:hover { color: #93c5fd; }
    .theme-button {
      padding: 8px;
      border-radius: 6px;
      color: #4b5563;
      background: none;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .theme-button:hover { background-color: #f3f4f6; }
    html.dark .theme-button { color: #d1d5db; }
    html.dark .theme-button:hover { background-color: #1f2937; }
    html.light .moon-icon { display: none; }
    html.dark .sun-icon { display: none; }

    /* Main */
    .main-content {
      max-width: 64rem;
      margin: 0 auto;
      padding: 16px 12px;
    }
    @media (min-width: 640px) { .main-content { padding: 32px 16px; } }
    .article {
      background-color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    @media (min-width: 640px) { .article { padding: 24px; } }
    @media (min-width: 768px) { .article { padding: 32px; } }
    html.dark .article { background-color: #1f2937; }
    .article-title {
      margin-bottom: 12px;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    @media (min-width: 640px) {
      .article-title { font-size: 30px; margin-bottom: 16px; }
    }
    html.dark .article-title { color: white; }
    .article-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #6b7280;
    }
    @media (min-width: 640px) {
      .article-meta { gap: 16px; font-size: 14px; margin-bottom: 32px; }
    }
    html.dark .article-meta { color: #9ca3af; }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .meta-updated { font-size: 12px; }

    /* Footer */
    .footer {
      border-top: 1px solid #e5e7eb;
      padding: 24px 0;
    }
    @media (min-width: 640px) { .footer { padding: 32px 0; } }
    html.dark .footer { border-top-color: #1f2937; }
    .footer-content {
      max-width: 64rem;
      margin: 0 auto;
      padding: 0 16px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    @media (min-width: 640px) { .footer-content { font-size: 14px; } }
    html.dark .footer-content { color: #9ca3af; }
    .footer-link {
      color: #2563eb;
    }
    .footer-link:hover { color: #1d4ed8; }
    html.dark .footer-link { color: #60a5fa; }
    html.dark .footer-link:hover { color: #93c5fd; }

    /* TipTap Content Styles */
    .tiptap-content {
      line-height: 1.6;
      font-size: 15px;
      color: #374151;
    }
    @media (min-width: 640px) { .tiptap-content { font-size: 16px; } }
    html.dark .tiptap-content { color: #e5e7eb; }
    .tiptap-content h1 { font-size: 2em; font-weight: bold; margin: 24px 0 12px 0; line-height: 1.2; color: #111827; }
    .tiptap-content h2 { font-size: 1.5em; font-weight: bold; margin: 20px 0 10px 0; line-height: 1.3; color: #111827; }
    .tiptap-content h3 { font-size: 1.25em; font-weight: bold; margin: 16px 0 8px 0; line-height: 1.4; color: #111827; }
    html.dark .tiptap-content h1, html.dark .tiptap-content h2, html.dark .tiptap-content h3 { color: white; }
    .tiptap-content p { margin: 12px 0; }
    .tiptap-content ul, .tiptap-content ol { margin: 12px 0; padding-left: 24px; }
    .tiptap-content li { margin: 6px 0; }
    .tiptap-content ul { list-style-type: disc; }
    .tiptap-content ol { list-style-type: decimal; }
    .tiptap-content blockquote {
      margin: 16px 0;
      padding-left: 16px;
      border-left: 4px solid #d1d5db;
      font-style: italic;
      color: #6b7280;
    }
    html.dark .tiptap-content blockquote { border-left-color: #4b5563; color: #9ca3af; }
    .tiptap-content code:not(pre code) {
      background-color: #f3f4f6;
      color: #1f2937;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }
    html.dark .tiptap-content code:not(pre code) { background-color: #374151; color: #e5e7eb; }
    .tiptap-content pre {
      background-color: #ffffff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      margin: 16px 0;
      overflow: hidden;
      padding: 16px;
    }
    html.dark .tiptap-content pre { background-color: #1f2937; border-color: #374151; }
    .tiptap-content pre code {
      display: block;
      background: transparent;
      color: #374151;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre;
    }
    html.dark .tiptap-content pre code { color: #e5e7eb; }
    .tiptap-content a { color: #2563eb; text-decoration: underline; }
    .tiptap-content a:hover { color: #1d4ed8; }
    html.dark .tiptap-content a { color: #60a5fa; }
    html.dark .tiptap-content a:hover { color: #93c5fd; }
    .tiptap-content hr { border: none; border-top: 1px solid #d1d5db; margin: 24px 0; }
    html.dark .tiptap-content hr { border-top-color: #4b5563; }
    .tiptap-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
    .tiptap-content strong { font-weight: bold; }
    .tiptap-content em { font-style: italic; }
    .tiptap-content mark { background-color: #fef08a; padding: 1px 4px; border-radius: 2px; }
    html.dark .tiptap-content mark { background-color: #854d0e; color: #fef9c3; }

    /* Task lists */
    .tiptap-content ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    .tiptap-content li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 8px; }
    .tiptap-content li[data-type="taskItem"][data-checked="true"] > div { text-decoration: line-through; opacity: 0.6; }
  </style>`;
}

function generateErrorPage(title: string, message: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Typelets</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #111827; }
      .container { color: white; }
      .message { color: #9ca3af; }
    }
    .container { max-width: 400px; text-align: center; padding: 20px; }
    .icon { color: #ef4444; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
    .message { color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <svg class="icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <h1>${title}</h1>
    <p class="message">${message}</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: title === 'Note Not Found' ? 404 : 500,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
    },
  });
}

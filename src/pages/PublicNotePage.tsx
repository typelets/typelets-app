import { useEffect, useState, useRef } from 'react';
import { Calendar, User, AlertCircle, Sun, Moon, ArrowUp } from 'lucide-react';
import type { ApiPublicNote } from '@/lib/api/api';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import markdown from 'highlight.js/lib/languages/markdown';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', html);
hljs.registerLanguage('xml', html);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('php', php);
hljs.registerLanguage('markdown', markdown);

type Theme = 'light' | 'dark';

// Note: Public notes API endpoint doesn't require authentication
const VITE_API_URL = import.meta.env.VITE_API_URL as string;

// TipTap content styles for proper rendering
const tiptapContentStyles = `
.tiptap-content {
  line-height: 1.6;
  font-size: 15px;
  color: inherit;
}

@media (min-width: 640px) {
  .tiptap-content {
    font-size: 16px;
  }
}

.tiptap-content h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 24px 0 12px 0;
  line-height: 1.2;
}

.tiptap-content h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 20px 0 10px 0;
  line-height: 1.3;
}

.tiptap-content h3 {
  font-size: 1.25em;
  font-weight: bold;
  margin: 16px 0 8px 0;
  line-height: 1.4;
}

.tiptap-content p {
  margin: 12px 0;
}

/* Line breaks */
.tiptap-content br {
  display: block;
  content: "";
  margin-top: 0.5em;
}

.tiptap-content p:empty::before {
  content: "\\00a0";
}

.tiptap-content ul,
.tiptap-content ol {
  margin: 12px 0;
  padding-left: 24px;
}

.tiptap-content li {
  margin: 6px 0;
}

.tiptap-content ul {
  list-style-type: disc;
}

.tiptap-content ol {
  list-style-type: decimal;
}

/* Highlight styles */
.tiptap-content mark {
  background-color: #fef08a;
  padding: 1px 4px;
  border-radius: 2px;
}

.dark .tiptap-content mark {
  background-color: #854d0e;
  color: #fef9c3;
}

/* Task List Styles */
.tiptap-content .task-list,
.tiptap-content ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
  margin: 12px 0;
}

.tiptap-content .task-item,
.tiptap-content li[data-type="taskItem"] {
  display: flex;
  align-items: flex-start;
  margin: 6px 0;
  padding-left: 0;
  line-height: 1.6;
}

.tiptap-content .task-item > label,
.tiptap-content li[data-type="taskItem"] > label {
  margin-right: 8px;
  margin-top: 2px;
  cursor: default;
  user-select: none;
  display: flex;
  align-items: center;
}

.tiptap-content .task-item > label input[type="checkbox"],
.tiptap-content li[data-type="taskItem"] > label input[type="checkbox"] {
  margin: 0;
  width: 16px;
  height: 16px;
  accent-color: #3b82f6;
}

.tiptap-content .task-item > div,
.tiptap-content li[data-type="taskItem"] > div {
  flex: 1;
  min-width: 0;
}

.tiptap-content .task-item[data-checked="true"] > div,
.tiptap-content li[data-type="taskItem"][data-checked="true"] > div {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Blockquote */
.tiptap-content blockquote {
  margin: 16px 0;
  padding-left: 16px;
  border-left: 4px solid #d1d5db;
  font-style: italic;
  color: #6b7280;
}

.dark .tiptap-content blockquote {
  border-left-color: #4b5563;
  color: #9ca3af;
}

/* Inline code */
.tiptap-content code:not(pre code) {
  background-color: #f3f4f6;
  color: #1f2937;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9em;
}

.dark .tiptap-content code:not(pre code) {
  background-color: #374151;
  color: #e5e7eb;
}

/* Code Block Styles */
.tiptap-content pre {
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
  position: relative;
  padding: 0;
}

.dark .tiptap-content pre {
  background-color: #1f2937;
  border-color: #374151;
}

/* Code block header with macOS-style dots */
.tiptap-content pre::before {
  content: attr(data-language);
  display: block;
  background: #f5f5f5;
  border-bottom: 1px solid #e5e5e5;
  padding: 8px 12px 8px 50px;
  font-size: 0.7rem;
  font-weight: 500;
  color: #666666;
  text-transform: capitalize;
  font-family: system-ui, -apple-system, sans-serif;
  position: relative;
  min-height: 32px;
  line-height: 16px;
}

@media (min-width: 640px) {
  .tiptap-content pre::before {
    padding: 8px 16px 8px 60px;
    font-size: 0.75rem;
    min-height: 36px;
    line-height: 20px;
  }
}

.dark .tiptap-content pre::before {
  background: #374151;
  border-bottom-color: #4b5563;
  color: #9ca3af;
}

/* macOS-style colored dots */
.tiptap-content pre::after {
  content: "";
  position: absolute;
  top: 11px;
  left: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 15px 0 0 #f59e0b, 30px 0 0 #22c55e;
}

@media (min-width: 640px) {
  .tiptap-content pre::after {
    top: 12px;
    left: 16px;
    width: 12px;
    height: 12px;
    box-shadow: 18px 0 0 #f59e0b, 36px 0 0 #22c55e;
  }
}

.tiptap-content pre code {
  display: block;
  background: transparent;
  padding: 12px;
  border-radius: 0;
  color: #374151;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  overflow-x: auto;
  margin: 0;
  white-space: pre;
}

@media (min-width: 640px) {
  .tiptap-content pre code {
    padding: 16px;
    font-size: 0.875rem;
    line-height: 1.6;
  }
}

.dark .tiptap-content pre code {
  color: #e5e7eb;
}

/* Syntax highlighting */
.tiptap-content pre .hljs-comment,
.tiptap-content pre .hljs-quote {
  color: #6b7280;
  font-style: italic;
}

.tiptap-content pre .hljs-keyword,
.tiptap-content pre .hljs-selector-tag,
.tiptap-content pre .hljs-title {
  color: #7c3aed;
  font-weight: 600;
}

.tiptap-content pre .hljs-string,
.tiptap-content pre .hljs-attr {
  color: #059669;
}

.tiptap-content pre .hljs-number,
.tiptap-content pre .hljs-literal {
  color: #d97706;
}

.tiptap-content pre .hljs-function,
.tiptap-content pre .hljs-title.function_ {
  color: #2563eb;
}

.tiptap-content pre .hljs-variable,
.tiptap-content pre .hljs-template-variable {
  color: #dc2626;
}

.tiptap-content pre .hljs-built_in,
.tiptap-content pre .hljs-type {
  color: #7c2d12;
}

.tiptap-content pre .hljs-operator,
.tiptap-content pre .hljs-punctuation {
  color: #6b7280;
}

/* Links */
.tiptap-content a {
  color: #2563eb;
  text-decoration: underline;
}

.tiptap-content a:hover {
  color: #1d4ed8;
}

.dark .tiptap-content a {
  color: #60a5fa;
}

.dark .tiptap-content a:hover {
  color: #93c5fd;
}

/* Note links */
.tiptap-content a[data-note-link] {
  color: #8b5cf6;
  text-decoration: none;
  background-color: #f5f3ff;
  padding: 1px 4px;
  border-radius: 4px;
}

.dark .tiptap-content a[data-note-link] {
  color: #a78bfa;
  background-color: #1e1b4b;
}

/* Horizontal rule */
.tiptap-content hr {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 24px 0;
}

.dark .tiptap-content hr {
  border-top-color: #4b5563;
}

/* Images */
.tiptap-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  display: block;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Strong and emphasis */
.tiptap-content strong {
  font-weight: bold;
}

.tiptap-content em {
  font-style: italic;
}

/* Strikethrough */
.tiptap-content s {
  text-decoration: line-through;
}

/* Underline */
.tiptap-content u {
  text-decoration: underline;
}

/* Table of Contents Styles */
.tiptap-content .toc-container {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.dark .tiptap-content .toc-container {
  background-color: #1f2937;
  border-color: #374151;
}

.tiptap-content .toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  text-align: left;
  font-family: inherit;
}

.tiptap-content .toc-header.toc-toggle {
  padding-bottom: 0;
  border-bottom: none;
  margin-bottom: 0;
}

.tiptap-content .toc-container:not(.toc-collapsed) .toc-header.toc-toggle {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .tiptap-content .toc-container:not(.toc-collapsed) .toc-header.toc-toggle {
  border-bottom-color: #374151;
}

.tiptap-content .toc-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tiptap-content .toc-chevron {
  transition: transform 0.2s ease;
  color: #6b7280;
}

.dark .tiptap-content .toc-chevron {
  color: #9ca3af;
}

.tiptap-content .toc-container:not(.toc-collapsed) .toc-chevron {
  transform: rotate(90deg);
}

/* Collapsed state - hide items */
.tiptap-content .toc-container.toc-collapsed .toc-items {
  display: none !important;
}

/* Expanded state - show items */
.tiptap-content .toc-container:not(.toc-collapsed) .toc-items {
  display: flex !important;
}

.tiptap-content .toc-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.dark .tiptap-content .toc-title {
  color: #f3f4f6;
}

.tiptap-content .toc-count {
  font-size: 0.75rem;
  color: #6b7280;
}

.dark .tiptap-content .toc-count {
  color: #9ca3af;
}

.tiptap-content .toc-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tiptap-content .toc-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  text-decoration: none;
  color: #374151;
  font-size: 0.875rem;
  transition: background-color 0.15s;
}

.tiptap-content .toc-item:hover {
  background-color: #f3f4f6;
}

.dark .tiptap-content .toc-item {
  color: #e5e7eb;
}

.dark .tiptap-content .toc-item:hover {
  background-color: #374151;
}

.tiptap-content .toc-item.toc-level-2 {
  padding-left: 24px;
}

.tiptap-content .toc-item.toc-level-3 {
  padding-left: 40px;
  color: #6b7280;
}

.dark .tiptap-content .toc-item.toc-level-3 {
  color: #9ca3af;
}

.tiptap-content .toc-bullet {
  color: #9ca3af;
  margin-right: 4px;
}

.tiptap-content .toc-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tiptap-content .toc-empty {
  background-color: #f9fafb;
}

.dark .tiptap-content .toc-empty {
  background-color: #1f2937;
}

.tiptap-content .toc-empty-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 0.875rem;
}

.dark .tiptap-content .toc-empty-message {
  color: #9ca3af;
}
`;

async function fetchPublicNote(slug: string): Promise<ApiPublicNote> {
  const url = `${VITE_API_URL.replace(/\/$/, '')}/public-notes/${slug}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Note not found');
    }
    throw new Error('Failed to load note');
  }

  return response.json();
}

// Get initial theme from system preference
const getSystemTheme = (): Theme => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function PublicNotePage() {
  const [note, setNote] = useState<ApiPublicNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(getSystemTheme);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [processedContent, setProcessedContent] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Get slug from URL
  const slug = window.location.pathname.split('/p/')[1];

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch note
  useEffect(() => {
    if (!slug) {
      setError('Invalid note URL');
      setLoading(false);
      return;
    }

    fetchPublicNote(slug)
      .then((data) => {
        setNote(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load note');
        setLoading(false);
      });
  }, [slug]);

  // Process content: add heading IDs, generate TOC, and sanitize sensitive data
  useEffect(() => {
    if (!note?.content) {
      setProcessedContent('');
      return;
    }

    let content = note.content;

    // SECURITY: Strip internal note IDs from note links
    // Convert note links to plain styled text without exposing internal IDs
    content = content.replace(/data-note-id="[^"]*"/gi, '');

    // Also remove any other potential data attributes that might leak info
    content = content.replace(/data-note-link="[^"]*"/gi, '');

    // Parse headings and add IDs
    const headingRegex = /<(h[1-3])([^>]*)>(.*?)<\/\1>/gi;
    const headings: Array<{ level: number; text: string; id: string }> = [];
    let headingIndex = 0;

    content = content.replace(headingRegex, (match, tag, attrs, text) => {
      const level = parseInt(tag.charAt(1));
      const id = `heading-${headingIndex}`;
      const plainText = text.replace(/<[^>]*>/g, ''); // Strip HTML tags from heading text
      headings.push({ level, text: plainText, id });
      headingIndex++;
      return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
    });

    // Generate TOC HTML for any [data-toc] placeholders
    if (content.includes('data-toc')) {
      let tocHtml: string;

      if (headings.length === 0) {
        tocHtml = `
          <div class="toc-container toc-empty">
            <div class="toc-empty-message">
              <span>No headings found in this document.</span>
            </div>
          </div>
        `;
      } else {
        const tocItems = headings.map(({ level, text, id }) => {
          const indent = level === 1 ? '' : level === 2 ? 'toc-level-2' : 'toc-level-3';
          const bullet = level === 1 ? '' : level === 2 ? '• ' : '◦ ';
          return `
            <a href="#${id}" class="toc-item ${indent}">
              <span class="toc-bullet">${bullet}</span>
              <span class="toc-text">${text}</span>
            </a>
          `;
        }).join('');

        // Default to collapsed state
        tocHtml = `
          <div class="toc-container toc-collapsed" data-toc-interactive>
            <button class="toc-header toc-toggle" type="button" aria-expanded="false">
              <div class="toc-header-left">
                <svg class="toc-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span class="toc-title">Table of Contents</span>
              </div>
              <span class="toc-count">${headings.length} sections</span>
            </button>
            <div class="toc-items">
              ${tocItems}
            </div>
          </div>
        `;
      }

      // Replace all data-toc placeholders (handles both self-closing and with content)
      content = content.replace(/<div[^>]*data-toc[^>]*>[\s\S]*?<\/div>/gi, tocHtml);
    }

    // SECURITY: Sanitize HTML to prevent XSS attacks
    // Configure DOMPurify to allow safe HTML elements and attributes
    const sanitizedContent = DOMPurify.sanitize(content, {
      ADD_TAGS: ['style'], // Allow inline styles from TipTap
      ADD_ATTR: [
        'data-toc',
        'data-toc-interactive',
        'data-type',
        'data-checked',
        'data-language',
        'data-note-link', // Allow note link styling (IDs already stripped)
        'target', // For links opening in new tabs
        'rel', // For security attributes on links
      ],
      ALLOW_DATA_ATTR: false, // Disable all data-* except those explicitly added
    });

    setProcessedContent(sanitizedContent);
  }, [note?.content]);

  // SEO: Update document title and meta tags
  useEffect(() => {
    if (!note) {
      document.title = 'Typelets - Shared Note';
      return;
    }

    // Set page title
    const title = note.title ? `${note.title} - Typelets` : 'Typelets - Shared Note';
    document.title = title;

    // Set meta description
    const description = note.content
      ? note.content.replace(/<[^>]*>/g, '').slice(0, 160).trim() + '...'
      : 'A note shared via Typelets';

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'article' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:site_name', content: 'Typelets' },
    ];

    ogTags.forEach(({ property, content }) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    twitterTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    });

    // Author meta if available
    if (note.authorName) {
      let metaAuthor = document.querySelector('meta[name="author"]');
      if (!metaAuthor) {
        metaAuthor = document.createElement('meta');
        metaAuthor.setAttribute('name', 'author');
        document.head.appendChild(metaAuthor);
      }
      metaAuthor.setAttribute('content', note.authorName);
    }
  }, [note]);

  // Apply syntax highlighting and setup TOC toggle after content loads
  useEffect(() => {
    if (!processedContent || !contentRef.current) return;

    // Find all code blocks and highlight them
    const codeBlocks = contentRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      // Skip if already highlighted
      if (block.classList.contains('hljs')) return;

      // Get language from class or parent's data attribute
      const pre = block.parentElement;
      let language = pre?.getAttribute('data-language') || '';

      // Also check for language- class
      const classMatch = block.className.match(/language-(\w+)/);
      if (classMatch) {
        language = classMatch[1];
      }

      if (language && hljs.getLanguage(language)) {
        const result = hljs.highlight(block.textContent || '', { language });
        block.innerHTML = result.value;
        block.classList.add('hljs');
      } else {
        // Auto-detect language
        const result = hljs.highlightAuto(block.textContent || '');
        block.innerHTML = result.value;
        block.classList.add('hljs');
        // Set detected language on pre element
        if (result.language && pre) {
          pre.setAttribute('data-language', result.language);
        }
      }
    });

  }, [processedContent]);

  // Setup TOC toggle using event delegation
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if click is within TOC header area
      const toggleBtn = target.closest('.toc-toggle') || target.closest('.toc-header');

      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();

        const tocContainer = toggleBtn.closest('.toc-container');

        if (tocContainer) {
          tocContainer.classList.toggle('toc-collapsed');
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [processedContent]);

  const toggleTheme = () => {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  };

  const ThemeIcon = () => {
    return theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
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
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-gray-600 dark:text-gray-400">Loading note...</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {error === 'Note not found' ? 'Note Not Found' : 'Error Loading Note'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error === 'Note not found'
              ? 'This note may have been unpublished or the link is incorrect.'
              : 'Something went wrong while loading this note. Please try again later.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:py-4">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            <a href="https://typelets.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">Typelets</a> Shared Note
          </span>
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <ThemeIcon />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-8">
        <article className="rounded-lg bg-white p-4 sm:p-6 md:p-8 shadow-sm dark:bg-gray-800">
          {/* Title */}
          <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {note.title || 'Untitled Note'}
          </h1>

          {/* Meta */}
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {note.authorName && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{note.authorName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Published {formatDate(note.publishedAt)}</span>
            </div>
            {note.updatedAt !== note.publishedAt && (
              <span className="text-xs">
                (Updated {formatDate(note.updatedAt)})
              </span>
            )}
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="tiptap-content"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        </article>
      </main>

      {/* TipTap content styles */}
      <style dangerouslySetInnerHTML={{ __html: tiptapContentStyles }} />

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 sm:py-8 dark:border-gray-800">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <p>Shared via <a href="https://typelets.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">Typelets</a></p>
        </div>
      </footer>

      {/* Scroll to top FAB - hidden on mobile */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="hidden sm:flex fixed bottom-6 right-6 z-50 h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95 dark:bg-blue-500 dark:hover:bg-blue-600"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

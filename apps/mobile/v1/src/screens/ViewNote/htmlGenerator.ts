/**
 * Generate HTML content for WebView with proper styling
 * Used for read-only note viewing with rich text formatting
 */
export function generateNoteHtml(
  content: string,
  themeColors: {
    background: string;
    foreground: string;
    mutedForeground: string;
    muted: string;
    primary: string;
  },
  isDark: boolean = false
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', (event) => {
          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });

          // Fix tables: wrap in scrollable div and normalize styling
          document.querySelectorAll('table').forEach((table) => {
            if (!table.parentElement.classList.contains('table-wrapper')) {
              const wrapper = document.createElement('div');
              wrapper.className = 'table-wrapper';
              table.parentNode.insertBefore(wrapper, table);
              wrapper.appendChild(table);
            }
            table.removeAttribute('style');
            table.querySelectorAll('col').forEach((col) => {
              col.removeAttribute('style');
              col.removeAttribute('width');
            });
          });

          // Fix table cell alignment and remove fixed widths
          document.querySelectorAll('th, td').forEach((cell) => {
            cell.removeAttribute('colwidth');
            const style = cell.getAttribute('style') || '';
            const alignMatch = style.match(/text-align:\\s*(left|center|right|justify)/i);
            cell.removeAttribute('style');
            if (alignMatch) {
              const alignment = alignMatch[1];
              cell.style.textAlign = alignment;
              cell.querySelectorAll('p').forEach((p) => {
                p.style.textAlign = alignment;
              });
            }
            cell.querySelectorAll('*').forEach((el) => {
              if (el.style) {
                el.style.fontSize = '';
                el.style.width = '';
              }
            });
          });
        });
      </script>
      <style>
        * {
          box-sizing: border-box;
        }
        html {
          height: 100%;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: ${themeColors.foreground};
          background-color: ${themeColors.background};
          padding: 0 16px 16px 16px;
          margin: 0;
          max-width: 100vw;
          min-height: 100%;
        }
        p {
          margin: 0 0 16px 0;
        }
        p:first-child {
          margin-top: 0;
        }
        h1, h2, h3, h4, h5, h6 {
          margin: 24px 0 16px 0;
          font-weight: 600;
        }
        h1:first-child, h2:first-child, h3:first-child, h4:first-child, h5:first-child, h6:first-child {
          margin-top: 0;
        }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.25em; }
        ul, ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        li {
          margin: 4px 0;
        }
        /* Task list styling - unified and simple */
        ul[data-type="taskList"] {
          list-style: none !important;
          padding-left: 0 !important;
          margin: 16px 0 !important;
        }
        li[data-type="taskItem"] {
          display: flex !important;
          align-items: center !important;
          margin: 4px 0 !important;
        }
        li[data-type="taskItem"] label {
          display: contents !important;
        }
        /* Hide the empty span that Tiptap adds */
        li[data-type="taskItem"] label > span {
          display: none !important;
        }
        li[data-type="taskItem"] input[type="checkbox"] {
          width: 16px !important;
          height: 16px !important;
          min-width: 16px !important;
          min-height: 16px !important;
          margin: 0 8px 0 0 !important;
          flex-shrink: 0 !important;
        }
        li[data-type="taskItem"] > div,
        li[data-type="taskItem"] > p {
          flex: 1 !important;
          line-height: 1.6 !important;
          margin: 0 !important;
        }
        /* Remove p tag margins inside task items */
        li[data-type="taskItem"] p {
          margin: 0 !important;
          line-height: 1.6 !important;
        }
        strong {
          font-weight: 600;
        }
        em {
          font-style: italic;
        }
        a {
          color: ${themeColors.primary};
          text-decoration: none;
        }
        blockquote {
          border-left: 4px solid ${themeColors.primary};
          margin: 16px 0;
          padding-left: 16px;
          font-style: italic;
          color: ${themeColors.mutedForeground};
        }
        code {
          background-color: ${themeColors.muted};
          color: ${isDark ? themeColors.foreground : '#000000'};
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        pre {
          background-color: ${themeColors.muted};
          color: ${isDark ? themeColors.foreground : '#000000'};
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          max-width: calc(100vw - 32px);
          margin: 16px 0;
        }
        pre code {
          display: block;
          white-space: pre;
          font-family: 'Courier New', Consolas, Monaco, monospace;
          font-size: 14px;
          line-height: 1.5;
          color: ${isDark ? themeColors.foreground : '#000000'};
        }
        .hljs {
          background: ${themeColors.muted} !important;
        }

        /* Override syntax highlighting colors for light theme with darker, readable colors */
        ${!isDark ? `
        .hljs {
          color: #000000 !important;
        }
        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-literal,
        .hljs-tag {
          color: #0033cc !important;
        }
        .hljs-string,
        .hljs-title,
        .hljs-section,
        .hljs-attribute,
        .hljs-attr {
          color: #008000 !important;
        }
        .hljs-number,
        .hljs-regexp {
          color: #cc0000 !important;
        }
        .hljs-comment,
        .hljs-quote {
          color: #555555 !important;
          font-style: italic !important;
        }
        .hljs-function,
        .hljs-name,
        .hljs-built_in {
          color: #6600cc !important;
        }
        .hljs-variable,
        .hljs-template-variable {
          color: #cc6600 !important;
        }
        ` : ''}

        /* Table wrapper for horizontal scroll */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 16px 0;
        }

        /* Tables */
        table {
          border-collapse: collapse;
          width: auto;
          min-width: 100%;
          table-layout: auto;
        }

        th, td {
          border: 1px solid ${themeColors.muted} !important;
          padding: 8px 12px !important;
          text-align: left;
          vertical-align: top;
          font-size: 16px !important;
          white-space: nowrap;
        }

        /* Allow text wrapping for cells with longer content */
        td p, th p {
          white-space: normal;
          min-width: 120px;
        }

        th {
          background-color: ${themeColors.muted} !important;
          font-weight: 600;
        }

        /* Force consistent font-size inside table cells */
        th *, td *,
        th p, td p,
        th span, td span {
          font-size: 16px !important;
          margin: 0 !important;
        }

        /* Remove default margins from p inside table cells and inherit alignment */
        th p, td p {
          text-align: inherit !important;
        }

        /* Scrollbar styling */
        pre::-webkit-scrollbar {
          height: 6px;
        }
        pre::-webkit-scrollbar-thumb {
          background: ${themeColors.foreground}30;
          border-radius: 3px;
        }
      </style>
      <script>
        // Enable horizontal scrolling on code blocks
        document.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('pre').forEach(pre => {
            let startX, startY, scrollLeft;
            let isDragging = false;
            let direction = null;

            pre.addEventListener('touchstart', (e) => {
              startX = e.touches[0].clientX;
              startY = e.touches[0].clientY;
              scrollLeft = pre.scrollLeft;
              isDragging = false;
              direction = null;
            }, { passive: true });

            pre.addEventListener('touchmove', (e) => {
              const currentX = e.touches[0].clientX;
              const currentY = e.touches[0].clientY;
              const diffX = startX - currentX;
              const diffY = startY - currentY;

              // Determine scroll direction on first move
              if (direction === null && (Math.abs(diffX) > 3 || Math.abs(diffY) > 3)) {
                direction = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical';
              }

              // If horizontal scroll, handle it and prevent default
              if (direction === 'horizontal') {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                pre.scrollLeft = scrollLeft + diffX;
              }
            }, { passive: false });

            pre.addEventListener('touchend', () => {
              isDragging = false;
              direction = null;
            });
          });
        });
      </script>
    </head>
    <body>
      ${content || '<p>No content</p>'}
    </body>
    </html>
  `;
}

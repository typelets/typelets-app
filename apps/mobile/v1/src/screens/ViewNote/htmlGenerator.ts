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
  }
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: ${themeColors.foreground};
          background-color: ${themeColors.background};
          padding: 0 16px 16px 16px;
          margin: 0;
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
        /* Task list styling */
        ul[data-type="taskList"] {
          list-style: none !important;
          padding-left: 0 !important;
          margin: 16px 0 !important;
        }
        li[data-type="taskItem"] {
          display: flex !important;
          align-items: flex-start !important;
          margin: 8px 0 !important;
        }
        li[data-type="taskItem"] label {
          display: flex !important;
          margin-right: 8px !important;
          flex-shrink: 0 !important;
          line-height: 1.5 !important;
          height: 24px !important;
          align-items: center !important;
        }
        li[data-type="taskItem"] input[type="checkbox"] {
          width: 16px !important;
          height: 16px !important;
          margin: 0 !important;
          flex-shrink: 0 !important;
        }
        li[data-type="taskItem"] > div,
        li[data-type="taskItem"] > p {
          flex: 1 !important;
          color: ${themeColors.foreground} !important;
          line-height: 1.5 !important;
          margin: 0 !important;
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
          color: ${themeColors.foreground};
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        pre {
          background-color: ${themeColors.muted};
          color: ${themeColors.foreground};
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      ${content || '<p>No content</p>'}
    </body>
    </html>
  `;
}

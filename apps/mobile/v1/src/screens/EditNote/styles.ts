/**
 * Generate custom CSS for the TenTap rich text editor
 * Handles typography, task lists, code blocks, and theme colors
 */
export function generateEditorStyles(themeColors: {
  background: string;
  foreground: string;
  mutedForeground: string;
  muted: string;
  primary: string;
}): string {
  return `
    html {
      overflow-x: hidden !important;
      width: 100vw !important;
      background-color: ${themeColors.background} !important;
    }
    *:not(input[type="checkbox"]):not(input[type="checkbox"]::after) {
      color: ${themeColors.foreground} !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
      font-size: 16px !important;
      line-height: 1.5 !important;
      background-color: ${themeColors.background} !important;
      padding: 0 16px !important;
      margin: 0 !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior: contain !important;
      width: 100vw !important;
      max-width: 100vw !important;
    }
    .ProseMirror {
      outline: none;
      overflow-x: hidden !important;
      width: calc(100vw - 32px) !important;
      max-width: calc(100vw - 32px) !important;
      line-height: 1.5 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    @media (min-width: 600px) {
      .ProseMirror {
        padding-bottom: 100px !important;
      }
    }
    .ProseMirror > *:not(ul[data-type="taskList"]):not(ul[data-type="taskList"] *) {
      max-width: 100% !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      white-space: pre-wrap !important;
    }
    p {
      margin: 0 0 16px 0;
      color: ${themeColors.foreground} !important;
    }
    p * {
      color: ${themeColors.foreground} !important;
    }
    .ProseMirror > p:first-child {
      margin-top: 12px !important;
    }
    li[data-type="taskItem"] > div > p:first-child {
      margin-top: 0 !important;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: 24px 0 16px 0;
      font-weight: 600;
      color: ${themeColors.foreground} !important;
    }
    h1:first-child, h2:first-child, h3:first-child, h4:first-child, h5:first-child, h6:first-child {
      margin-top: 12px;
    }
    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h1 *, h2 *, h3 *, h4 *, h5 *, h6 * {
      color: ${themeColors.foreground} !important;
    }
    ul, ol {
      margin: 16px 0;
      padding-left: 24px;
    }
    li {
      margin: 4px 0;
      color: ${themeColors.foreground} !important;
    }
    li::marker {
      color: ${themeColors.foreground} !important;
    }
    ul li, ol li {
      color: ${themeColors.foreground} !important;
    }
    li * {
      color: ${themeColors.foreground} !important;
    }
    /* Task list styling - override TenTap defaults with higher specificity */
    ul[data-type="taskList"] {
      list-style: none !important;
      margin: 16px 0 !important;
      padding: 0 !important;
    }

    ul[data-type="taskList"] li {
      display: flex !important;
      align-items: flex-start !important;
      margin: 8px 0 !important;
    }

    ul[data-type="taskList"] li > label {
      flex: 0 0 auto !important;
      margin-right: 8px !important;
      margin-top: 3px !important;
      user-select: none !important;
      display: flex !important;
      align-items: center !important;
    }

    ul[data-type="taskList"] li > label > input {
      -webkit-appearance: none !important;
      -moz-appearance: none !important;
      appearance: none !important;
      width: 18px !important;
      height: 18px !important;
      margin: 0 !important;
      padding: 0 !important;
      cursor: pointer !important;
      border: 2px solid ${themeColors.mutedForeground} !important;
      border-radius: 4px !important;
      background: ${themeColors.background} !important;
      flex-shrink: 0 !important;
    }

    ul[data-type="taskList"] li > label > input:checked {
      background: ${themeColors.background} !important;
      border-color: ${themeColors.mutedForeground} !important;
      background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='${encodeURIComponent(themeColors.foreground)}' stroke-width='2' d='M3 8l3 3 7-7'/%3E%3C/svg%3E") !important;
      background-size: 14px 14px !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }

    ul[data-type="taskList"] li > div {
      flex: 1 1 auto !important;
      line-height: 1.5 !important;
      font-size: 16px !important;
    }

    ul[data-type="taskList"] p {
      margin: 0 !important;
      line-height: 1.5 !important;
      color: ${themeColors.foreground} !important;
    }

    li[data-type="taskItem"] * {
      color: ${themeColors.foreground} !important;
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
      background-color: ${themeColors.muted} !important;
      color: ${themeColors.foreground} !important;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background-color: ${themeColors.muted} !important;
      color: ${themeColors.foreground} !important;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      max-width: 100%;
    }
    img, video, iframe {
      max-width: 100%;
      height: auto;
    }
    table {
      max-width: 100%;
      overflow-x: auto;
      display: block;
    }
    strong {
      font-weight: 600;
      color: ${themeColors.foreground} !important;
    }
    em {
      font-style: italic;
      color: ${themeColors.foreground} !important;
    }
  `;
}

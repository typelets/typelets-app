// components/note-editor/editor-styles.ts
export const editorStyles = `
.ProseMirror {
    outline: none;
    padding: 16px;
    height: 100%;
    overflow-y: auto;
    line-height: 1.6;
    font-size: 14px;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
}

.ProseMirror h1 {
    font-size: 2em;
    font-weight: bold;
    margin: 16px 0 8px 0;
    line-height: 1.2;
    color: hsl(var(--foreground));
}

.ProseMirror h2 {
    font-size: 1.5em;
    font-weight: bold;
    margin: 14px 0 6px 0;
    line-height: 1.3;
    color: hsl(var(--foreground));
}

.ProseMirror h3 {
    font-size: 1.25em;
    font-weight: bold;
    margin: 12px 0 4px 0;
    line-height: 1.4;
    color: hsl(var(--foreground));
}

.ProseMirror p {
    margin: 8px 0;
    color: hsl(var(--foreground));
}

.ProseMirror ul,
.ProseMirror ol {
    margin: 8px 0;
    padding-left: 24px;
}

.ProseMirror li {
    margin: 4px 0;
    color: hsl(var(--foreground));
}

.ProseMirror ul {
    list-style-type: disc;
}

.ProseMirror ol {
    list-style-type: decimal;
}

/* Task List Styles */
.ProseMirror .task-list {
    list-style: none;
    padding-left: 0;
    margin: 8px 0;
}

.ProseMirror .task-item {
    display: flex;
    align-items: flex-start;
    margin: 4px 0;
    padding-left: 0;
    line-height: 1.6;
}

.ProseMirror .task-item > label {
    margin-right: 8px;
    margin-top: 0;
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    height: 1.6em;
}

.ProseMirror .task-item > label input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: hsl(var(--primary));
}

.ProseMirror .task-item > div {
    flex: 1;
    min-width: 0;
    padding-top: 0;
}

.ProseMirror .task-item > div > p {
    margin: 0;
    line-height: 1.6;
}

.ProseMirror .task-item[data-checked="true"] > div {
    text-decoration: line-through;
    opacity: 0.6;
}

.ProseMirror blockquote {
    margin: 16px 0;
    padding-left: 16px;
    border-left: 4px solid hsl(var(--border));
    font-style: italic;
    color: hsl(var(--muted-foreground));
}

.ProseMirror strong {
    font-weight: bold;
    color: hsl(var(--foreground));
}

.ProseMirror em {
    font-style: italic;
    color: hsl(var(--foreground));
}

.ProseMirror code {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
    padding: 2px 4px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9em;
}

/* Code Block Styles */
.ProseMirror pre {
    background-color: #ffffff !important;
    border: 1px solid #e5e5e5 !important;
    border-radius: 8px !important;
    margin: 16px 0 !important;
    overflow: hidden !important;
    position: relative !important;
    padding: 0 !important;
}

.dark .ProseMirror pre {
    background-color: #333333 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
}

.ProseMirror pre::before {
    content: attr(data-language) !important;
    display: block !important;
    background: #f5f5f5 !important;
    border-bottom: 1px solid #e5e5e5 !important;
    padding: 0 16px 0 60px !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
    color: #666666 !important;
    text-transform: capitalize !important;
    font-family: var(--font-sans) !important;
    position: relative !important;
    height: 40px !important;
    line-height: 40px !important;
}

.dark .ProseMirror pre::before {
    background: #444444 !important;
    border-bottom-color: rgba(255, 255, 255, 0.1) !important;
    color: #cccccc !important;
}

.ProseMirror pre::after {
    content: "" !important;
    position: absolute !important;
    top: 14px !important;
    left: 16px !important;
    width: 12px !important;
    height: 12px !important;
    border-radius: 50% !important;
    background: #ef4444 !important;
    box-shadow: 18px 0 0 #f59e0b, 36px 0 0 #10b981 !important;
    z-index: 10 !important;
}

.ProseMirror pre code {
    display: block !important;
    background: transparent !important;
    padding: 16px !important;
    border-radius: 0 !important;
    color: #374151 !important;
    font-family: var(--font-mono) !important;
    font-size: 0.875rem !important;
    line-height: 1.5 !important;
    overflow-x: auto !important;
    margin: 0 !important;
}

.dark .ProseMirror pre code {
    color: #e5e7eb !important;
}

/* Syntax highlighting */
.ProseMirror pre .hljs-comment,
.ProseMirror pre .hljs-quote {
    color: #6b7280 !important;
    font-style: italic !important;
}

.ProseMirror pre .hljs-keyword,
.ProseMirror pre .hljs-selector-tag,
.ProseMirror pre .hljs-title {
    color: #7c3aed !important;
    font-weight: 600 !important;
}

.ProseMirror pre .hljs-string,
.ProseMirror pre .hljs-attr {
    color: #059669 !important;
}

.ProseMirror pre .hljs-number,
.ProseMirror pre .hljs-literal {
    color: #d97706 !important;
}

.ProseMirror pre .hljs-function,
.ProseMirror pre .hljs-title.function_ {
    color: #2563eb !important;
}

.ProseMirror pre .hljs-variable,
.ProseMirror pre .hljs-template-variable {
    color: #dc2626 !important;
}

.ProseMirror pre .hljs-built_in,
.ProseMirror pre .hljs-type {
    color: #7c2d12 !important;
}

.ProseMirror pre .hljs-operator,
.ProseMirror pre .hljs-punctuation {
    color: #6b7280 !important;
}

.ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: hsl(var(--muted-foreground));
    pointer-events: none;
    height: 0;
}
`;

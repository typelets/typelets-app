import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface EditorColors {
  background: string;
  foreground: string;
  placeholder: string;
  border: string;
  muted: string;
  mutedForeground: string;
  codeBackground: string;
  codeBlockBackground: string;
  codeBlockBorder: string;
  blockquoteBorder: string;
  blockquoteText: string;
  highlightBackground: string;
}

export interface EditorProps {
  value: string; // HTML content
  onChange: (html: string) => void;
  onFormatChange?: (formats: { bold: boolean; italic: boolean; underline: boolean; strikethrough: boolean; blockquote: boolean; heading: number; codeBlock: boolean; bulletList: boolean; orderedList: boolean; taskList: boolean }) => void;
  placeholder?: string;
  editable?: boolean;
  theme?: 'light' | 'dark';
  colors?: EditorColors;
}

export interface EditorRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  insertText: (text: string) => void;
  bold: () => void;
  italic: () => void;
  underline: () => void;
  strikethrough: () => void;
  heading: (level: number) => void;
  bulletList: () => void;
  orderedList: () => void;
  checkboxList: () => void;
  indent: () => void;
  outdent: () => void;
  undo: () => void;
  redo: () => void;
  removeFormat: () => void;
  horizontalRule: () => void;
  blockquote: () => void;
  codeBlock: () => void;
}

const createEditorHTML = (content: string, placeholder: string, isDark: boolean, colors?: EditorColors) => {
  // Use provided colors or fall back to hardcoded theme colors
  const editorColors: EditorColors = colors || {
    background: isDark ? '#1a1a1a' : '#fff',
    foreground: isDark ? '#fff' : '#000',
    placeholder: isDark ? '#666' : '#999',
    border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    muted: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    mutedForeground: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
    codeBackground: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    codeBlockBackground: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    codeBlockBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    blockquoteBorder: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    blockquoteText: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.7)',
    highlightBackground: isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(254, 240, 138, 0.8)',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="color-scheme" content="${isDark ? 'dark' : 'light'}">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      background: ${editorColors.background};
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 12px 16px 16px 16px;
      background: ${editorColors.background};
      color: ${editorColors.foreground};
      font-size: 16px;
      line-height: 1.6;
      min-height: 100vh;
    }
    #editor {
      min-height: 100vh;
      padding-bottom: 40px;
      outline: none;
    }
    #editor:empty:before {
      content: attr(data-placeholder);
      color: ${editorColors.placeholder};
    }

    /* First child margin fix */
    * {
      margin-top: 0;
    }
    *:first-child {
      margin-top: 0 !important;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      margin: 8px 0 8px 0;
    }
    h1:first-child, h2:first-child, h3:first-child {
      margin-top: 0;
    }
    h1 { font-size: 32px; line-height: 1.2; }
    h2 { font-size: 24px; line-height: 1.3; }
    h3 { font-size: 20px; line-height: 1.4; }

    /* Paragraphs */
    p {
      margin: 0 0 8px 0;
    }

    /* Empty paragraphs should show as spacing */
    p:empty {
      min-height: 1.6em;
    }

    /* Text formatting */
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }

    /* Horizontal rule */
    hr {
      margin: 16px 0;
      border: none;
      border-top: 1px solid ${editorColors.border};
    }

    /* Lists */
    ul, ol {
      padding-left: 20px;
      margin: 8px 0;
    }
    li {
      margin: 4px 0;
    }

    /* Remove p margins inside list items (Tiptap wraps li content in p tags) */
    li > p {
      margin: 0 !important;
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid ${editorColors.blockquoteBorder};
      padding-left: 16px;
      margin: 12px 0;
      color: ${editorColors.blockquoteText};
      font-style: italic;
    }

    blockquote > p {
      margin: 0 !important;
    }

    /* Task list checkbox styling */
    ul[data-type="taskList"],
    ul:has(> li > input[type="checkbox"]) {
      list-style: none !important;
      padding-left: 0 !important;
      margin: 8px 0 !important;
    }

    li[data-type="taskItem"],
    li:has(> input[type="checkbox"]),
    li:has(> label > input[type="checkbox"]) {
      display: flex !important;
      align-items: center !important;
      margin: 4px 0 !important;
      list-style: none !important;
    }

    input[type="checkbox"] {
      width: 16px !important;
      height: 16px !important;
      min-width: 16px !important;
      min-height: 16px !important;
      margin: 0 8px 0 0 !important;
      flex-shrink: 0 !important;
      cursor: pointer !important;
    }

    li[data-type="taskItem"] label,
    li label:has(> input[type="checkbox"]) {
      display: contents !important;
    }

    /* Hide the empty span that Tiptap adds */
    li[data-type="taskItem"] label > span {
      display: none !important;
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

    /* Highlight/Mark */
    mark {
      background-color: ${editorColors.highlightBackground};
      padding: 2px 4px;
      border-radius: 3px;
    }

    /* Code */
    code {
      background-color: ${editorColors.codeBackground};
      color: ${editorColors.foreground};
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      white-space: pre;
    }

    pre {
      background-color: ${editorColors.codeBlockBackground};
      border: 1px solid ${editorColors.codeBlockBorder};
      border-radius: 6px;
      padding: 12px 16px;
      margin: 8px 0;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      white-space: pre;
      word-wrap: normal;
      overflow-wrap: normal;
    }

    pre code {
      background-color: transparent !important;
      padding: 0 !important;
      white-space: pre !important;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 8px 0;
      border-radius: 6px;
    }

    /* Tiptap image wrapper */
    .image,
    [data-type="image"] {
      max-width: 100%;
    }

    .image img,
    [data-type="image"] img {
      max-width: 100%;
      height: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div id="editor" contenteditable="true" data-placeholder="${placeholder}"></div>
  <script>
    const editor = document.getElementById('editor');
    let isInitialized = false;

    // Set initial content ONCE
    editor.innerHTML = ${JSON.stringify(content || '<p></p>')};
    isInitialized = true;

    // Send content changes to React Native (debounced)
    let timeout;
    function notifyChange() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const html = editor.innerHTML;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', html }));
      }, 300);
    }

    editor.addEventListener('input', notifyChange);
    editor.addEventListener('blur', () => {
      clearTimeout(timeout);
      const html = editor.innerHTML;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', html }));
    });

    // Track selection changes to detect active formats
    function checkActiveFormats() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === 3 ? container.parentElement : container;

      if (!element) return;

      // Check if cursor is inside a blockquote, heading, code block, or list
      let isInBlockquote = false;
      let isInCodeBlock = false;
      let isInBulletList = false;
      let isInOrderedList = false;
      let isInTaskList = false;
      let headingLevel = 0;
      let node = element;
      while (node && node !== editor) {
        if (node.tagName === 'BLOCKQUOTE') {
          isInBlockquote = true;
        }
        if (node.tagName === 'PRE') {
          isInCodeBlock = true;
        }
        if (node.tagName === 'UL') {
          // Check if it's a task list
          if (node.getAttribute('data-type') === 'taskList' || node.classList.contains('task-list')) {
            isInTaskList = true;
          } else {
            isInBulletList = true;
          }
        }
        if (node.tagName === 'OL') {
          isInOrderedList = true;
        }
        if (node.tagName === 'H1') headingLevel = 1;
        else if (node.tagName === 'H2') headingLevel = 2;
        else if (node.tagName === 'H3') headingLevel = 3;
        else if (node.tagName === 'H4') headingLevel = 4;
        else if (node.tagName === 'H5') headingLevel = 5;
        else if (node.tagName === 'H6') headingLevel = 6;
        node = node.parentElement;
      }

      const formats = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        blockquote: isInBlockquote,
        heading: headingLevel,
        codeBlock: isInCodeBlock,
        bulletList: isInBulletList,
        orderedList: isInOrderedList,
        taskList: isInTaskList,
      };

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'formats', formats }));
    }

    editor.addEventListener('selectionchange', checkActiveFormats);
    document.addEventListener('selectionchange', checkActiveFormats);

    // Handle Enter and Backspace keys
    editor.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check context
          let node = element;
          let preNode = null;
          let taskListNode = null;
          let currentTaskItem = null;
          let bulletListNode = null;
          let orderedListNode = null;
          let currentLi = null;

          while (node && node !== editor) {
            if (node.tagName === 'PRE') {
              preNode = node;
              break;
            }
            if (node.tagName === 'UL' && (node.getAttribute('data-type') === 'taskList' || node.classList.contains('task-list'))) {
              taskListNode = node;
            }
            if (node.tagName === 'UL' && !node.getAttribute('data-type')) {
              bulletListNode = node;
            }
            if (node.tagName === 'OL') {
              orderedListNode = node;
            }
            if (node.tagName === 'LI' && node.getAttribute('data-type') === 'taskItem') {
              currentTaskItem = node;
            }
            if (node.tagName === 'LI' && !currentLi) {
              currentLi = node;
            }
            node = node.parentElement;
          }

          if (preNode) {
            // We're in a code block - insert newline instead of new block
            e.preventDefault();
            e.stopPropagation();

            // Insert a text node with newline character
            const textNode = document.createTextNode('\\n');
            range.deleteContents();
            range.insertNode(textNode);

            // Move cursor after the newline
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            notifyChange();
            return false;
          } else if (taskListNode && currentTaskItem) {
            // We're in a task list - create a new task item
            e.preventDefault();
            e.stopPropagation();

            // Create a new task item
            const newLi = document.createElement('li');
            newLi.setAttribute('data-type', 'taskItem');
            newLi.classList.add('task-item');
            newLi.setAttribute('data-checked', 'false');

            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('data-checked', 'false');
            label.appendChild(checkbox);
            const span = document.createElement('span');
            label.appendChild(span);

            const div = document.createElement('div');
            const p = document.createElement('p');
            div.appendChild(p);

            newLi.appendChild(label);
            newLi.appendChild(div);

            // Insert after current task item
            if (currentTaskItem.nextSibling) {
              taskListNode.insertBefore(newLi, currentTaskItem.nextSibling);
            } else {
              taskListNode.appendChild(newLi);
            }

            // Move cursor to the new task item
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            notifyChange();
            return false;
          } else if (bulletListNode && currentLi) {
            // We're in a bullet list - create new list item with <p>
            e.preventDefault();
            e.stopPropagation();

            const newLi = document.createElement('li');
            const p = document.createElement('p');
            newLi.appendChild(p);

            // Insert after current list item
            if (currentLi.nextSibling) {
              bulletListNode.insertBefore(newLi, currentLi.nextSibling);
            } else {
              bulletListNode.appendChild(newLi);
            }

            // Move cursor to the new list item
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            notifyChange();
            return false;
          } else if (orderedListNode && currentLi) {
            // We're in an ordered list - create new list item with <p>
            e.preventDefault();
            e.stopPropagation();

            const newLi = document.createElement('li');
            const p = document.createElement('p');
            newLi.appendChild(p);

            // Insert after current list item
            if (currentLi.nextSibling) {
              orderedListNode.insertBefore(newLi, currentLi.nextSibling);
            } else {
              orderedListNode.appendChild(newLi);
            }

            // Move cursor to the new list item
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            notifyChange();
            return false;
          } else {
            // Regular paragraph or heading - create new paragraph
            e.preventDefault();
            e.stopPropagation();

            // Find the current block element (p, h1, h2, h3, etc.)
            let currentBlock = element;
            while (currentBlock && currentBlock !== editor) {
              const tag = currentBlock.tagName;
              if (tag === 'P' || tag === 'H1' || tag === 'H2' || tag === 'H3' ||
                  tag === 'H4' || tag === 'H5' || tag === 'H6' || tag === 'BLOCKQUOTE') {
                break;
              }
              currentBlock = currentBlock.parentElement;
            }

            if (currentBlock && currentBlock !== editor) {
              // Check if cursor is at the very beginning of the block
              const rangeAtStart = document.createRange();
              rangeAtStart.setStart(currentBlock, 0);
              rangeAtStart.setEnd(range.startContainer, range.startOffset);
              const isAtStart = rangeAtStart.toString().length === 0;

              const newP = document.createElement('p');

              if (isAtStart) {
                // Cursor at beginning - insert empty paragraph BEFORE current block
                editor.insertBefore(newP, currentBlock);

                // Move cursor to current block (which is now after the new empty one)
                const newRange = document.createRange();
                newRange.setStart(currentBlock, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } else {
                // Cursor in middle or end - split the block
                const afterContent = range.extractContents();

                // Insert new paragraph after current block
                if (currentBlock.nextSibling) {
                  editor.insertBefore(newP, currentBlock.nextSibling);
                } else {
                  editor.appendChild(newP);
                }

                // If there was content after cursor, put it in the new paragraph
                if (afterContent.textContent.trim() || afterContent.querySelector('*')) {
                  newP.appendChild(afterContent);
                }

                // Move cursor to the new paragraph
                const newRange = document.createRange();
                newRange.setStart(newP, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              // Not in a block, create a new paragraph
              const newP = document.createElement('p');
              range.deleteContents();
              range.insertNode(newP);

              // Move cursor to the new paragraph
              const newRange = document.createRange();
              newRange.setStart(newP, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }

            notifyChange();
            return false;
          }
        }
      } else if (e.key === 'Backspace' || e.keyCode === 8) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check if we're in a list
          let node = element;
          let taskListNode = null;
          let currentTaskItem = null;
          let bulletListNode = null;
          let orderedListNode = null;
          let currentLi = null;

          while (node && node !== editor) {
            if (node.tagName === 'UL' && (node.getAttribute('data-type') === 'taskList' || node.classList.contains('task-list'))) {
              taskListNode = node;
            }
            if (node.tagName === 'UL' && !node.getAttribute('data-type')) {
              bulletListNode = node;
            }
            if (node.tagName === 'OL') {
              orderedListNode = node;
            }
            if (node.tagName === 'LI' && node.getAttribute('data-type') === 'taskItem') {
              currentTaskItem = node;
            }
            if (node.tagName === 'LI' && !currentLi) {
              currentLi = node;
            }
            node = node.parentElement;
          }

          if (taskListNode && currentTaskItem) {
            // Check if the task item is empty and cursor is at the start
            const contentDiv = currentTaskItem.querySelector('div');
            const contentP = contentDiv?.querySelector('p');
            const isEmpty = !contentP || contentP.innerHTML === '' || contentP.textContent.trim() === '';
            const isAtStart = range.startOffset === 0 && range.collapsed;

            if (isEmpty && isAtStart) {
              e.preventDefault();
              e.stopPropagation();

              // Convert this task item to a paragraph (remove checkbox, stay on same line)
              const p = document.createElement('p');

              const parent = taskListNode.parentNode;

              // Get tasks before and after the current one
              const allTasks = Array.from(taskListNode.children);
              const currentIndex = allTasks.indexOf(currentTaskItem);
              const tasksAfter = allTasks.slice(currentIndex + 1);

              // Remove current task
              taskListNode.removeChild(currentTaskItem);

              // Insert paragraph after the current list
              if (taskListNode.nextSibling) {
                parent.insertBefore(p, taskListNode.nextSibling);
              } else {
                parent.appendChild(p);
              }

              // If there are tasks after, create a new list for them
              if (tasksAfter.length > 0) {
                const newList = document.createElement('ul');
                newList.setAttribute('data-type', 'taskList');
                newList.classList.add('task-list');
                tasksAfter.forEach(task => {
                  taskListNode.removeChild(task);
                  newList.appendChild(task);
                });
                // Insert new list after the paragraph
                if (p.nextSibling) {
                  parent.insertBefore(newList, p.nextSibling);
                } else {
                  parent.appendChild(newList);
                }
              }

              // If the original list is now empty, remove it
              if (taskListNode.children.length === 0) {
                parent.removeChild(taskListNode);
              }

              // Keep cursor in the new paragraph
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);

              notifyChange();
              return false;
            }
          } else if (bulletListNode && currentLi) {
            // Handle backspace in bullet list
            const contentP = currentLi.querySelector('p');
            const isEmpty = !contentP || contentP.innerHTML === '' || contentP.textContent.trim() === '';
            const isAtStart = range.startOffset === 0 && range.collapsed;

            if (isEmpty && isAtStart) {
              e.preventDefault();
              e.stopPropagation();

              // Convert to paragraph and exit list
              const p = document.createElement('p');
              const parent = bulletListNode.parentNode;

              // Get items after current one
              const allItems = Array.from(bulletListNode.children);
              const currentIndex = allItems.indexOf(currentLi);
              const itemsAfter = allItems.slice(currentIndex + 1);

              // Remove current item
              bulletListNode.removeChild(currentLi);

              // Insert paragraph after list
              if (bulletListNode.nextSibling) {
                parent.insertBefore(p, bulletListNode.nextSibling);
              } else {
                parent.appendChild(p);
              }

              // If there are items after, create new list
              if (itemsAfter.length > 0) {
                const newList = document.createElement('ul');
                itemsAfter.forEach(item => {
                  bulletListNode.removeChild(item);
                  newList.appendChild(item);
                });
                if (p.nextSibling) {
                  parent.insertBefore(newList, p.nextSibling);
                } else {
                  parent.appendChild(newList);
                }
              }

              // Remove list if empty
              if (bulletListNode.children.length === 0) {
                parent.removeChild(bulletListNode);
              }

              // Move cursor to new paragraph
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);

              notifyChange();
              return false;
            }
          } else if (orderedListNode && currentLi) {
            // Handle backspace in ordered list
            const contentP = currentLi.querySelector('p');
            const isEmpty = !contentP || contentP.innerHTML === '' || contentP.textContent.trim() === '';
            const isAtStart = range.startOffset === 0 && range.collapsed;

            if (isEmpty && isAtStart) {
              e.preventDefault();
              e.stopPropagation();

              // Convert to paragraph and exit list
              const p = document.createElement('p');
              const parent = orderedListNode.parentNode;

              // Get items after current one
              const allItems = Array.from(orderedListNode.children);
              const currentIndex = allItems.indexOf(currentLi);
              const itemsAfter = allItems.slice(currentIndex + 1);

              // Remove current item
              orderedListNode.removeChild(currentLi);

              // Insert paragraph after list
              if (orderedListNode.nextSibling) {
                parent.insertBefore(p, orderedListNode.nextSibling);
              } else {
                parent.appendChild(p);
              }

              // If there are items after, create new list
              if (itemsAfter.length > 0) {
                const newList = document.createElement('ol');
                itemsAfter.forEach(item => {
                  orderedListNode.removeChild(item);
                  newList.appendChild(item);
                });
                if (p.nextSibling) {
                  parent.insertBefore(newList, p.nextSibling);
                } else {
                  parent.appendChild(newList);
                }
              }

              // Remove list if empty
              if (orderedListNode.children.length === 0) {
                parent.removeChild(orderedListNode);
              }

              // Move cursor to new paragraph
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);

              notifyChange();
              return false;
            }
          }
        }
      }
    });

    // Handle content updates from React Native (external changes only)
    window.setContent = function(html) {
      if (!isInitialized) return;
      if (editor.innerHTML !== html) {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        editor.innerHTML = html;
        if (range) {
          try {
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {}
        }
      }
    };

    // Handle formatting commands from React Native
    window.execCommand = function(command, value) {
      editor.focus();
      if (command === 'bold') {
        // Create <strong> tag directly (Tiptap compatible)
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);

          // Check if we're already in a strong or b tag
          let node = range.commonAncestorContainer;
          if (node.nodeType === 3) node = node.parentElement;
          let strongNode = null;

          while (node && node !== editor) {
            if (node.tagName === 'STRONG' || node.tagName === 'B') {
              strongNode = node;
              break;
            }
            node = node.parentElement;
          }

          if (strongNode) {
            // Remove bold by unwrapping the strong tag
            const parent = strongNode.parentElement;
            while (strongNode.firstChild) {
              parent.insertBefore(strongNode.firstChild, strongNode);
            }
            parent.removeChild(strongNode);
          } else {
            // Add bold with strong tag
            const strong = document.createElement('strong');
            try {
              range.surroundContents(strong);
            } catch (e) {
              // If surroundContents fails (partial selection), extract and wrap
              const contents = range.extractContents();
              strong.appendChild(contents);
              range.insertNode(strong);
            }
          }
        }
      } else if (command === 'italic') {
        document.execCommand('italic', false, null);
      } else if (command === 'underline') {
        document.execCommand('underline', false, null);
      } else if (command === 'strikethrough') {
        document.execCommand('strikethrough', false, null);
      } else if (command === 'heading') {
        // Check if we're already on this heading level
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check current heading level
          let currentHeadingLevel = 0;
          let node = element;
          while (node && node !== editor) {
            if (node.tagName === 'H' + value) {
              currentHeadingLevel = value;
              break;
            }
            node = node.parentElement;
          }

          if (currentHeadingLevel === value) {
            // Toggle off - convert to paragraph
            document.execCommand('formatBlock', false, '<p>');
          } else {
            // Apply heading
            document.execCommand('formatBlock', false, '<h' + value + '>');
          }
        }
      } else if (command === 'bulletList') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          let node = element;
          let taskListNode = null;
          let currentTaskItem = null;
          let orderedListNode = null;
          let currentLi = null;

          while (node && node !== editor) {
            if (node.tagName === 'UL' && (node.getAttribute('data-type') === 'taskList' || node.classList.contains('task-list'))) {
              taskListNode = node;
            }
            if (node.tagName === 'LI' && node.getAttribute('data-type') === 'taskItem') {
              currentTaskItem = node;
            }
            if (node.tagName === 'OL') {
              orderedListNode = node;
            }
            if (node.tagName === 'LI' && !currentLi) {
              currentLi = node;
            }
            node = node.parentElement;
          }

          if (taskListNode && currentTaskItem) {
            // Find the index of the current task item to restore cursor position
            const allTasks = Array.from(taskListNode.querySelectorAll('li[data-type="taskItem"]'));
            const currentIndex = allTasks.indexOf(currentTaskItem);

            // Convert task list to bullet list by removing task-specific attributes
            taskListNode.removeAttribute('data-type');
            taskListNode.classList.remove('task-list');

            // Convert all task items to regular list items
            const items = taskListNode.querySelectorAll('li[data-type="taskItem"]');
            items.forEach(item => {
              item.removeAttribute('data-type');
              item.removeAttribute('data-checked');
              item.classList.remove('task-item');

              // Remove checkbox and label
              const label = item.querySelector('label');
              if (label) label.remove();

              // Extract content from div and handle p tag properly
              const div = item.querySelector('div');
              if (div) {
                const divP = div.querySelector('p');
                if (divP) {
                  // Create a new p tag with the content
                  const newP = document.createElement('p');
                  newP.innerHTML = divP.innerHTML || '<br>';
                  item.appendChild(newP);
                } else {
                  // Move all content
                  while (div.firstChild) {
                    item.appendChild(div.firstChild);
                  }
                }
                div.remove();
              }
            });

            // Restore cursor position to the same list item
            if (currentIndex >= 0) {
              const newItems = taskListNode.querySelectorAll('li');
              const targetLi = newItems[currentIndex];
              if (targetLi) {
                const newRange = document.createRange();
                const firstChild = targetLi.firstChild;
                if (firstChild) {
                  newRange.setStart(firstChild, 0);
                } else {
                  newRange.setStart(targetLi, 0);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          } else if (orderedListNode && currentLi) {
            // Convert ordered list to unordered list
            const allItems = Array.from(orderedListNode.querySelectorAll('li'));
            const currentIndex = allItems.indexOf(currentLi);

            const ul = document.createElement('ul');
            allItems.forEach(item => {
              const li = document.createElement('li');
              // Keep the p tag wrapper (Tiptap compatible)
              if (item.children.length === 1 && item.children[0].tagName === 'P') {
                // Clone the p tag with its content
                const p = document.createElement('p');
                const originalP = item.children[0];
                p.innerHTML = originalP.innerHTML;
                li.appendChild(p);
              } else {
                // Wrap content in p tag
                const p = document.createElement('p');
                while (item.firstChild) {
                  p.appendChild(item.firstChild);
                }
                li.appendChild(p);
              }
              ul.appendChild(li);
            });

            orderedListNode.parentNode.replaceChild(ul, orderedListNode);

            // Restore cursor position
            if (currentIndex >= 0) {
              const newItems = ul.querySelectorAll('li');
              const targetLi = newItems[currentIndex];
              if (targetLi) {
                const newRange = document.createRange();
                const firstChild = targetLi.firstChild;
                if (firstChild) {
                  newRange.setStart(firstChild, 0);
                } else {
                  newRange.setStart(targetLi, 0);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          } else {
            // Create new bullet list manually with proper Tiptap structure
            // Find current paragraph
            let currentP = element;
            while (currentP && currentP !== editor && currentP.tagName !== 'P') {
              currentP = currentP.parentElement;
            }

            if (currentP && currentP.tagName === 'P') {
              // Create ul and li with p wrapper
              const ul = document.createElement('ul');
              const li = document.createElement('li');
              const p = document.createElement('p');

              // Move current paragraph content into the list item's p tag
              p.innerHTML = currentP.innerHTML || '';

              li.appendChild(p);
              ul.appendChild(li);

              // Replace the paragraph with the list
              currentP.parentNode.replaceChild(ul, currentP);

              // Move cursor into the list item's p tag
              const newRange = document.createRange();
              if (p.firstChild) {
                newRange.setStart(p.firstChild, 0);
              } else {
                newRange.setStart(p, 0);
              }
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              // Not in a paragraph, create empty list
              const ul = document.createElement('ul');
              const li = document.createElement('li');
              const p = document.createElement('p');

              li.appendChild(p);
              ul.appendChild(li);

              range.deleteContents();
              range.insertNode(ul);

              // Move cursor into the list
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
            notifyChange();
          }
        }
      } else if (command === 'orderedList') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          let node = element;
          let taskListNode = null;
          let currentTaskItem = null;
          let bulletListNode = null;
          let currentLi = null;

          while (node && node !== editor) {
            if (node.tagName === 'UL' && (node.getAttribute('data-type') === 'taskList' || node.classList.contains('task-list'))) {
              taskListNode = node;
            }
            if (node.tagName === 'UL' && !node.getAttribute('data-type') && !node.classList.contains('task-list')) {
              bulletListNode = node;
            }
            if (node.tagName === 'LI' && node.getAttribute('data-type') === 'taskItem') {
              currentTaskItem = node;
            }
            if (node.tagName === 'LI' && !currentLi) {
              currentLi = node;
            }
            node = node.parentElement;
          }

          if (taskListNode && currentTaskItem) {
            // Find the index of the current task item to restore cursor position
            const allTasks = Array.from(taskListNode.querySelectorAll('li[data-type="taskItem"]'));
            const currentIndex = allTasks.indexOf(currentTaskItem);

            // Convert task list to ordered list
            const ol = document.createElement('ol');

            // Convert all task items to regular list items
            const items = taskListNode.querySelectorAll('li[data-type="taskItem"]');
            items.forEach(item => {
              const li = document.createElement('li');

              // Extract content from div and handle p tag properly
              const div = item.querySelector('div');
              if (div) {
                const divP = div.querySelector('p');
                if (divP) {
                  // Create a new p tag with the content
                  const newP = document.createElement('p');
                  newP.innerHTML = divP.innerHTML || '<br>';
                  li.appendChild(newP);
                } else {
                  // Move all content
                  while (div.firstChild) {
                    li.appendChild(div.firstChild);
                  }
                }
              }

              ol.appendChild(li);
            });

            // Replace task list with ordered list
            taskListNode.parentNode.replaceChild(ol, taskListNode);

            // Restore cursor position to the same list item
            if (currentIndex >= 0) {
              const newItems = ol.querySelectorAll('li');
              const targetLi = newItems[currentIndex];
              if (targetLi) {
                const newRange = document.createRange();
                const firstChild = targetLi.firstChild;
                if (firstChild) {
                  newRange.setStart(firstChild, 0);
                } else {
                  newRange.setStart(targetLi, 0);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          } else if (bulletListNode && currentLi) {
            // Convert bullet list to ordered list
            const allItems = Array.from(bulletListNode.querySelectorAll('li'));
            const currentIndex = allItems.indexOf(currentLi);

            const ol = document.createElement('ol');
            allItems.forEach(item => {
              const li = document.createElement('li');
              // Keep the p tag wrapper (Tiptap compatible)
              if (item.children.length === 1 && item.children[0].tagName === 'P') {
                // Clone the p tag with its content
                const p = document.createElement('p');
                const originalP = item.children[0];
                p.innerHTML = originalP.innerHTML;
                li.appendChild(p);
              } else {
                // Wrap content in p tag
                const p = document.createElement('p');
                while (item.firstChild) {
                  p.appendChild(item.firstChild);
                }
                li.appendChild(p);
              }
              ol.appendChild(li);
            });

            bulletListNode.parentNode.replaceChild(ol, bulletListNode);

            // Restore cursor position
            if (currentIndex >= 0) {
              const newItems = ol.querySelectorAll('li');
              const targetLi = newItems[currentIndex];
              if (targetLi) {
                const newRange = document.createRange();
                const firstChild = targetLi.firstChild;
                if (firstChild) {
                  newRange.setStart(firstChild, 0);
                } else {
                  newRange.setStart(targetLi, 0);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            }
          } else {
            // Create new ordered list manually with proper Tiptap structure
            // Find current paragraph
            let currentP = element;
            while (currentP && currentP !== editor && currentP.tagName !== 'P') {
              currentP = currentP.parentElement;
            }

            if (currentP && currentP.tagName === 'P') {
              // Create ol and li with p wrapper
              const ol = document.createElement('ol');
              const li = document.createElement('li');
              const p = document.createElement('p');

              // Move current paragraph content into the list item's p tag
              p.innerHTML = currentP.innerHTML || '';

              li.appendChild(p);
              ol.appendChild(li);

              // Replace the paragraph with the list
              currentP.parentNode.replaceChild(ol, currentP);

              // Move cursor into the list item's p tag
              const newRange = document.createRange();
              if (p.firstChild) {
                newRange.setStart(p.firstChild, 0);
              } else {
                newRange.setStart(p, 0);
              }
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              // Not in a paragraph, create empty list
              const ol = document.createElement('ol');
              const li = document.createElement('li');
              const p = document.createElement('p');

              li.appendChild(p);
              ol.appendChild(li);

              range.deleteContents();
              range.insertNode(ol);

              // Move cursor into the list
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
            notifyChange();
          }
        }
      } else if (command === 'checkboxList') {
        // Toggle checkbox list
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check if we're already in a task list, bullet list, or ordered list
          let taskListNode = null;
          let bulletListNode = null;
          let orderedListNode = null;
          let currentLi = null;
          let node = element;

          while (node && node !== editor) {
            if (node.tagName === 'UL' && (node.getAttribute('data-type') === 'taskList' || node.classList.contains('task-list'))) {
              taskListNode = node;
            }
            if (node.tagName === 'UL' && !node.getAttribute('data-type') && !node.classList.contains('task-list')) {
              bulletListNode = node;
            }
            if (node.tagName === 'OL') {
              orderedListNode = node;
            }
            if (node.tagName === 'LI' && !currentLi) {
              currentLi = node;
            }
            node = node.parentElement;
          }

          if (taskListNode) {
            // Find the current task item
            let currentTaskItem = null;
            let currentNode = element;
            while (currentNode && currentNode !== taskListNode) {
              if (currentNode.tagName === 'LI' && currentNode.getAttribute('data-type') === 'taskItem') {
                currentTaskItem = currentNode;
                break;
              }
              currentNode = currentNode.parentElement;
            }

            if (currentTaskItem) {
              // Convert just this task item to a paragraph (same logic as backspace)
              const p = document.createElement('p');
              const contentDiv = currentTaskItem.querySelector('div') || currentTaskItem.querySelector('p');
              if (contentDiv) {
                p.innerHTML = contentDiv.innerHTML || '<br>';
              } else {
                p.innerHTML = currentTaskItem.textContent || '<br>';
              }

              const parent = taskListNode.parentNode;

              // Get tasks before and after the current one
              const allTasks = Array.from(taskListNode.children);
              const currentIndex = allTasks.indexOf(currentTaskItem);
              const tasksAfter = allTasks.slice(currentIndex + 1);

              // Remove current task
              taskListNode.removeChild(currentTaskItem);

              // Insert paragraph after the current list
              if (taskListNode.nextSibling) {
                parent.insertBefore(p, taskListNode.nextSibling);
              } else {
                parent.appendChild(p);
              }

              // If there are tasks after, create a new list for them
              if (tasksAfter.length > 0) {
                const newList = document.createElement('ul');
                newList.setAttribute('data-type', 'taskList');
                newList.classList.add('task-list');
                tasksAfter.forEach(task => {
                  taskListNode.removeChild(task);
                  newList.appendChild(task);
                });
                // Insert new list after the paragraph
                if (p.nextSibling) {
                  parent.insertBefore(newList, p.nextSibling);
                } else {
                  parent.appendChild(newList);
                }
              }

              // If the original list is now empty, remove it
              if (taskListNode.children.length === 0) {
                parent.removeChild(taskListNode);
              }

              // Move cursor to the new paragraph
              const newRange = document.createRange();
              if (p.firstChild) {
                newRange.setStart(p.firstChild, 0);
              } else {
                newRange.setStart(p, 0);
              }
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else if (bulletListNode && currentLi) {
            // Convert bullet list to task list
            const allItems = Array.from(bulletListNode.querySelectorAll('li'));
            const currentIndex = allItems.indexOf(currentLi);

            const ul = document.createElement('ul');
            ul.setAttribute('data-type', 'taskList');
            ul.classList.add('task-list');

            allItems.forEach(item => {
              const li = document.createElement('li');
              li.setAttribute('data-type', 'taskItem');
              li.classList.add('task-item');
              li.setAttribute('data-checked', 'false');

              const label = document.createElement('label');
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.setAttribute('data-checked', 'false');
              label.appendChild(checkbox);
              const span = document.createElement('span');
              label.appendChild(span);

              const div = document.createElement('div');
              const p = document.createElement('p');

              // Check if content is already wrapped in p tag
              if (item.children.length === 1 && item.children[0].tagName === 'P') {
                // Use the p tag's content directly
                p.innerHTML = item.children[0].innerHTML || '<br>';
              } else {
                // Use all content
                p.innerHTML = item.innerHTML || '<br>';
              }
              div.appendChild(p);

              li.appendChild(label);
              li.appendChild(div);
              ul.appendChild(li);
            });

            bulletListNode.parentNode.replaceChild(ul, bulletListNode);

            // Restore cursor position
            if (currentIndex >= 0) {
              const newItems = ul.querySelectorAll('li[data-type="taskItem"]');
              const targetLi = newItems[currentIndex];
              if (targetLi) {
                const targetP = targetLi.querySelector('div > p');
                if (targetP) {
                  const newRange = document.createRange();
                  const firstChild = targetP.firstChild;
                  if (firstChild) {
                    newRange.setStart(firstChild, 0);
                  } else {
                    newRange.setStart(targetP, 0);
                  }
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }
          } else if (orderedListNode && currentLi) {
            // Convert ordered list to task list
            const allItems = Array.from(orderedListNode.querySelectorAll('li'));
            const currentIndex = allItems.indexOf(currentLi);

            const ul = document.createElement('ul');
            ul.setAttribute('data-type', 'taskList');
            ul.classList.add('task-list');

            allItems.forEach(item => {
              const li = document.createElement('li');
              li.setAttribute('data-type', 'taskItem');
              li.classList.add('task-item');
              li.setAttribute('data-checked', 'false');

              const label = document.createElement('label');
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.setAttribute('data-checked', 'false');
              label.appendChild(checkbox);
              const span = document.createElement('span');
              label.appendChild(span);

              const div = document.createElement('div');
              const p = document.createElement('p');

              // Check if content is already wrapped in p tag
              if (item.children.length === 1 && item.children[0].tagName === 'P') {
                // Use the p tag's content directly
                p.innerHTML = item.children[0].innerHTML || '<br>';
              } else {
                // Use all content
                p.innerHTML = item.innerHTML || '<br>';
              }
              div.appendChild(p);

              li.appendChild(label);
              li.appendChild(div);
              ul.appendChild(li);
            });

            orderedListNode.parentNode.replaceChild(ul, orderedListNode);

            // Restore cursor position
            if (currentIndex >= 0) {
              const newItems = ul.querySelectorAll('li[data-type="taskItem"]');
              const targetLi = newItems[currentIndex];
              if (targetLi) {
                const targetP = targetLi.querySelector('div > p');
                if (targetP) {
                  const newRange = document.createRange();
                  const firstChild = targetP.firstChild;
                  if (firstChild) {
                    newRange.setStart(firstChild, 0);
                  } else {
                    newRange.setStart(targetP, 0);
                  }
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }
          } else {
            // Convert current paragraph to task list
            // Find the current paragraph
            let currentParagraph = null;
            let node = element;
            while (node && node !== editor) {
              if (node.tagName === 'P') {
                currentParagraph = node;
                break;
              }
              node = node.parentElement;
            }

            if (currentParagraph) {
              // Create task list with the paragraph's content
              const ul = document.createElement('ul');
              ul.setAttribute('data-type', 'taskList');
              ul.classList.add('task-list');
              const li = document.createElement('li');
              li.setAttribute('data-type', 'taskItem');
              li.classList.add('task-item');
              const label = document.createElement('label');
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.setAttribute('data-checked', 'false');
              label.appendChild(checkbox);
              const span = document.createElement('span');
              label.appendChild(span);
              const div = document.createElement('div');
              const p = document.createElement('p');
              // Use the paragraph's content
              p.innerHTML = currentParagraph.innerHTML || '<br>';
              div.appendChild(p);
              li.appendChild(label);
              li.appendChild(div);
              ul.appendChild(li);

              // Replace the paragraph with the task list
              const parent = currentParagraph.parentNode;
              parent.replaceChild(ul, currentParagraph);

              // Move cursor into the new paragraph
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              // Not in a paragraph, create empty task list
              const ul = document.createElement('ul');
              ul.setAttribute('data-type', 'taskList');
              ul.classList.add('task-list');
              const li = document.createElement('li');
              li.setAttribute('data-type', 'taskItem');
              li.classList.add('task-item');
              const label = document.createElement('label');
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.setAttribute('data-checked', 'false');
              label.appendChild(checkbox);
              const span = document.createElement('span');
              label.appendChild(span);
              const div = document.createElement('div');
              const p = document.createElement('p');
              p.innerHTML = '<br>';
              div.appendChild(p);
              li.appendChild(label);
              li.appendChild(div);
              ul.appendChild(li);
              range.deleteContents();
              range.insertNode(ul);
              // Move cursor into the paragraph
              const newRange = document.createRange();
              newRange.setStart(p, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }
      } else if (command === 'indent') {
        // Custom indent that doesn't use blockquote (which has italic styling)
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check if we're in a list - use native indent for lists
          let inList = false;
          let node = element;
          while (node && node !== editor) {
            if (node.tagName === 'UL' || node.tagName === 'OL') {
              inList = true;
              break;
            }
            node = node.parentElement;
          }

          if (inList) {
            // Use native indent for lists
            document.execCommand('indent', false, null);
          } else {
            // For paragraphs, add padding-left instead of using blockquote
            let targetNode = element;
            while (targetNode && targetNode !== editor) {
              if (targetNode.tagName === 'P' || targetNode.tagName === 'DIV' || targetNode.tagName === 'H1' || targetNode.tagName === 'H2' || targetNode.tagName === 'H3') {
                break;
              }
              targetNode = targetNode.parentElement;
            }

            if (targetNode && targetNode !== editor) {
              const currentPadding = parseInt(targetNode.style.paddingLeft || '0');
              targetNode.style.paddingLeft = (currentPadding + 20) + 'px';
            }
          }
        }
      } else if (command === 'outdent') {
        // Custom outdent
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check if we're in a list - use native outdent for lists
          let inList = false;
          let node = element;
          while (node && node !== editor) {
            if (node.tagName === 'UL' || node.tagName === 'OL') {
              inList = true;
              break;
            }
            node = node.parentElement;
          }

          if (inList) {
            // Use native outdent for lists
            document.execCommand('outdent', false, null);
          } else {
            // For paragraphs, reduce padding-left
            let targetNode = element;
            while (targetNode && targetNode !== editor) {
              if (targetNode.tagName === 'P' || targetNode.tagName === 'DIV' || targetNode.tagName === 'H1' || targetNode.tagName === 'H2' || targetNode.tagName === 'H3') {
                break;
              }
              targetNode = targetNode.parentElement;
            }

            if (targetNode && targetNode !== editor) {
              const currentPadding = parseInt(targetNode.style.paddingLeft || '0');
              if (currentPadding > 0) {
                targetNode.style.paddingLeft = Math.max(0, currentPadding - 20) + 'px';
              }
            }
          }
        }
      } else if (command === 'undo') {
        document.execCommand('undo', false, null);
      } else if (command === 'redo') {
        document.execCommand('redo', false, null);
      } else if (command === 'removeFormat') {
        document.execCommand('removeFormat', false, null);
        document.execCommand('formatBlock', false, 'p');
      } else if (command === 'horizontalRule') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Create HR element
          const hr = document.createElement('hr');
          hr.className = 'border-gray-300 dark:border-gray-600';

          // Create a new paragraph after the HR for the cursor
          const newP = document.createElement('p');

          // Find the current block element (p, h1, etc.)
          let currentBlock = element;
          while (currentBlock && currentBlock !== editor) {
            const tag = currentBlock.tagName;
            if (tag === 'P' || tag === 'H1' || tag === 'H2' || tag === 'H3' ||
                tag === 'H4' || tag === 'H5' || tag === 'H6' || tag === 'BLOCKQUOTE') {
              break;
            }
            currentBlock = currentBlock.parentElement;
          }

          if (currentBlock && currentBlock !== editor) {
            // Insert HR and newP after the current block
            if (currentBlock.nextSibling) {
              editor.insertBefore(hr, currentBlock.nextSibling);
              editor.insertBefore(newP, hr.nextSibling);
            } else {
              editor.appendChild(hr);
              editor.appendChild(newP);
            }

            // Clear the current block if it's empty
            if (!currentBlock.textContent.trim()) {
              currentBlock.remove();
            }
          } else {
            // Not in a block, insert at cursor position
            range.deleteContents();
            range.insertNode(hr);
            if (hr.nextSibling) {
              hr.parentNode.insertBefore(newP, hr.nextSibling);
            } else {
              hr.parentNode.appendChild(newP);
            }
          }

          // Move cursor to the new paragraph
          const newRange = document.createRange();
          newRange.setStart(newP, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        notifyChange();
      } else if (command === 'blockquote') {
        // Check if we're already in a blockquote
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check if inside blockquote
          let blockquoteNode = null;
          let node = element;
          while (node && node !== editor) {
            if (node.tagName === 'BLOCKQUOTE') {
              blockquoteNode = node;
              break;
            }
            node = node.parentElement;
          }

          if (blockquoteNode) {
            // Remove blockquote - replace it with its children
            const parent = blockquoteNode.parentNode;
            while (blockquoteNode.firstChild) {
              parent.insertBefore(blockquoteNode.firstChild, blockquoteNode);
            }
            parent.removeChild(blockquoteNode);
          } else {
            // Add blockquote
            document.execCommand('formatBlock', false, '<blockquote>');
          }
        }
      } else if (command === 'codeBlock') {
        // Check if we're already in a code block
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const element = container.nodeType === 3 ? container.parentElement : container;

          // Check if inside code block (pre tag)
          let preNode = null;
          let node = element;
          while (node && node !== editor) {
            if (node.tagName === 'PRE') {
              preNode = node;
              break;
            }
            node = node.parentElement;
          }

          if (preNode) {
            // Remove code block - replace with paragraph
            const parent = preNode.parentNode;
            const p = document.createElement('p');
            // Get text content from code block
            const codeElement = preNode.querySelector('code') || preNode;
            p.textContent = codeElement.textContent;
            parent.replaceChild(p, preNode);
          } else {
            // Add code block
            const pre = document.createElement('pre');
            const code = document.createElement('code');

            // Get selected text or create empty code block
            const selectedText = range.toString();
            if (selectedText) {
              code.textContent = selectedText;
              range.deleteContents();
            } else {
              code.textContent = '';
            }

            pre.appendChild(code);
            range.insertNode(pre);

            // Move cursor into the code element
            const newRange = document.createRange();
            newRange.setStart(code, code.childNodes.length);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      } else if (command === 'clear') {
        editor.innerHTML = '<p><br></p>';
      }
      clearTimeout(timeout);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', html: editor.innerHTML }));
    };

    // Auto-focus on load
    setTimeout(() => editor.focus(), 100);
  </script>
</body>
</html>
`;
};

export const Editor = forwardRef<EditorRef, EditorProps>(
  ({ value, onChange, onFormatChange, placeholder = 'Start typing...', editable = true, theme = 'light', colors }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const isDark = theme === 'dark';
    const [initialContent] = useState(value); // Capture initial content only once
    const lastValueRef = useRef(value); // Track last value to detect external changes
    const lastThemeRef = useRef(isDark); // Track theme changes
    const [themeKey, setThemeKey] = useState(isDark ? 'dark' : 'light');

    const execCommand = (command: string, value?: string | number) => {
      webViewRef.current?.injectJavaScript(
        `window.execCommand('${command}', ${value !== undefined ? JSON.stringify(value) : 'null'}); true;`
      );
    };

    useImperativeHandle(ref, () => ({
      focus: () => {
        webViewRef.current?.injectJavaScript('document.getElementById("editor").focus(); true;');
      },
      blur: () => {
        webViewRef.current?.injectJavaScript('document.getElementById("editor").blur(); true;');
      },
      clear: () => {
        execCommand('clear');
      },
      insertText: (text: string) => {
        webViewRef.current?.injectJavaScript(
          `document.execCommand('insertText', false, ${JSON.stringify(text)}); true;`
        );
      },
      bold: () => execCommand('bold'),
      italic: () => execCommand('italic'),
      underline: () => execCommand('underline'),
      strikethrough: () => execCommand('strikethrough'),
      heading: (level: number) => execCommand('heading', level),
      bulletList: () => execCommand('bulletList'),
      orderedList: () => execCommand('orderedList'),
      checkboxList: () => execCommand('checkboxList'),
      indent: () => execCommand('indent'),
      outdent: () => execCommand('outdent'),
      undo: () => execCommand('undo'),
      redo: () => execCommand('redo'),
      removeFormat: () => execCommand('removeFormat'),
      horizontalRule: () => execCommand('horizontalRule'),
      blockquote: () => execCommand('blockquote'),
      codeBlock: () => execCommand('codeBlock'),
    }));

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'content') {
          lastValueRef.current = data.html;
          onChange(data.html);
        } else if (data.type === 'formats' && onFormatChange) {
          onFormatChange(data.formats);
        }
      } catch (error) {
        console.error('Error parsing WebView message:', error);
      }
    };

    // Detect theme changes and force WebView recreation
    useEffect(() => {
      if (isDark !== lastThemeRef.current) {
        lastThemeRef.current = isDark;
        setThemeKey(isDark ? 'dark' : 'light');
      }
    }, [isDark]);

    // Detect external content changes (not from user typing)
    useEffect(() => {
      if (value !== lastValueRef.current && webViewRef.current) {
        lastValueRef.current = value;
        webViewRef.current.injectJavaScript(
          `window.setContent(${JSON.stringify(value)}); true;`
        );
      }
    }, [value]);

    return (
      <View style={[styles.container, { backgroundColor: colors?.background || (isDark ? '#1a1a1a' : '#fff') }]}>
        <WebView
          key={`editor-v4.2-${themeKey}`}
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: createEditorHTML(initialContent, placeholder, isDark, colors) }}
          onMessage={handleMessage}
          incognito={true}
          cacheEnabled={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="always"
          style={[styles.webview, { backgroundColor: colors?.background || (isDark ? '#1a1a1a' : '#fff') }]}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={true}
          allowsInlineMediaPlayback={true}
        />
      </View>
    );
  }
);

Editor.displayName = 'Editor';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

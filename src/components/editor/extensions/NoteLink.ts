import { Node, mergeAttributes } from '@tiptap/core';

export interface NoteLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  onNoteLinkClick?: (noteId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteLink: {
      /**
       * Insert a note link
       */
      insertNoteLink: (attrs: { noteId: string; noteTitle: string }) => ReturnType;
    };
  }
}

export const NoteLink = Node.create<NoteLinkOptions>({
  name: 'noteLink',

  group: 'inline',

  inline: true,

  selectable: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNoteLinkClick: undefined,
    };
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attributes) => {
          if (!attributes.noteId) {
            return {};
          }
          return {
            'data-note-id': attributes.noteId,
          };
        },
      },
      noteTitle: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-title'),
        renderHTML: (attributes) => {
          if (!attributes.noteTitle) {
            return {};
          }
          return {
            'data-note-title': attributes.noteTitle,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="noteLink"]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        {
          'data-type': 'noteLink',
          class:
            'note-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 cursor-pointer transition-colors font-medium text-sm',
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      ['span', { class: 'note-link-icon text-xs opacity-60' }, '📝'],
      ['span', { class: 'note-link-title' }, node.attrs.noteTitle || 'Untitled'],
    ];
  },

  addCommands() {
    return {
      insertNoteLink:
        (attrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const span = document.createElement('span');

      // Apply attributes
      Object.entries(
        mergeAttributes(
          {
            'data-type': 'noteLink',
            class:
              'note-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 cursor-pointer transition-colors font-medium text-sm',
          },
          this.options.HTMLAttributes,
          HTMLAttributes
        )
      ).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          span.setAttribute(key, String(value));
        }
      });

      // Create content
      const icon = document.createElement('span');
      icon.className = 'note-link-icon text-xs opacity-60';
      icon.textContent = '📝';

      const title = document.createElement('span');
      title.className = 'note-link-title';
      title.textContent = node.attrs.noteTitle || 'Untitled';

      span.appendChild(icon);
      span.appendChild(title);

      // Handle click
      span.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (this.options.onNoteLinkClick && node.attrs.noteId) {
          this.options.onNoteLinkClick(node.attrs.noteId);
        }
      });

      return {
        dom: span,
      };
    };
  },
});

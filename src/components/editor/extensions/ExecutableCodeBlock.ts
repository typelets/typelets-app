import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ExecutableCodeBlockNodeView } from './ExecutableCodeBlockNodeView';

export interface ExecutableCodeBlockOptions {
  languageClassPrefix: string;
  HTMLAttributes: Record<string, unknown>;
  defaultLanguage: string | null | undefined;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    executableCodeBlock: {
      /**
       * Set an executable code block
       */
      setExecutableCodeBlock: (attributes?: { language: string }) => ReturnType;
      /**
       * Toggle an executable code block
       */
      toggleExecutableCodeBlock: (attributes?: {
        language: string;
      }) => ReturnType;
    };
  }
}

export const inputRegex = /^```([a-z+#]*)?\s$/;

export const ExecutableCodeBlock = Node.create<ExecutableCodeBlockOptions>({
  name: 'executableCodeBlock',

  addOptions() {
    return {
      languageClassPrefix: 'language-',
      HTMLAttributes: {},
      defaultLanguage: null,
    };
  },

  content: 'text*',

  marks: '',

  group: 'block',

  code: true,

  defining: true,

  atom: true,

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: (element) => {
          const { languageClassPrefix } = this.options;
          const classNames = [...(element.firstElementChild?.classList || [])];
          const languages = classNames
            .filter((className) => className.startsWith(languageClassPrefix))
            .map((className) => className.replace(languageClassPrefix, ''));
          const language = languages[0];

          if (!language) {
            return null;
          }

          return language;
        },
        rendered: false,
      },
      executable: {
        default: false,
        parseHTML: (element) => {
          return element.getAttribute('data-executable') === 'true';
        },
        renderHTML: (attributes) => {
          if (!attributes.executable) {
            return {};
          }

          return {
            'data-executable': attributes.executable,
          };
        },
      },
      output: {
        default: null,
        parseHTML: (element) => {
          const outputData = element.getAttribute('data-output');
          return outputData ? JSON.parse(outputData) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.output) {
            return {};
          }

          return {
            'data-output': JSON.stringify(attributes.output),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-executable="true"]',
        preserveWhitespace: 'full',
      },
      {
        tag: 'pre',
        getAttrs: (element) => {
          if (
            element instanceof HTMLElement &&
            element.hasAttribute('data-executable')
          ) {
            return {
              executable: element.getAttribute('data-executable') === 'true',
            };
          }
          return false;
        },
        preserveWhitespace: 'full',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-executable': node.attrs.executable ? 'true' : 'false',
      }),
      [
        'code',
        {
          class: node.attrs.language
            ? this.options.languageClassPrefix + node.attrs.language
            : null,
        },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      setExecutableCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleExecutableCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, 'paragraph', attributes);
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1],
          executable: true,
        }),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExecutableCodeBlockNodeView);
  },
});

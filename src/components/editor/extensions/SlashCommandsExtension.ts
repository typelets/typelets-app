import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import type { Editor } from '@tiptap/core';

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: { from: number; to: number }; props: { command: (params: { editor: Editor; range: { from: number; to: number } }) => void } }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
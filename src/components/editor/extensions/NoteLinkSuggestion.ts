import { Extension } from '@tiptap/core';
import { Suggestion, type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';

// Unique plugin key for note link suggestions (avoids conflict with slash commands)
const NoteLinkSuggestionPluginKey = new PluginKey('noteLinkSuggestion');

export interface NoteLinkSuggestionOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

export const NoteLinkSuggestion = Extension.create<NoteLinkSuggestionOptions>({
  name: 'noteLinkSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '[[',
        startOfLine: false,
        allowSpaces: true,
        pluginKey: NoteLinkSuggestionPluginKey,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: { noteId: string; noteTitle: string };
        }) => {
          // Delete the trigger characters and query, then insert the note link
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertNoteLink({
              noteId: props.noteId,
              noteTitle: props.noteTitle,
            })
            .run();
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

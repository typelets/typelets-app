import { 
  useState, 
  useEffect, 
  useImperativeHandle, 
  forwardRef,
  useCallback
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Link,
  Highlighter,
  FileText,
  Image,
} from 'lucide-react';

export interface CommandItem {
  title: string;
  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
  icon: React.ReactNode;
}

interface Range {
  from: number;
  to: number;
}

interface SlashCommandsListProps {
  command: (item: CommandItem) => void;
}

const commands: CommandItem[] = [
  {
    title: 'Heading 1',
    icon: <Heading1 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: 'Heading 2',
    icon: <Heading2 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: 'Heading 3',
    icon: <Heading3 className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run();
    },
  },
  {
    title: 'Bold',
    icon: <Bold className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMark('bold')
        .run();
    },
  },
  {
    title: 'Italic',
    icon: <Italic className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMark('italic')
        .run();
    },
  },
  {
    title: 'Underline',
    icon: <Underline className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMark('underline')
        .run();
    },
  },
  {
    title: 'Strikethrough',
    icon: <Strikethrough className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMark('strike')
        .run();
    },
  },
  {
    title: 'Highlight',
    icon: <Highlighter className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMark('highlight')
        .run();
    },
  },
  {
    title: 'Bullet List',
    icon: <List className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run();
    },
  },
  {
    title: 'Numbered List',
    icon: <ListOrdered className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run();
    },
  },
  {
    title: 'Task List',
    icon: <CheckSquare className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleTaskList()
        .run();
    },
  },
  {
    title: 'Blockquote',
    icon: <Quote className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .run();
    },
  },
  {
    title: 'Inline Code',
    icon: <Code className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMark('code')
        .run();
    },
  },
  {
    title: 'Code Block',
    icon: <Code className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .run();
    },
  },
  {
    title: 'Horizontal Rule',
    icon: <Minus className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run();
    },
  },
  {
    title: 'Link',
    icon: <Link className="h-4 w-4" />,
    command: ({ editor, range }) => {
      const url = window.prompt('Enter URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setLink({ href: url })
          .run();
      }
    },
  },
  {
    title: 'Table of Contents',
    icon: <FileText className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: 'tableOfContents' })
        .run();
    },
  },
  {
    title: 'Image',
    icon: <Image className="h-4 w-4" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert('Image is too large. Maximum size is 10MB.');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (result && typeof result === 'string') {
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'image',
                attrs: { src: result }
              })
              .run();
          }
        };
        reader.readAsDataURL(file);
      };

      input.click();
    },
  },
];

interface SlashCommandsHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandsList = forwardRef<SlashCommandsHandle, SlashCommandsListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback((index: number) => {
    const item = commands[index];
    if (item) {
      props.command(item);
    }
  }, [props]);

  const upHandler = useCallback(() => {
    setSelectedIndex((selectedIndex + commands.length - 1) % commands.length);
  }, [selectedIndex]);

  const downHandler = useCallback(() => {
    setSelectedIndex((selectedIndex + 1) % commands.length);
  }, [selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, []);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }), [upHandler, downHandler, selectItem, selectedIndex]);

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-2 max-h-80 overflow-y-auto">
      {commands.map((item, index) => (
        <button
          key={index}
          onClick={() => selectItem(index)}
          className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md transition-colors ${
            index === selectedIndex
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <span className="text-muted-foreground">{item.icon}</span>
          <span className="text-sm">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

SlashCommandsList.displayName = 'SlashCommandsList';
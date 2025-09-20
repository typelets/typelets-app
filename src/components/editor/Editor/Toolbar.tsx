import { type Editor } from '@tiptap/react';
import { ImageUpload } from '../extensions/ImageUpload';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Code,
  CheckSquare,
  ChevronDown,
  Link,
  Minus,
  Highlighter,
  FileText,
  Palette,
  RemoveFormatting,
  Copy,
  Smile,
  Codesandbox,
} from 'lucide-react';

import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';

import { LANGUAGES } from '../config/constants.ts';

interface ToolbarProps {
  editor: Editor | null;
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) {
    return null;
  }

  const setCodeBlock = (language: string) => {
    if (editor.isActive('codeBlock')) {
      editor.chain().focus().updateAttributes('codeBlock', { language }).run();
    } else {
      editor.chain().focus().toggleCodeBlock({ language }).run();
    }
  };

  const getCurrentLanguage = (): string => {
    if (editor.isActive('codeBlock')) {
      const attrs = editor.getAttributes('codeBlock');
      return (attrs.language as string) ?? 'plaintext';
    }
    return 'plaintext';
  };

  const currentLanguage = getCurrentLanguage();
  const currentLanguageLabel =
    LANGUAGES.find((lang) => lang.value === currentLanguage)?.label ??
    'Plain Text';

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // Cancelled
    if (url === null) {
      return;
    }

    // Empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="border-border bg-muted flex flex-wrap items-center gap-1 border-b p-2 dark:bg-gray-800">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
        className="disabled:opacity-50"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
        className="disabled:opacity-50"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <div className="bg-border mx-1 h-6 w-px" />

      <Button
        variant={editor.isActive('bold') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('underline') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('strike') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('code') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('link') ? 'default' : 'ghost'}
        size="sm"
        onClick={setLink}
        title="Add Link (Ctrl+K)"
      >
        <Link className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('highlight') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight Text"
      >
        <Highlighter className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Text Color">
            <Palette className="h-4 w-4" />
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="grid grid-cols-5 gap-1 p-2"
        >
          {[
            { label: 'Default', color: null },
            { label: 'Red', color: '#ef4444' },
            { label: 'Orange', color: '#f97316' },
            { label: 'Yellow', color: '#eab308' },
            { label: 'Green', color: '#22c55e' },
            { label: 'Blue', color: '#3b82f6' },
            { label: 'Indigo', color: '#6366f1' },
            { label: 'Purple', color: '#a855f7' },
            { label: 'Pink', color: '#ec4899' },
            { label: 'Gray', color: '#6b7280' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.color) {
                  editor.chain().focus().setColor(item.color).run();
                } else {
                  editor.chain().focus().unsetColor().run();
                }
              }}
              className="flex h-6 w-6 items-center justify-center rounded border border-gray-300 transition-transform hover:scale-110"
              style={{ backgroundColor: item.color || 'transparent' }}
              title={item.label}
            >
              {!item.color && <span className="text-xs leading-none">✕</span>}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="bg-border mx-1 h-6 w-px" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={editor.isActive('heading') ? 'default' : 'ghost'}
            size="sm"
            className="gap-1"
            title="Headings"
          >
            {editor.isActive('heading', { level: 1 }) ? (
              <Heading1 className="h-4 w-4" />
            ) : editor.isActive('heading', { level: 2 }) ? (
              <Heading2 className="h-4 w-4" />
            ) : editor.isActive('heading', { level: 3 }) ? (
              <Heading3 className="h-4 w-4" />
            ) : (
              <Heading1 className="h-4 w-4" />
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 p-1">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`mb-1 ${!editor.isActive('heading') ? 'bg-accent' : ''}`}
          >
            <span className="text-sm">Normal Text</span>
            {!editor.isActive('heading') && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={`mb-1 ${editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}`}
          >
            <Heading1 className="mr-2 h-4 w-4" />
            <span className="text-sm font-semibold">Heading 1</span>
            {editor.isActive('heading', { level: 1 }) && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={`mb-1 ${editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}`}
          >
            <Heading2 className="mr-2 h-4 w-4" />
            <span className="text-sm font-medium">Heading 2</span>
            {editor.isActive('heading', { level: 2 }) && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={
              editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''
            }
          >
            <Heading3 className="mr-2 h-4 w-4" />
            <span className="text-sm">Heading 3</span>
            {editor.isActive('heading', { level: 3 }) && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="bg-border mx-1 h-6 w-px" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={
              editor.isActive('bulletList') ||
              editor.isActive('orderedList') ||
              editor.isActive('taskList')
                ? 'default'
                : 'ghost'
            }
            size="sm"
            className="gap-1"
            title="Lists"
          >
            {editor.isActive('bulletList') ? (
              <List className="h-4 w-4" />
            ) : editor.isActive('orderedList') ? (
              <ListOrdered className="h-4 w-4" />
            ) : editor.isActive('taskList') ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 p-1">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`mb-1 ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
          >
            <List className="mr-2 h-4 w-4" />
            <span className="text-sm">Bullet List</span>
            {editor.isActive('bulletList') && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`mb-1 ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
          >
            <ListOrdered className="mr-2 h-4 w-4" />
            <span className="text-sm">Numbered List</span>
            {editor.isActive('orderedList') && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'bg-accent' : ''}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            <span className="text-sm">Task List</span>
            {editor.isActive('taskList') && (
              <span className="ml-auto text-xs opacity-60">✓</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="bg-border mx-1 h-6 w-px" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
            size="sm"
            className="gap-1"
            title="Code Block"
          >
            <Code className="h-4 w-4" />
            {editor.isActive('codeBlock') && (
              <>
                <span className="hidden text-xs sm:inline">
                  {currentLanguageLabel}
                </span>
                <ChevronDown className="h-3 w-3" />
              </>
            )}
            {!editor.isActive('codeBlock') && (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {LANGUAGES.map((language) => (
            <DropdownMenuItem
              key={language.value}
              onClick={() => setCodeBlock(language.value)}
              className={currentLanguage === language.value ? 'bg-accent' : ''}
            >
              <span className="text-sm">{language.label}</span>
              {currentLanguage === language.value && (
                <span className="ml-auto text-xs opacity-60">✓</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className="text-muted-foreground"
          >
            {editor.isActive('codeBlock')
              ? 'Remove Code Block'
              : 'Plain Code Block'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant={editor.isActive('executableCodeBlock') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().setExecutableCodeBlock({ language: 'javascript', executable: true }).run()}
        title="Executable Code Block"
      >
        <Codesandbox className="h-4 w-4" />
      </Button>

      <Button
        variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="bg-border mx-1 h-6 w-px" />

      <ImageUpload editor={editor} />

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent({ type: 'tableOfContents' })
            .run()
        }
        title="Table of Contents"
      >
        <FileText className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div className="bg-border mx-1 h-6 w-px" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
        }
        title="Clear Formatting"
      >
        <RemoveFormatting className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          const content = editor.getText();
          navigator.clipboard.writeText(content);
        }}
        title="Copy to Clipboard"
      >
        <Copy className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Insert Emoji">
            <Smile className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2">
          <div className="grid grid-cols-8 gap-1">
            {[
              '😀',
              '😃',
              '😄',
              '😁',
              '😅',
              '😂',
              '🤣',
              '😊',
              '😇',
              '🙂',
              '😉',
              '😌',
              '😍',
              '🥰',
              '😘',
              '😗',
              '😙',
              '😚',
              '😋',
              '😛',
              '😜',
              '🤪',
              '😝',
              '🤑',
              '🤗',
              '🤭',
              '🤫',
              '🤔',
              '🤐',
              '🤨',
              '😐',
              '😑',
              '😶',
              '😏',
              '😒',
              '🙄',
              '😬',
              '🤥',
              '😺',
              '😔',
              '😪',
              '🤤',
              '😴',
              '😷',
              '🤒',
              '🤕',
              '🤢',
              '🤮',
              '🤧',
              '🥵',
              '🥶',
              '😎',
              '🤓',
              '🧐',
              '😕',
              '😟',
              '🙁',
              '☹️',
              '😮',
              '😯',
              '😲',
              '😳',
              '🥺',
              '😦',
              '😧',
              '😨',
              '😰',
              '😥',
              '😢',
              '😭',
              '😱',
              '😖',
              '😣',
              '😞',
              '😓',
              '😩',
              '😫',
              '🥱',
              '😤',
              '😡',
              '😠',
              '🤬',
              '😈',
              '👿',
              '💀',
              '☠️',
              '💩',
              '🤡',
              '👍',
              '👎',
              '👌',
              '✌️',
              '🤞',
              '🤟',
              '🤘',
              '🤙',
              '👏',
              '🙌',
              '👐',
              '🤲',
              '🙏',
              '✍️',
              '💪',
              '🦾',
              '❤️',
              '🧡',
              '💛',
              '💚',
              '💙',
              '💜',
              '🖤',
              '🤍',
              '🤎',
              '💔',
              '❣️',
              '💕',
              '💞',
              '💓',
              '💗',
              '💖',
              '💘',
              '💝',
              '⭐',
              '🌟',
              '✨',
              '⚡',
              '🔥',
              '💥',
              '🎉',
              '🎊',
              '🎈',
              '🎁',
              '🎯',
              '🏆',
              '🥇',
              '🥈',
            ].map((emoji) => (
              <button
                key={emoji}
                onClick={() =>
                  editor.chain().focus().insertContent(emoji).run()
                }
                className="rounded p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

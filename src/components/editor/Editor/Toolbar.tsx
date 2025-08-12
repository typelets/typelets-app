import { type Editor } from '@tiptap/react';
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
  Undo,
  Redo,
  Code,
  CheckSquare,
  ChevronDown,
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

  return (
    <div className="border-border bg-muted flex flex-wrap items-center gap-1 border-b p-2">
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

      <div className="bg-border mx-1 h-6 w-px" />

      <Button
        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <div className="bg-border mx-1 h-6 w-px" />

      <Button
        variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('taskList') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task List (Checkboxes)"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>

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
        variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
    </div>
  );
}

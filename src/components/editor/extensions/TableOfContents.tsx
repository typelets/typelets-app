import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { useEffect, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, FileText, X } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsComponentProps {
  editor: Editor;
  deleteNode: () => void;
}

const TableOfContentsComponent = ({ editor, deleteNode }: TableOfContentsComponentProps) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const updateHeadings = () => {
      const headingElements: Heading[] = [];
      
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const id = `heading-${pos}`;
          headingElements.push({
            level: node.attrs.level,
            text: node.textContent,
            id,
          });
        }
      });
      
      setHeadings(headingElements);
    };

    updateHeadings();
    
    editor.on('update', updateHeadings);
    editor.on('selectionUpdate', updateHeadings);
    
    return () => {
      editor.off('update', updateHeadings);
      editor.off('selectionUpdate', updateHeadings);
    };
  }, [editor]);

  const scrollToHeading = useCallback((index: number) => {
    let currentIndex = 0;
    
    editor.state.doc.descendants((node: any, pos: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (node.type.name === 'heading') {
        if (currentIndex === index) {
          editor.commands.focus();
          editor.commands.setTextSelection(pos + 1);
          setTimeout(() => {
            const element = editor.view.domAtPos(pos + 1);
            if (element && element.node) {
              const domElement = element.node.nodeType === 1 ? element.node : element.node.parentElement;
              if (domElement) {
                (domElement as HTMLElement).scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
              }
            }
          }, 50);
          return false; // Stop traversing
        }
        currentIndex++;
      }
    });
  }, [editor]);

  if (headings.length === 0) {
    return (
      <NodeViewWrapper className="toc-wrapper">
        <div className="bg-muted/50 border border-border rounded-lg p-4 my-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm">No headings found. Add headings to generate table of contents.</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="toc-wrapper">
      <div className="bg-muted/30 border border-border rounded-lg p-4 my-4 not-prose group relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="hover:bg-accent rounded p-1 transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <h3 className="font-semibold text-sm">Table of Contents</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{headings.length} sections</span>
            <button
              onClick={() => deleteNode()}
              className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-1 transition-all"
              title="Remove Table of Contents"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {expanded && (
          <div className="space-y-1">
            {headings.map((heading, index) => (
              <button
                key={index}
                onClick={() => scrollToHeading(index)}
                className={`
                  block w-full text-left text-sm hover:bg-accent/50 rounded px-2 py-1.5 transition-colors
                  ${heading.level === 1 ? 'font-semibold' : ''}
                  ${heading.level === 2 ? 'pl-6' : ''}
                  ${heading.level === 3 ? 'pl-10 text-muted-foreground' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  {heading.level > 1 && (
                    <span className="text-muted-foreground/50">
                      {heading.level === 2 ? '•' : '◦'}
                    </span>
                  )}
                  <span className="truncate">{heading.text || 'Untitled'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const TableOfContents = Node.create({
  name: 'tableOfContents',

  group: 'block',

  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-toc]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-toc': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsComponent);
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-t': () => this.editor.commands.insertContent({ type: this.name }),
    };
  },
});


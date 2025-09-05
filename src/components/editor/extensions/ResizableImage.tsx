import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';


const ImageComponent = (props: {
  node: {
    attrs: {
      src: string;
      alt?: string;
      title?: string;
      width?: string;
    };
  };
  deleteNode: () => void;
  updateAttributes: (attrs: { width?: string | null }) => void;
}) => {
  const { node, deleteNode, updateAttributes } = props;
  const [showControls, setShowControls] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialWidth = node.attrs.width || 'auto';
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    setWidth(node.attrs.width || 'auto');
  }, [node.attrs.width]);

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = imageRef.current?.offsetWidth || 0;
    const maxWidth = containerRef.current?.parentElement?.offsetWidth || 800;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(Math.max(100, startWidth + (e.clientX - startX)), maxWidth);
      setWidth(`${newWidth}px`);
      updateAttributes({ width: `${newWidth}px` });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const resetSize = () => {
    setWidth('auto');
    updateAttributes({ width: null });
  };

  return (
    <NodeViewWrapper className="image-wrapper">
      <div 
        ref={containerRef}
        className={`relative inline-block group ${isResizing ? 'select-none' : ''}`}
        style={{ width: width === 'auto' ? 'auto' : width, maxWidth: '100%' }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          className="rounded-lg w-full h-auto block shadow-md"
          draggable={false}
        />
        
        {showControls && (
          <>
            {/* Delete button */}
            <button
              onClick={deleteNode}
              className="absolute top-2 right-2 bg-background/90 hover:bg-background rounded-md p-1.5 shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Reset size button */}
            {width !== 'auto' && (
              <button
                onClick={resetSize}
                className="absolute top-2 right-10 bg-background/90 hover:bg-background rounded-md p-1.5 shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Reset to original size"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}

            {/* Resize handles */}
            <div
              className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onMouseDown={handleResize}
            >
              <div className="absolute inset-y-0 right-0 w-1 bg-primary/50 hover:bg-primary transition-colors" />
            </div>
            
            <div
              className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startX = e.clientX;
                const startWidth = imageRef.current?.offsetWidth || 0;
                const maxWidth = containerRef.current?.parentElement?.offsetWidth || 800;

                const handleMouseMove = (e: MouseEvent) => {
                  const delta = startX - e.clientX;
                  const newWidth = Math.min(Math.max(100, startWidth + delta), maxWidth);
                  setWidth(`${newWidth}px`);
                  updateAttributes({ width: `${newWidth}px` });
                };

                const handleMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                setIsResizing(true);
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-primary/50 hover:bg-primary transition-colors" />
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
});
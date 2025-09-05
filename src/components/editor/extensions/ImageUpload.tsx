import { useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  editor: Editor | null;
}

export function ImageUpload({ editor }: ImageUploadProps) {
  const handleImageUpload = useCallback(() => {
    if (!editor) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;

    input.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files) return;

      for (const file of Array.from(files)) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (result && typeof result === 'string') {
            editor
              .chain()
              .focus()
              .setImage({ src: result })
              .run();
          }
        };
        reader.readAsDataURL(file);
      }
    };

    input.click();
  }, [editor]);

  if (!editor) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleImageUpload}
      title="Upload Image"
    >
      <ImageIcon className="h-4 w-4" />
    </Button>
  );
}

// Handle paste event for images
interface EditorView {
  state: {
    tr: {
      replaceSelectionWith: (node: unknown) => void;
    };
    schema: {
      nodes: {
        image: {
          create: (attrs: { src: string }) => unknown;
        };
      };
    };
  };
  dispatch: (tr: unknown) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const handleImagePaste = (view: EditorView, event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return false;

  for (const item of Array.from(items)) {
    if (item.type.startsWith('image/')) {
      event.preventDefault();
      
      const file = item.getAsFile();
      if (!file) continue;

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image is too large. Maximum size is 10MB.');
        return true;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (result && typeof result === 'string') {
          const { state } = view;
          const { tr } = state;
          
          tr.replaceSelectionWith(
            state.schema.nodes.image.create({
              src: result,
            })
          );
          
          view.dispatch(tr);
        }
      };
      reader.readAsDataURL(file);
      
      return true;
    }
  }

  return false;
};
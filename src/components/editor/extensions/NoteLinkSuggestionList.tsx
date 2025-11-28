import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';
import { FileText, FolderOpen } from 'lucide-react';
import type { NoteLinkItem } from './noteLinkUtils';

interface NoteLinkSuggestionListProps {
  items: NoteLinkItem[];
  command: (item: NoteLinkItem) => void;
  query: string;
}

interface NoteLinkSuggestionHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const NoteLinkSuggestionList = forwardRef<
  NoteLinkSuggestionHandle,
  NoteLinkSuggestionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    if (!props.query) {
      return props.items.slice(0, 10); // Show first 10 when no query
    }

    const query = props.query.toLowerCase();
    return props.items
      .filter((item) => item.noteTitle.toLowerCase().includes(query))
      .slice(0, 10);
  }, [props.items, props.query]);

  const selectItem = useCallback(
    (index: number) => {
      const item = filteredItems[index];
      if (item) {
        props.command(item);
      }
    },
    [filteredItems, props]
  );

  const upHandler = useCallback(() => {
    setSelectedIndex((prev) =>
      prev <= 0 ? filteredItems.length - 1 : prev - 1
    );
  }, [filteredItems.length]);

  const downHandler = useCallback(() => {
    setSelectedIndex((prev) =>
      prev >= filteredItems.length - 1 ? 0 : prev + 1
    );
  }, [filteredItems.length]);

  // Reset selection when filtered items change
  /* eslint-disable react-hooks/set-state-in-effect -- Legitimate reset on data change */
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useImperativeHandle(
    ref,
    () => ({
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

        if (event.key === 'Escape') {
          return true;
        }

        return false;
      },
    }),
    [upHandler, downHandler, selectItem, selectedIndex]
  );

  if (filteredItems.length === 0) {
    return (
      <div className="bg-background border-border rounded-lg border p-3 shadow-lg">
        <p className="text-muted-foreground text-sm">No notes found</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Type to search for a note to link
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background border-border max-h-64 min-w-64 overflow-y-auto rounded-lg border p-1.5 shadow-lg">
      <div className="text-muted-foreground mb-1.5 px-2 text-xs font-medium">
        Link to note
      </div>
      {filteredItems.map((item, index) => (
        <button
          key={item.noteId}
          onClick={() => selectItem(index)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50'
          }`}
        >
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {item.noteTitle || 'Untitled'}
            </div>
            {item.folderName && (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <FolderOpen className="h-3 w-3" />
                <span className="truncate">{item.folderName}</span>
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

NoteLinkSuggestionList.displayName = 'NoteLinkSuggestionList';

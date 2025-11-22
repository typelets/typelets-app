import { X, Network, Code2, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRef, useState, useEffect } from 'react';

export interface Tab {
  id: string;
  noteId: string;
  title: string;
  type: 'note' | 'diagram' | 'code';
  isDirty: boolean;
  isPublished?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onCloseAll?: () => void;
}

const TabIcon = ({ type, isPublished }: { type: Tab['type']; isPublished?: boolean }) => {
  const typeIcon = (() => {
    switch (type) {
      case 'code':
        return <Code2 className="h-3.5 w-3.5 text-green-500" />;
      case 'diagram':
        return <Network className="h-3.5 w-3.5 text-cyan-500" />;
      default:
        return null;
    }
  })();

  if (isPublished && typeIcon) {
    return (
      <div className="flex items-center gap-1">
        {typeIcon}
        <Globe className="h-3 w-3 text-emerald-500" />
      </div>
    );
  }

  if (isPublished) {
    return <Globe className="h-3.5 w-3.5 text-emerald-500" />;
  }

  return typeIcon;
};

export function TabBar({ tabs, activeTabId, onTabClick, onTabClose, onCloseAll }: TabBarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [showOverflow, setShowOverflow] = useState(false);

  // Check if we need overflow menu
  useEffect(() => {
    const checkOverflow = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      setShowOverflow(container.scrollWidth > container.clientWidth);
    };

    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tabs]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeTabId) return;

    const activeTabElement = tabRefs.current.get(activeTabId);
    if (activeTabElement) {
      activeTabElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeTabId]);

  if (tabs.length === 0) return null;

  return (
    <div className="border-b bg-muted/30">
      <div className="relative flex items-center">
        {/* Tabs container */}
        <div
          ref={scrollContainerRef}
          className={`flex items-center gap-0.5 overflow-x-auto pt-2 flex-1 ${
            showOverflow ? 'pl-2 pr-16' : 'px-2'
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;

            return (
              <div
                key={tab.id}
                ref={(el) => {
                  if (el) {
                    tabRefs.current.set(tab.id, el);
                  } else {
                    tabRefs.current.delete(tab.id);
                  }
                }}
                className={`
                  group relative flex items-center gap-2 px-3 py-2 cursor-pointer
                  transition-all min-w-0 border-t border-x flex-shrink-0
                  ${isActive
                    ? 'bg-background border-border shadow-sm'
                    : 'bg-muted border-transparent hover:bg-muted/80'
                  }
                `}
                onClick={() => onTabClick(tab.id)}
              >
                <TabIcon type={tab.type} isPublished={tab.isPublished} />
                <span
                  className={`text-sm truncate max-w-[150px] ${
                    isActive ? 'font-medium' : 'font-normal'
                  }`}
                >
                  {tab.title || 'Untitled'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 w-5 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Overflow dropdown menu */}
        {showOverflow && tabs.length > 0 && (
          <div className="pr-2 pt-2 pl-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 space-y-1 p-2">
                {tabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    className={`group py-2 ${tab.id === activeTabId ? 'bg-accent' : ''}`}
                    onClick={() => onTabClick(tab.id)}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    >
                      <TabIcon type={tab.type} isPublished={tab.isPublished} />
                      <span className="truncate flex-1">
                        {tab.title || 'Untitled'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 w-5 p-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTabClose(tab.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
                {onCloseAll && tabs.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onCloseAll}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Close All Tabs
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <style>{`
        .overflow-x-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

import * as Dialog from '@radix-ui/react-dialog';
import { BarChart3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsageSection } from './UsageSection';

interface UsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsageDialog({ open, onOpenChange }: UsageDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <Dialog.Title className="text-lg font-semibold">Usage & Limits</Dialog.Title>
              </div>
              <Dialog.Description className="text-muted-foreground text-sm">
                Monitor your account usage and limits
              </Dialog.Description>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 min-h-[400px]">
            <UsageSection />
          </div>

          <Dialog.Close asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
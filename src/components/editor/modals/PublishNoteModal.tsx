import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Copy, Check, X, ExternalLink, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Note } from '@/types/note';

interface PublishNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  onPublish: (noteId: string, authorName?: string) => Promise<unknown>;
  onUnpublish: (noteId: string) => Promise<boolean>;
}

export default function PublishNoteModal({
  isOpen,
  onClose,
  note,
  onPublish,
  onUnpublish,
}: PublishNoteModalProps) {
  const [authorName, setAuthorName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPublished = note?.isPublished;
  const publicUrl = note?.publicSlug
    ? `${window.location.origin}/p/${note.publicSlug}`
    : null;

  useEffect(() => {
    if (isOpen) {
      setAuthorName('');
      setError(null);
      setCopied(false);
      // Focus author name input after modal opens (only for unpublished notes)
      if (!isPublished) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, isPublished]);

  const handlePublish = useCallback(async () => {
    if (!note || isPublishing) return;

    setIsPublishing(true);
    setError(null);

    try {
      const result = await onPublish(note.id, authorName || undefined);
      if (!result) {
        setError('Failed to publish note. Please try again.');
      }
    } catch (err) {
      setError('Failed to publish note. Please try again.');
      console.error('Publish error:', err);
    } finally {
      setIsPublishing(false);
    }
  }, [note, authorName, isPublishing, onPublish]);

  const handleUnpublish = useCallback(async () => {
    if (!note || isUnpublishing) return;

    setIsUnpublishing(true);
    setError(null);

    try {
      const success = await onUnpublish(note.id);
      if (success) {
        onClose();
      } else {
        setError('Failed to unpublish note. Please try again.');
      }
    } catch (err) {
      setError('Failed to unpublish note. Please try again.');
      console.error('Unpublish error:', err);
    } finally {
      setIsUnpublishing(false);
    }
  }, [note, isUnpublishing, onUnpublish, onClose]);

  const handleCopyUrl = useCallback(async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [publicUrl]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isPublished) {
      e.preventDefault();
      handlePublish();
    }
  };

  const handleClose = () => {
    if (!isPublishing && !isUnpublishing) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="mr-8 space-y-1">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <Globe className="h-5 w-5" />
                {isPublished ? 'Published Note' : 'Publish Note'}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                {isPublished ? (
                  <>
                    <span className="font-bold">{note?.title || 'Untitled Note'}</span>{' '}
                    is publicly available.
                  </>
                ) : (
                  <>
                    Create a public, shareable version of{' '}
                    <span className="font-bold">{note?.title || 'Untitled Note'}</span>.
                  </>
                )}
              </Dialog.Description>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4">
            {error && (
              <div className="rounded-md bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            {isPublished && publicUrl ? (
              // Published state - show URL and options
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Public URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={publicUrl}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyUrl}
                      title="Copy URL"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(publicUrl, '_blank')}
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-muted-foreground text-sm">
                    Changes to your note are automatically synced to the public version
                    when you save.
                  </p>
                </div>

                {note?.publicUpdatedAt && (
                  <p className="text-muted-foreground text-xs">
                    Last synced: {new Date(note.publicUpdatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              // Unpublished state - show publish form
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="authorName">Author name (optional)</Label>
                  <Input
                    ref={inputRef}
                    id="authorName"
                    placeholder="Your name or pseudonym"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isPublishing}
                  />
                  <p className="text-muted-foreground text-xs">
                    Displayed on the public page. Leave blank to publish anonymously.
                  </p>
                </div>

                <div className="bg-amber-100 dark:bg-amber-900/30 rounded-md p-3">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    <strong>⚠️ Warning:</strong> Publishing bypasses end-to-end encryption.
                    An unencrypted copy will be stored on our servers and anyone with the
                    link can view it.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2">
              {isPublished ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleUnpublish}
                    disabled={isUnpublishing}
                  >
                    {isUnpublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Unpublishing...
                      </>
                    ) : (
                      'Unpublish'
                    )}
                  </Button>
                  <Button variant="outline" onClick={onClose}>
                    Done
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose} disabled={isPublishing}>
                    Cancel
                  </Button>
                  <Button onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Publish
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          <Dialog.Close asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4"
              aria-label="Close"
              disabled={isPublishing || isUnpublishing}
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

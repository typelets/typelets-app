import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Lock, X, AlertCircle, AlertTriangle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setupMasterPassword } from '@/lib/encryption';

interface ChangeMasterPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangeMasterPasswordDialog({
  open,
  onOpenChange,
  onSuccess,
}: ChangeMasterPasswordDialogProps) {
  const { user } = useUser();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const newPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNewPassword('');
      setConfirmPassword('');
      setAcknowledged(false);
      setError('');
      setIsChanging(false);

      setTimeout(() => {
        newPasswordRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleChange = async () => {
    if (!user?.id || isChanging) return;

    if (!acknowledged) {
      setError('Please acknowledge that you understand the consequences');
      return;
    }

    setError('');
    setIsChanging(true);

    try {
      if (newPassword !== confirmPassword) {
        setError('Master passwords do not match');
        setIsChanging(false);
        return;
      }

      if (newPassword.length < 8) {
        setError('Master password must be at least 8 characters');
        setIsChanging(false);
        return;
      }

      await setupMasterPassword(newPassword, user.id);

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError('Failed to change master password. Please try again.');
      console.error('Password change error:', err);
      setIsChanging(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newPassword && confirmPassword && acknowledged) {
      e.preventDefault();
      handleChange();
    }
  };

  const handleClose = () => {
    if (!isChanging) {
      onOpenChange(false);
    }
  };

  const canSubmit =
    newPassword && confirmPassword && acknowledged && !isChanging;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border shadow-lg">
          <div className="border-border flex items-center justify-between border-b p-4">
            <div className="space-y-1">
              <Dialog.Title className="flex items-center gap-2 text-lg font-semibold">
                <Lock className="h-5 w-5" />
                Change Master Password
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                Create a new master password for encryption
              </Dialog.Description>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              <div className="rounded-md border border-amber-500 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-300">
                      Important Warning
                    </p>
                    <div className="space-y-2 text-sm text-amber-800 dark:text-amber-400">
                      <p>
                        Changing your master password will make your existing
                        notes <strong>temporarily inaccessible</strong>.
                      </p>
                      <p>
                        Your notes are encrypted with your current master
                        password. After changing it:
                      </p>
                      <ul className="ml-2 list-inside list-disc space-y-1">
                        <li>
                          Existing notes cannot be opened with the new master
                          password
                        </li>
                        <li>
                          New notes will be encrypted with your new master
                          password
                        </li>
                      </ul>
                      <p className="font-medium">
                        Keep your old master password safe if you want to access
                        your existing notes later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1"
                  disabled={isChanging}
                />
                <label
                  htmlFor="acknowledge"
                  className="cursor-pointer text-sm select-none"
                >
                  I understand that I will need my old master password to access
                  existing notes, and new notes will use the new master password
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  New Master Password
                </label>
                <Input
                  ref={newPasswordRef}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="At least 8 characters"
                  disabled={isChanging}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Confirm New Master Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Confirm your new master password"
                  disabled={isChanging}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                </div>
              )}

              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-600 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <div className="space-y-1">
                    <p className="font-medium">Remember</p>
                    <p className="text-xs">
                      Store both your old and new master passwords safely.
                      You'll need the old master password to access existing
                      notes and the new master password for future notes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isChanging}
                >
                  Cancel
                </Button>
                <Button onClick={handleChange} disabled={!canSubmit}>
                  {isChanging ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Changing...
                    </>
                  ) : (
                    'Change Master Password'
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Dialog.Close asChild>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-4 right-4"
              aria-label="Close"
              disabled={isChanging}
            >
              <X className="h-4 w-4" />
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

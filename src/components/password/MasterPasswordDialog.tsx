import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  hasMasterPassword,
  setupMasterPassword,
  unlockWithMasterPassword,
} from '@/lib/encryption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MasterPasswordDialogProps {
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function MasterPasswordDialog({
  userId,
  onSuccess,
  onCancel,
}: MasterPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewSetup, setIsNewSetup] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if this is first time setup or unlock
    setIsNewSetup(!hasMasterPassword(userId));
  }, [userId]);

  useEffect(() => {
    // Focus input when modal opens
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isNewSetup) {
        // Setting up for first time
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters');
          setIsLoading(false);
          return;
        }

        await setupMasterPassword(password, userId);
        onSuccess();
      } else {
        // Unlocking on new device
        const success = await unlockWithMasterPassword(password, userId);
        if (success) {
          onSuccess();
        } else {
          setError('Incorrect master password. Please try again.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Master password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={true}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80" />
        <Dialog.Content className="bg-background fixed top-[50%] left-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-hidden rounded-lg border shadow-lg">
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b p-6">
            <div className="space-y-1">
              <Dialog.Title className="text-xl font-semibold">
                {isNewSetup
                  ? '🔐 Set Up Master Password'
                  : '🔓 Enter Master Password'}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm">
                {isNewSetup
                  ? 'Create a master password to encrypt your notes with end-to-end encryption.'
                  : 'Enter your master password to decrypt your notes on this device.'}
              </Dialog.Description>
            </div>

            {onCancel && !isNewSetup && (
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {isNewSetup && (
              <div className="bg-destructive/10 text-destructive mb-6 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <p className="mb-1 font-medium">
                      Important Security Notice
                    </p>
                    <p>
                      This password cannot be recovered if forgotten. Your notes
                      will be permanently inaccessible without it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Master Password
                </label>
                <Input
                  ref={passwordInputRef}
                  id="password"
                  type="password"
                  placeholder="Enter your master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {isNewSetup && (
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                  >
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your master password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Processing...
                    </>
                  ) : isNewSetup ? (
                    'Set Master Password'
                  ) : (
                    'Unlock Notes'
                  )}
                </Button>

                {onCancel && !isNewSetup && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>

            {!isNewSetup && (
              <div className="border-border mt-6 border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium">
                    Forgot your master password?
                  </span>
                  <br />
                  Unfortunately, your notes cannot be recovered without it due
                  to the end-to-end encryption.
                </p>
              </div>
            )}

            {isNewSetup && (
              <div className="border-border mt-6 border-t pt-4">
                <div className="text-muted-foreground space-y-2 text-sm">
                  <p className="font-medium">Password Requirements:</p>
                  <ul className="list-inside list-disc space-y-1 text-xs opacity-75">
                    <li>At least 8 characters long</li>
                    <li>Store it in a safe place</li>
                    <li>You'll need it to access notes on other devices</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

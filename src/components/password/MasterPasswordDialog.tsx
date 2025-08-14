import React, { useState, useEffect } from 'react';
import {
  hasMasterPassword,
  setupMasterPassword,
  unlockWithMasterPassword,
} from '@/lib/encryption';

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

  useEffect(() => {
    // Check if this is first time setup or unlock
    setIsNewSetup(!hasMasterPassword(userId));
  }, [userId]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          {isNewSetup
            ? '🔐 Set Up Master Password'
            : '🔓 Enter Master Password'}
        </h2>

        <div className="mb-6 text-gray-600">
          {isNewSetup ? (
            <div className="space-y-2">
              <p>
                Create a master password to encrypt your notes with end-to-end
                encryption.
              </p>
              <p className="text-sm font-medium text-amber-600">
                ⚠️ Important: This password cannot be recovered if forgotten.
                Your notes will be permanently inaccessible without it.
              </p>
            </div>
          ) : (
            <p>
              Enter your master password to decrypt your notes on this device.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Master Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              autoFocus
              disabled={isLoading}
            />
          </div>

          {isNewSetup && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your master password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? 'Processing...'
                : isNewSetup
                  ? 'Set Master Password'
                  : 'Unlock Notes'}
            </button>

            {onCancel && !isNewSetup && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="rounded-md bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {!isNewSetup && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              <span className="font-medium">Forgot your master password?</span>
              <br />
              Unfortunately, your notes cannot be recovered without it due to
              the end-to-end encryption.
            </p>
          </div>
        )}

        {isNewSetup && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-medium">Password Requirements:</p>
              <ul className="list-inside list-disc space-y-1 text-gray-500">
                <li>At least 8 characters long</li>
                <li>Store it in a safe place</li>
                <li>You'll need it to access notes on other devices</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

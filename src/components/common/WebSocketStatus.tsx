import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WebSocketStatus } from '@/types/websocket';

interface WebSocketStatusProps {
  status: WebSocketStatus;
  isConnected: boolean;
  isAuthenticated: boolean;
  reconnectAttempts: number;
  lastSync: number | null;
  joinedNotes: string[];
  error: string | null;
  onReconnect: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClearError: () => void;
  showDetails?: boolean;
}

const getStatusIcon = (_status: WebSocketStatus, isConnected: boolean, isAuthenticated: boolean) => {
  // Keep wifi icons but with proper colors
  const isConnectedAndAuth = isConnected && isAuthenticated;

  if (isConnectedAndAuth) {
    return <Wifi className="h-3 w-3 text-green-500" />;
  } else {
    return <WifiOff className="h-3 w-3 text-red-500" />;
  }
};

const getStatusText = (status: WebSocketStatus, isAuthenticated: boolean) => {
  // Simplified: only show Connected or Disconnected
  const isConnectedAndAuth = (status === 'connected' || status === 'authenticated') && isAuthenticated;

  return isConnectedAndAuth ? 'Connected' : 'Disconnected';
};

const getStatusColor = (status: WebSocketStatus, isAuthenticated: boolean) => {
  // Simplified: green for connected, gray for disconnected
  const isConnectedAndAuth = (status === 'connected' || status === 'authenticated') && isAuthenticated;

  return isConnectedAndAuth ? 'text-green-600' : 'text-gray-500';
};

const formatLastSync = (lastSync: number | null) => {
  if (!lastSync) return 'Never';

  const now = Date.now();
  const diff = now - lastSync;

  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return new Date(lastSync).toLocaleDateString();
};

export function WebSocketStatus({
  status,
  isConnected,
  isAuthenticated,
  reconnectAttempts,
  lastSync,
  joinedNotes,
  error,
  onReconnect,
  onConnect,
  onDisconnect,
  onClearError,
  showDetails = true,
}: WebSocketStatusProps) {
  const statusText = getStatusText(status, isAuthenticated);
  const statusColor = getStatusColor(status, isAuthenticated);
  const statusIcon = getStatusIcon(status, isConnected, isAuthenticated);
  const isConnectedAndAuth = isConnected && isAuthenticated;

  // Simple indicator mode (just icon)
  if (!showDetails) {
    return (
      <div className="flex items-center" title={statusText}>
        {statusIcon}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-1 px-1.5 py-0.5 hover:bg-muted rounded cursor-default" title={statusText}>
          {statusIcon}
          <span className="hidden sm:inline">
            {statusText}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="p-2">
          <div className="flex items-center gap-2 mb-2">
            {statusIcon}
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>

          {error && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <div className="font-medium mb-1">Error:</div>
              <div>{error}</div>
            </div>
          )}

          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={statusColor}>{status}</span>
            </div>

            <div className="flex justify-between">
              <span>Connected:</span>
              <span>{isConnected ? 'Yes' : 'No'}</span>
            </div>

            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span>{isAuthenticated ? 'Yes' : 'No'}</span>
            </div>

            <div className="flex justify-between">
              <span>Joined Notes:</span>
              <span>{joinedNotes.length}</span>
            </div>

            <div className="flex justify-between">
              <span>Last Sync:</span>
              <span>{formatLastSync(lastSync)}</span>
            </div>

            {reconnectAttempts > 0 && (
              <div className="flex justify-between">
                <span>Reconnect Attempts:</span>
                <span>{reconnectAttempts}</span>
              </div>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {isConnectedAndAuth ? (
          <DropdownMenuItem onClick={onDisconnect} className="text-xs">
            <WifiOff className="mr-2 h-3 w-3" />
            Disconnect
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onConnect} className="text-xs">
            <Wifi className="mr-2 h-3 w-3" />
            Connect
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onReconnect} className="text-xs">
          <RefreshCw className="mr-2 h-3 w-3" />
          Reconnect
        </DropdownMenuItem>

        {error && (
          <DropdownMenuItem onClick={onClearError} className="text-xs">
            <CheckCircle className="mr-2 h-3 w-3" />
            Clear Error
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for status bars
export function WebSocketStatusCompact({
  status,
  isAuthenticated,
  lastSync,
}: Pick<WebSocketStatusProps, 'status' | 'isAuthenticated' | 'lastSync'>) {
  const isConnectedAndAuth = (status === 'connected' || status === 'authenticated') && isAuthenticated;
  const statusIcon = getStatusIcon(status, isConnectedAndAuth, isAuthenticated);
  const statusText = isConnectedAndAuth ? 'Connected' : 'Disconnected';

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-default"
        title={`${statusText}${lastSync ? ` • Last sync: ${formatLastSync(lastSync)}` : ''}`}
      >
        {statusIcon}
        <span className="hidden sm:inline">
          {statusText}
        </span>
      </div>
    </div>
  );
}

// Sync indicator for showing when sync is in progress
export function SyncIndicator({
  isVisible,
  message = 'Syncing...'
}: {
  isVisible: boolean;
  message?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span>{message}</span>
    </div>
  );
}

// Toast-like notification for sync events
export function SyncNotification({
  type,
  message,
  isVisible,
  onDismiss,
}: {
  type: 'success' | 'error' | 'info';
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
}) {
  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    info: <Clock className="h-4 w-4 text-blue-500" />,
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 border rounded shadow-sm ${colors[type]} max-w-sm`}>
      {icons[type]}
      <span className="text-sm flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="text-gray-500 hover:text-gray-700 ml-2"
      >
        ×
      </button>
    </div>
  );
}
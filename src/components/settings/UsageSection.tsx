import { useEffect, useState } from 'react';
import { HardDrive, FileText, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { api, type ApiUserUsage } from '@/lib/api/api';
import { cn } from '@/lib/utils';

interface UsageSectionProps {
  className?: string;
}

export function UsageSection({ className }: UsageSectionProps) {
  const [usage, setUsage] = useState<ApiUserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await api.getCurrentUser(true);
      if (user.usage) {
        setUsage(user.usage);
      }
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };


  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-full min-h-[350px]', className)}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className={cn('space-y-4', className)}>
        <h3 className="text-lg font-semibold">Usage & Limits</h3>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{error || 'Usage data not available'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">Usage & Limits</h3>
      
      <div className="space-y-4">
        {/* Storage Usage */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatBytes(usage.storage.totalBytes)} / {usage.storage.limitGB} GB
            </span>
          </div>
          
          <Progress 
            value={Math.max(0.1, (usage.storage.totalBytes / (usage.storage.limitGB * 1024 * 1024 * 1024)) * 100)} 
            className="h-2"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {(() => {
                const calculatedPercent = (usage.storage.totalBytes / (usage.storage.limitGB * 1024 * 1024 * 1024)) * 100;
                if (calculatedPercent < 1 && calculatedPercent > 0) {
                  return `${calculatedPercent.toFixed(2)}% used`;
                } else if (calculatedPercent === 0) {
                  return '0% used';
                } else {
                  return `${calculatedPercent.toFixed(1)}% used`;
                }
              })()}
            </span>
            <span>{formatBytes((usage.storage.limitGB * 1024 * 1024 * 1024) - usage.storage.totalBytes)} free</span>
          </div>

          {usage.storage.usagePercent >= 80 && (
            <div className={cn(
              'text-xs p-2 rounded-md',
              usage.storage.usagePercent >= 95 
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
            )}>
              {usage.storage.usagePercent >= 95 
                ? '⚠️ Storage almost full. Consider upgrading soon.'
                : '📊 Storage usage is getting high.'}
            </div>
          )}
        </div>

        {/* Notes Count */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Notes</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {usage.notes.count} / {usage.notes.limit}
            </span>
          </div>
          
          <Progress 
            value={usage.notes.usagePercent} 
            className="h-2"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {usage.notes.usagePercent < 1 && usage.notes.usagePercent > 0 
                ? `${usage.notes.usagePercent.toFixed(2)}% used`
                : `${usage.notes.usagePercent.toFixed(1)}% used`
              }
            </span>
            <span>{usage.notes.limit - usage.notes.count} notes remaining</span>
          </div>

          {usage.notes.usagePercent >= 80 && (
            <div className={cn(
              'text-xs p-2 rounded-md',
              usage.notes.usagePercent >= 95 
                ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
            )}>
              {usage.notes.usagePercent >= 95 
                ? '⚠️ Note limit almost reached. Consider upgrading soon.'
                : '📝 Approaching note limit.'}
            </div>
          )}
        </div>
      </div>

      {/* Plan Information */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          You're on the <span className="font-medium">Free Plan</span>. 
          {(usage.storage.usagePercent >= 80 || usage.notes.usagePercent >= 80) && (
            <span> Consider upgrading for more storage and unlimited notes.</span>
          )}
        </p>
      </div>
    </div>
  );
}
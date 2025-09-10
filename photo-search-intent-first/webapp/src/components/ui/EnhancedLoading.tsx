import React from 'react';
import { Loader2, AlertCircle, CheckCircle, Clock, Image, Search, Upload } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function LoadingSpinner({ size = 'md', variant = 'default', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const variantClasses = {
    default: 'text-gray-600',
    primary: 'text-blue-600',
    secondary: 'text-purple-600',
    accent: 'text-pink-600'
  };

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    />
  );
}

export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressBar({ 
  progress, 
  label, 
  variant = 'default', 
  size = 'md', 
  showPercentage = true,
  className = '' 
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-gray-700">{label}</span>}
          {showPercentage && <span className="text-gray-600">{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} ${variantClasses[variant]} transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

export interface LoadingStateProps {
  icon?: React.ComponentType<any>;
  title: string;
  description?: string;
  progress?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({
  icon: Icon = Loader2,
  title,
  description,
  progress,
  variant = 'default',
  size = 'md',
  className = ''
}: LoadingStateProps) {
  const sizeClasses = {
    sm: {
      container: 'p-4',
      icon: 'w-6 h-6',
      title: 'text-sm font-medium',
      description: 'text-xs'
    },
    md: {
      container: 'p-6',
      icon: 'w-8 h-8',
      title: 'text-base font-medium',
      description: 'text-sm'
    },
    lg: {
      container: 'p-8',
      icon: 'w-12 h-12',
      title: 'text-lg font-semibold',
      description: 'text-base'
    }
  };

  const variantClasses = {
    default: 'text-gray-600',
    primary: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center text-center space-y-3 ${classes.container} ${className}`}>
      <Icon className={`${classes.icon} ${variantClasses[variant]} ${Icon === Loader2 ? 'animate-spin' : ''}`} />
      <div className="space-y-1">
        <h3 className={`${classes.title} text-gray-900`}>{title}</h3>
        {description && (
          <p className={`${classes.description} text-gray-600`}>{description}</p>
        )}
      </div>
      {typeof progress === 'number' && (
        <div className="w-full max-w-48">
          <ProgressBar 
            progress={progress} 
            variant={variant === 'default' ? 'default' : variant}
            size={size === 'lg' ? 'lg' : 'md'}
            showPercentage={false}
          />
        </div>
      )}
    </div>
  );
}

// Predefined loading states for common operations
export const LoadingStates = {
  ImageLoading: (props?: Partial<LoadingStateProps>) => (
    <LoadingState
      icon={Image}
      title="Loading image..."
      description="Please wait while the image loads"
      variant="primary"
      {...props}
    />
  ),

  Searching: (props?: Partial<LoadingStateProps>) => (
    <LoadingState
      icon={Search}
      title="Searching..."
      description="Finding photos that match your query"
      variant="primary"
      {...props}
    />
  ),

  Indexing: (props?: Partial<LoadingStateProps & { progress?: number }>) => (
    <LoadingState
      icon={Upload}
      title="Indexing photos..."
      description="Processing and analyzing your photo collection"
      variant="primary"
      {...props}
    />
  ),

  Processing: (props?: Partial<LoadingStateProps & { progress?: number }>) => (
    <LoadingState
      icon={Clock}
      title="Processing..."
      description="Please wait while we complete the operation"
      variant="default"
      {...props}
    />
  ),

  Error: (props?: Partial<LoadingStateProps>) => (
    <LoadingState
      icon={AlertCircle}
      title="Something went wrong"
      description="Please try again or contact support if the problem persists"
      variant="error"
      {...props}
    />
  ),

  Success: (props?: Partial<LoadingStateProps>) => (
    <LoadingState
      icon={CheckCircle}
      title="Success!"
      description="Operation completed successfully"
      variant="success"
      {...props}
    />
  )
};

// Skeleton loading components for better perceived performance
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  variant = 'rectangular' 
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded'
  };

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height })
  };

  return (
    <div
      className={`bg-gray-200 animate-pulse ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Photo grid skeleton
export function PhotoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="w-full h-full" />
        </div>
      ))}
    </div>
  );
}

// Metadata panel skeleton
export function MetadataSkeletonPanel() {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Skeleton height={16} width="60%" />
        <Skeleton height={14} width="80%" />
      </div>
      <div className="space-y-2">
        <Skeleton height={16} width="40%" />
        <Skeleton height={14} width="70%" />
      </div>
      <div className="space-y-2">
        <Skeleton height={16} width="50%" />
        <Skeleton height={14} width="90%" />
      </div>
    </div>
  );
}
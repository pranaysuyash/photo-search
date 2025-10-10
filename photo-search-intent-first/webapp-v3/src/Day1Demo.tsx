import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { LoadingSkeleton, Spinner, ProgressBar, LoadingOverlay, SuspenseFallback } from './components/Loading';
import { useUIStore } from './store/uiStore';
import { handleError, ErrorType, AppError } from './utils/errorHandler';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';

/**
 * Day 1 Component Demo Page
 * 
 * Demonstrates all Day 1 components in action:
 * - Error Boundary
 * - Toast Notifications (4 variants)
 * - Loading States (5 variants)
 * - Error Handler
 * - Global Loading Overlay
 */
function ComponentDemo() {
  const [progress, setProgress] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const { addToast, setGlobalLoading } = useUIStore();
  const [throwError, setThrowError] = useState(false);

  // Simulate progress
  const startProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          addToast({
            type: 'success',
            title: 'Complete!',
            message: 'Progress completed successfully',
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  // Simulate global loading
  const testGlobalLoading = () => {
    setGlobalLoading(true, 'Processing your request...');
    setTimeout(() => {
      setGlobalLoading(false);
      addToast({
        type: 'success',
        title: 'Done!',
        message: 'Global loading test complete',
      });
    }, 3000);
  };

  // Simulate network error
  const testNetworkError = () => {
    handleError(new Error('Failed to fetch data from server'), {
      showToast: true,
      context: { component: 'ComponentDemo', action: 'testNetworkError' },
    });
  };

  // Simulate typed error
  const testTypedError = () => {
    const error = new AppError(
      'Invalid input: Email address is required',
      ErrorType.VALIDATION,
      { field: 'email', component: 'ComponentDemo' }
    );
    handleError(error, { showToast: true });
  };

  // Trigger error boundary
  if (throwError) {
    throw new Error('This is a test error to demonstrate ErrorBoundary!');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            Day 1 Components Demo
          </h1>
          <p className="text-muted-foreground">
            Test all state management, error handling, and loading components
          </p>
        </div>

        {/* Toast Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
            <CardDescription>
              Test all 4 toast variants with auto-dismiss and actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                onClick={() =>
                  addToast({
                    type: 'success',
                    title: 'Success!',
                    message: 'Operation completed successfully',
                  })
                }
                variant="default"
              >
                Success Toast
              </Button>
              <Button
                onClick={() =>
                  addToast({
                    type: 'error',
                    title: 'Error!',
                    message: 'Something went wrong',
                  })
                }
                variant="destructive"
              >
                Error Toast
              </Button>
              <Button
                onClick={() =>
                  addToast({
                    type: 'warning',
                    title: 'Warning!',
                    message: 'Please review before continuing',
                  })
                }
                variant="outline"
              >
                Warning Toast
              </Button>
              <Button
                onClick={() =>
                  addToast({
                    type: 'info',
                    title: 'Info',
                    message: 'Here is some useful information',
                  })
                }
                variant="secondary"
              >
                Info Toast
              </Button>
            </div>
            <Button
              onClick={() =>
                addToast({
                  type: 'success',
                  title: 'With Action',
                  message: 'This toast has an action button',
                  action: {
                    label: 'Undo',
                    onClick: () => alert('Action clicked!'),
                  },
                })
              }
              className="w-full"
              variant="outline"
            >
              Toast with Action Button
            </Button>
          </CardContent>
        </Card>

        {/* Loading States Section */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>
              Skeleton loaders, spinners, and progress indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Spinners */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Spinners (3 sizes)</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs text-muted-foreground">Small</span>
                </div>
                <div className="flex items-center gap-2">
                  <Spinner size="md" />
                  <span className="text-xs text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <Spinner size="lg" />
                  <span className="text-xs text-muted-foreground">Large</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Progress Bar</h3>
              <ProgressBar
                value={progress}
                max={100}
                label="Indexing photos..."
                showPercentage={true}
              />
              <Button onClick={startProgress} className="mt-3" size="sm">
                Start Progress
              </Button>
            </div>

            {/* Skeleton Loaders */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Skeleton Loaders</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Photo Grid</p>
                  <LoadingSkeleton variant="photo-grid" count={6} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">List Items</p>
                  <LoadingSkeleton variant="list-item" count={3} />
                </div>
              </div>
            </div>

            {/* Suspense Fallback */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Suspense Fallback</h3>
              <div className="border rounded-lg">
                <SuspenseFallback label="Loading component..." />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Handling Section */}
        <Card>
          <CardHeader>
            <CardTitle>Error Handling</CardTitle>
            <CardDescription>
              Test error categorization and user-friendly messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={testNetworkError} variant="outline">
                Test Network Error
              </Button>
              <Button onClick={testTypedError} variant="outline">
                Test Validation Error
              </Button>
              <Button onClick={testGlobalLoading} variant="outline">
                Test Global Loading (3s)
              </Button>
              <Button
                onClick={() => {
                  setShowOverlay(true);
                  setTimeout(() => setShowOverlay(false), 3000);
                }}
                variant="outline"
              >
                Test Overlay (3s)
              </Button>
              <Button
                onClick={() => setThrowError(true)}
                variant="destructive"
                className="md:col-span-2"
              >
                Trigger Error Boundary
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Error Boundary will catch rendering errors and show a fallback UI
            </p>
          </CardContent>
        </Card>

        {/* Store State Display */}
        <Card>
          <CardHeader>
            <CardTitle>Store State (Zustand)</CardTitle>
            <CardDescription>
              Current state from all Day 1 stores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-xs">
              <div>
                <span className="text-muted-foreground">Toast Count:</span>{' '}
                <span className="font-semibold">{useUIStore.getState().toasts.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Theme:</span>{' '}
                <span className="font-semibold">{useUIStore.getState().theme}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Active Modal:</span>{' '}
                <span className="font-semibold">
                  {useUIStore.getState().activeModal || 'none'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Global Loading:</span>{' '}
                <span className="font-semibold">
                  {useUIStore.getState().globalLoading ? 'true' : 'false'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Show overlay if toggled */}
      {showOverlay && (
        <LoadingOverlay message="This is a test overlay. It will close in 3 seconds..." />
      )}
    </div>
  );
}

export default function Day1Demo() {
  return (
    <ErrorBoundary>
      <ToastContainer />
      <ComponentDemo />
    </ErrorBoundary>
  );
}

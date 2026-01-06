import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      eventId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ 
      errorInfo,
      eventId: Date.now().toString(36) // Simple error ID for reference
    });

    // Here you could send to an error reporting service like Sentry
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, eventId: null });
    
    // If onReset prop is provided, call it
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, eventId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="bg-card border border-[hsl(var(--border))] rounded-xl shadow-lg p-8 text-center">
              {/* Error Icon */}
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              
              {/* Error Description */}
              <p className="text-muted-foreground mb-6">
                {this.props.message || "We're sorry, but something unexpected happened. Our team has been notified."}
              </p>

              {/* Error ID for support reference */}
              {this.state.eventId && (
                <div className="bg-muted/50 rounded-lg p-3 mb-6">
                  <p className="text-xs text-muted-foreground">
                    Error Reference: <code className="text-foreground font-mono">{this.state.eventId}</code>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-card border border-[hsl(var(--border))] text-foreground rounded-lg hover:bg-muted font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </button>
              </div>

              {/* Show error details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Show error details (development only)
                  </summary>
                  <div className="mt-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg overflow-auto">
                    <p className="text-sm font-mono text-red-500 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary for handling promise rejections
 * Wraps components that make async calls
 */
export function AsyncErrorBoundary({ children, fallback }) {
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleError = (event) => {
      if (event.reason) {
        console.error('Unhandled promise rejection:', event.reason);
        setError(event.reason);
      }
    };

    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);

  if (error) {
    return fallback || (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-sm text-red-500">An error occurred while loading data.</p>
        <button 
          onClick={() => setError(null)}
          className="mt-2 text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return children;
}

/**
 * Section Error Boundary - For wrapping individual sections
 * Shows a smaller inline error instead of full page
 */
export function SectionErrorBoundary({ children, sectionName = 'This section' }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-card border border-[hsl(var(--border))] rounded-xl p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium text-foreground">{sectionName} couldn't load</p>
              <p className="text-sm">There was a problem displaying this content.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Refresh page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;

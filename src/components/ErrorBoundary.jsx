import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Catches rendering errors in its subtree and shows a contained fallback
 * instead of letting the error propagate and white-screen the whole app.
 *
 * React error boundaries only work as class components (no hook equivalent
 * exists for getDerivedStateFromError/componentDidCatch), so this stays a
 * class even though the rest of the app is function components + hooks.
 *
 * Usage:
 *   <ErrorBoundary>...</ErrorBoundary>
 *   <ErrorBoundary resetKey={activeView}>...</ErrorBoundary>  // auto-recovers
 *     when resetKey changes (e.g. the user navigates to a different view)
 *   <ErrorBoundary fallbackLabel="the dashboard">...</ErrorBoundary>  // names
 *     the broken section in the fallback message
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Always keep this console.error -- it's the only record of what broke
    // when there's no error-tracking service wired up yet. If/when one is
    // added (Sentry, etc.), report here as well, in addition to (not
    // instead of) the console log.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    // Auto-recover when resetKey changes (e.g. the user switched views) so
    // a crash in one section doesn't permanently strand the whole app in
    // its error state -- navigating away and the section is fresh again.
    if (
      this.state.hasError &&
      this.props.resetKey !== undefined &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      const label = this.props.fallbackLabel || 'this section';

      return (
        <div className="bg-card border border-[hsl(var(--border))] rounded-lg p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Something went wrong loading {label}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              This didn't affect the rest of the app -- try again, or reload the page if it keeps happening.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium mt-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-xs text-left text-red-400 bg-red-500/5 border border-red-500/20 rounded p-3 mt-2 max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

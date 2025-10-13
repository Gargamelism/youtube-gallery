'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div
          className="ErrorBoundary min-h-[400px] flex items-center justify-center p-8"
          role="alert"
          aria-live="assertive"
        >
          <div className="ErrorBoundary__content max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="ErrorBoundary__header flex items-start mb-4">
              <AlertCircle
                className="ErrorBoundary__icon h-6 w-6 text-red-600 mr-3 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="ErrorBoundary__text flex-1">
                <h2 className="ErrorBoundary__title text-lg font-semibold text-red-900 mb-1">
                  Something went wrong
                </h2>
                <p className="ErrorBoundary__message text-sm text-red-700">{this.state.error.message}</p>
              </div>
            </div>
            <div className="ErrorBoundary__actions">
              <button
                onClick={this.resetError}
                className="ErrorBoundary__retry-button w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class Index extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h1 className="mb-4 text-4xl font-bold text-red-600">
              Oops! Something went wrong
            </h1>
            <p className="mb-6 text-gray-600">
              We apologize for the inconvenience. The application encountered an
              unexpected error.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
                <summary className="cursor-pointer font-semibold">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 overflow-auto text-sm text-red-600">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="space-x-4">
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600"
              >
                Return Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

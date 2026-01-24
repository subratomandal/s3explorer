import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // Log error for debugging (could be sent to error tracking service)
        console.error('React Error Boundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-accent-red/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-accent-red" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-xl font-semibold text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-sm text-foreground-muted">
                                The application encountered an unexpected error. This has been logged for investigation.
                            </p>
                        </div>

                        {this.state.error && (
                            <details className="text-left bg-background-secondary rounded-lg p-4 text-xs">
                                <summary className="cursor-pointer text-foreground-secondary font-medium mb-2">
                                    Error Details
                                </summary>
                                <pre className="overflow-auto text-accent-red whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="btn btn-secondary"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reportUiError, getClientTraceId } from "@/lib/observability";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  traceId: string | null;
}

class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    traceId: null,
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true, traceId: getClientTraceId() };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportUiError(error, "app_error_boundary");
    reportUiError(errorInfo.componentStack, "app_error_boundary_stack");
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-3">
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The screen failed to load. Please refresh and try again.
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              Reference: {this.state.traceId}
            </p>
            <Button onClick={this.handleReload} className="w-full">
              Reload app
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;

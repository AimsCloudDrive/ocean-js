import { Component, ComponentProps, option } from "@msom/component";

export interface ErrorBoundaryProps extends ComponentProps {
  fallback?: Msom.MsomElement;
  onError?: (error: Error, errorInfo: any) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps> {
  @option({ type: "unknown" })
  declare children?: Msom.MsomNode;

  @option({ type: "unknown" })
  declare fallback?: Msom.MsomElement;

  @option({ type: "function" })
  declare onError?: (error: Error, errorInfo: any) => void;

  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any): void {
    this.state = {
      hasError: true,
      error,
      errorInfo,
    };

    if (this.onError) {
      this.onError(error, errorInfo);
    }
  }

  render(): Msom.MsomNode | null {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }

      return (
        <div style={{
          padding: "20px",
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "4px",
          color: "#c33",
        }}>
          <h2 style={{ margin: "0 0 10px 0" }}>Something went wrong</h2>
          <details style={{ whiteSpace: "pre-wrap" }}>
            <summary>Error details</summary>
            {this.state.error?.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.children ?? null;
  }
}

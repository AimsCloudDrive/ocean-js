import { Component, ComponentProps } from "@msom/component";

export interface ErrorBoundaryProps {
  children?: Msom.MsomNode;
  fallback?: Msom.MsomElement;
  onError?: (error: Error, errorInfo: any) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  @option({ type: "unknown" })
  children?: Msom.MsomNode;
  
  @option({ type: "unknown" })
  fallback?: Msom.MsomElement;
  
  @option({ type: "function" })
  onError?: (error: Error, errorInfo: any) => void;

  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any): void {
    this.state = {
      hasError: true,
      error,
      errorInfo
    };
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): Msom.MsomNode | null {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{
          padding: "20px",
          backgroundColor: "#fee",
          border: "1px solid #fcc",
          borderRadius: "4px",
          color: "#c33"
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

    return this.props.children ?? null;
  }
}

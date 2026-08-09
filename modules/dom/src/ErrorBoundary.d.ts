import { Component, ComponentProps } from "@msom/component";
export interface ErrorBoundaryProps extends ComponentProps {
    fallback?: Msom.MsomElement;
    onError?: (error: Error, errorInfo: any) => void;
}
export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo?: any;
}
export declare class ErrorBoundary extends Component<ErrorBoundaryProps> {
    children?: Msom.MsomNode;
    fallback?: Msom.MsomElement;
    onError?: (error: Error, errorInfo: any) => void;
    state: ErrorBoundaryState;
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: any): void;
    render(): Msom.MsomNode | null;
}

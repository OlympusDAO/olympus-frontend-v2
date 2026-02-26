import { Component, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Icon } from "@/components/icon.tsx";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error) {
    console.error("Error caught by boundary:", error);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-lg w-full text-center space-y-8">
            {/* Olympus Logo and Branding */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-x-[10px]">
                <Icon name="logoIcon" className="text-primary-t" size={40} />
                <div className="text-3xl font-bold">Olympus</div>
                <div className="rounded-[20px] bg-brand-sand-1000 border-[0.5px] border-a10-b py-1 px-[10px] shadow-cds">
                  <div className="font-bold text-[15px]/[16px]">CDs</div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground">
                Oops! Something went wrong
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                We encountered an unexpected error. Please try again or refresh
                the page.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors shadow-cds"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-foreground bg-brand-sand-800 rounded-lg hover:bg-brand-sand-900 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors shadow-cds"
              >
                Refresh page
              </button>
            </div>

            {/* Development Error Details */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="text-left mt-8">
                <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground mb-2">
                  🔧 Developer Details
                </summary>
                <div className="bg-brand-sand-800 rounded-lg p-4 border border-brand-sand-900">
                  <pre className="text-xs overflow-auto text-foreground whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

            {/* Footer */}
            <p className="text-xs text-muted-foreground mt-8">
              If this problem continues, please contact the Olympus team
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

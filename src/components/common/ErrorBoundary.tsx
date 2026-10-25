import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      window.location.href = window.location.pathname;
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D19] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#12162B] border-2 border-[#EF4444] rounded-xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-[#EF4444] mb-4">
              <AlertOctagon className="w-8 h-8 shrink-0" />
              <div>
                <h1 className="font-pixel text-sm text-[#EF4444] tracking-wider">
                  DUNGEON COLLAPSE
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  An unexpected error interrupted StudyQuest.
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 font-sans leading-relaxed mb-4">
              {this.state.error?.message || 'Something went wrong while rendering this screen.'}
            </p>

            {this.state.errorInfo && (
              <details className="mb-6 bg-[#070913] p-3 rounded border border-[#232A47] text-xs font-mono text-slate-400 overflow-x-auto">
                <summary className="cursor-pointer text-[#F5C542] hover:underline">
                  View Technical Diagnostics
                </summary>
                <pre className="mt-2 text-[11px] text-red-300 whitespace-pre-wrap">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-pixel-gold px-4 py-2 text-xs font-mono cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-pixel-red px-4 py-2 text-xs font-mono cursor-pointer"
              >
                Reset App Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

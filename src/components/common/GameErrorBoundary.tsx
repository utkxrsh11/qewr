import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Play, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  onFallbackToRunner?: () => void;
  onQuit?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GameErrorBoundary] Game encounter failed:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl mx-auto p-6 bg-[#12162B] border-2 border-[#EF4444] rounded-xl text-slate-100 text-center my-8 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="font-pixel text-sm text-[#EF4444] mb-2">CHALLENGE ENCOUNTER ERROR</h2>
          <p className="text-xs sm:text-sm text-slate-300 font-sans mb-4 max-w-md mx-auto">
            This mini-game encountered an unexpected issue while rendering. You can retry, or seamlessly switch to classic quiz runner mode without losing level progress.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-pixel-dark px-4 py-2 text-xs font-mono cursor-pointer"
            >
              Retry Challenge
            </button>
            {this.props.onFallbackToRunner && (
              <button
                type="button"
                onClick={this.props.onFallbackToRunner}
                className="btn-pixel-gold px-4 py-2 text-xs font-mono cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                Play in Quiz Mode
              </button>
            )}
            {this.props.onQuit && (
              <button
                type="button"
                onClick={this.props.onQuit}
                className="btn-pixel-red px-3 py-2 text-xs font-mono cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Exit Level
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

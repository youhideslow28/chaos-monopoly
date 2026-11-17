import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';
import { COSMETIC_UI, getLocale } from '../../worlds/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // In production, can forward to telemetry or error reporting service
    console.error('[CHAOS MONOPOLY FATAL ERROR]:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleCopyDetails = (): void => {
    const errorDetails = `CHAOS MONOPOLY CRASH REPORT
Timestamp: ${new Date().toISOString()}
Error: ${this.state.error?.name}: ${this.state.error?.message}
Stack:
${this.state.error?.stack || 'N/A'}
Component Stack:
${this.state.errorInfo?.componentStack || 'N/A'}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const locale = getLocale();
      const t = (key: keyof typeof COSMETIC_UI) => COSMETIC_UI[key][locale];

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 text-slate-900 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-[#e8e2d5] bg-[#fdfbf7] p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="rounded-xl bg-rose-50 p-3 border border-rose-200">
                <AlertTriangle className="h-7 w-7 text-rose-600 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  {t('errorTitle')}
                </h2>
                <p className="text-xs text-slate-600">
                  {t('errorBody')}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#e8e2d5] bg-white p-3 font-mono text-xs text-slate-700 max-h-48 overflow-y-auto">
              <p className="font-semibold text-rose-600">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || t('errorUnknown')}
              </p>
              {this.state.error?.stack && (
                <pre className="mt-2 whitespace-pre-wrap text-[11px] text-slate-500">
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={this.handleCopyDetails}
                className="min-h-[44px] flex items-center gap-2 rounded-xl border border-[#e8e2d5] bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                {this.state.copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>{t('errorCopied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-500" />
                    <span>{t('errorCopyDetails')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="min-h-[44px] flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>{t('errorRecover')}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

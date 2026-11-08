import React from 'react';

/** Shows the error instead of a blank screen, with a one-click reset of local demo data. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Drill Night crashed:', error, info.componentStack);
  }

  reset = () => {
    try {
      localStorage.removeItem('drill_night_state_v1');
      localStorage.removeItem('drill_night_overview_hidden');
      localStorage.removeItem('drill_night_schedule');
    } catch {
      /* ignore */
    }
    window.location.assign('/admin');
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-fg">
        <div className="w-full max-w-lg border-t-2 border-breach bg-surface p-6">
          <h1 className="font-display text-[28px] leading-tight font-bold uppercase">Something broke</h1>
          <p className="mt-2 text-[14px] text-fg-muted">The page hit an error. Resetting local demo data usually fixes it.</p>
          <pre className="mt-4 max-h-40 overflow-auto bg-bg p-3 font-mono text-xs whitespace-pre-wrap text-breach-text">{this.state.error.message}</pre>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={this.reset} className="h-10 bg-accent px-4 text-sm font-semibold text-bg hover:bg-accent-hover">
              Reset and reload
            </button>
            <button type="button" onClick={() => window.location.reload()} className="h-10 border border-line-strong px-4 text-sm font-semibold text-fg hover:bg-bg">
              Just reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

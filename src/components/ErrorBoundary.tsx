import { Component, type ErrorInfo, type ReactNode } from 'react';
import { C } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * A navigation app must never go blank on someone standing in a station. If a screen
 * throws, show what went wrong and a way back rather than a white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MetroLens screen error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 14,
          padding: '24px 22px',
          background: C.bg,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800 }}>Something went wrong on this screen</div>
        <div style={{ fontSize: 14, color: C.soft, lineHeight: 1.5 }}>
          Your trip is still saved. Reload to pick it back up.
        </div>
        <pre
          style={{
            fontSize: 11,
            color: C.soft,
            background: C.white,
            borderRadius: 12,
            padding: 12,
            overflow: 'auto',
            maxHeight: 200,
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: 'none',
            background: C.brand,
            color: C.onColor,
            borderRadius: 14,
            padding: 15,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reload MetroLens
        </button>
      </div>
    );
  }
}

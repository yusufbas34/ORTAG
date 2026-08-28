import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// A single uncaught render/effect error anywhere in the tree (e.g. a map
// library throwing on a 0-size container) would otherwise unmount the whole
// app, leaving just the body background color visible with no way back in.
// This catches that and offers a reload instead.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] yakalanan hata', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.page}>
        <i className="fa-solid fa-triangle-exclamation" />
        <h1>Bir şeyler ters gitti</h1>
        <p>Uygulama beklenmedik bir hatayla karşılaştı. Sayfayı yenilemeyi dene.</p>
        <button className={styles.reloadBtn} onClick={this.handleReload} type="button">
          Yeniden Dene
        </button>
      </div>
    );
  }
}

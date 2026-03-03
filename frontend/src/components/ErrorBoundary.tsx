// frontend/src/components/ErrorBoundary.tsx
// Captura erros de render do React e exibe diagnóstico em vez de tela branca.
// Essencial para detectar erros que Chrome trata como blank page silencioso.

import React, { Component } from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    // Log para console e eventuais serviços de monitoramento
    console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            background: "#0f172a",
            color: "#f1f5f9",
            fontFamily: "system-ui, sans-serif",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 48 }}>🎾</div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#e2e8f0" }}>
            Algo deu errado
          </h1>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 14, textAlign: "center" }}>
            O aplicativo encontrou um erro inesperado.
            <br />
            Tente recarregar a página.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              marginTop: 8,
              padding: "10px 24px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>

          {isDev && this.state.error && (
            <details
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                maxWidth: 640,
                width: "100%",
                fontSize: 12,
                color: "#fca5a5",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                Detalhes do erro (dev)
              </summary>
              <pre style={{ marginTop: 8, overflowX: "auto", whiteSpace: "pre-wrap" }}>
                {this.state.error.toString()}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

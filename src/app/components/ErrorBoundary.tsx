import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  erro: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null };

  static getDerivedStateFromError(erro: Error) {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', erro, info.componentStack);
  }

  handleReload = () => {
    this.setState({ erro: null });
    window.location.reload();
  };

  render() {
    if (this.state.erro) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-6">
          <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-lg font-black text-slate-900">Algo correu mal</h1>
            <p className="text-sm text-slate-500">
              Ocorreu um erro inesperado na aplicação. Recarregue para tentar novamente.
            </p>
            <pre className="text-left text-[11px] text-red-600 bg-red-50 rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.erro.message}
            </pre>
            <button
              onClick={this.handleReload}
              className="w-full px-6 py-3 bg-[#7c3aed] text-white rounded-2xl font-bold text-sm hover:bg-[#630ed4] transition-all"
            >
              Recarregar aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Camera,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  History,
  Image as ImageIcon,
  Loader2,
  ScanText,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  AnaliseTextoResponse,
  ConciliacaoApiError,
  ConciliacaoDetalhe,
  ConciliacaoResumo,
  MatchResult,
  OcrResponse,
  ReconciliacaoBancaria,
  RelatorioConciliacao,
  SeccaoReconciliacao,
  conciliacaoService,
} from '../services/conciliacaoApi';

type Aba = 'nova' | 'historico' | 'ocr' | 'texto';

function moeda(valor: unknown) {
  const numero = Number(valor ?? 0);
  return `${Number.isFinite(numero) ? numero.toLocaleString() : '0'} Kz`;
}

function nomeMotor(motor: string) {
  if (motor.toLowerCase().includes('tesseract')) return 'OCR Local';
  return 'IA';
}

function mensagemErro(erro: unknown, fallback: string) {
  if (erro instanceof ConciliacaoApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return fallback;
}

function BadgeStatus({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    conciliado: 'bg-emerald-50 text-emerald-700',
    pendente: 'bg-amber-50 text-amber-700',
    divergencia: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${estilos[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function AlertaErro({ mensagem }: { mensagem: string }) {
  return (
    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {mensagem}
    </div>
  );
}

function CampoFicheiro({
  id,
  label,
  ficheiro,
  onSelecionar,
  onLimpar,
}: {
  id: string;
  label: string;
  ficheiro: File | null;
  onSelecionar: (file: File) => void;
  onLimpar: () => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <input
        type="file"
        id={id}
        className="hidden"
        accept=".xlsx,.xls,.csv,.pdf,.ofx,.doc,.docx,.txt,image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelecionar(file);
        }}
      />
      {ficheiro ? (
        <div className="flex items-center gap-3 px-4 py-4 bg-theme-primary-light border-2 border-theme-primary rounded-2xl">
          <FileSpreadsheet className="w-6 h-6 text-theme-primary flex-shrink-0" />
          <span className="flex-1 text-sm font-bold text-gray-700 truncate">{ficheiro.name}</span>
          <button type="button" onClick={onLimpar} className="p-1 hover:bg-white/60 rounded-full">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => document.getElementById(id)?.click()}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:border-theme-primary hover:bg-theme-primary-light transition-all group"
        >
          <Upload className="w-6 h-6 text-gray-400 group-hover:text-theme-primary" />
          <span className="text-sm font-bold text-gray-500 group-hover:text-theme-primary">Escolher Ficheiro</span>
        </button>
      )}
    </div>
  );
}

function CartaoEstatistica({ icon: Icon, label, valor, cor }: { icon: any; label: string; valor: string | number; cor: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-lg font-black text-gray-900">{valor}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}

function TabelaDetalhes({ detalhes }: { detalhes: MatchResult[] }) {
  if (!detalhes.length) {
    return <p className="text-sm text-gray-500 text-center py-8">Sem lançamentos detalhados.</p>;
  }

  return (
    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">ERP</th>
            <th className="px-4 py-3 text-left">Banco</th>
            <th className="px-4 py-3 text-right">Score</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Sugestão</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {detalhes.map((item, index) => (
            <tr key={index}>
              <td className="px-4 py-3">
                {item.erp ? (
                  <>
                    <p className="font-bold text-gray-900">{item.erp.descricao}</p>
                    <p className="text-xs text-gray-500">{item.erp.data} · {moeda(item.erp.debito || item.erp.credito)}</p>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Sem correspondência</span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.banco ? (
                  <>
                    <p className="font-bold text-gray-900">{item.banco.descricao}</p>
                    <p className="text-xs text-gray-500">{item.banco.data} · {moeda(item.banco.debito || item.banco.credito)}</p>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Sem correspondência</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-700">{item.score_total.toFixed(1)}%</td>
              <td className="px-4 py-3"><BadgeStatus status={item.status} /></td>
              <td className="px-4 py-3 text-xs text-gray-500">{item.sugestao || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeccaoAjuste({ seccao }: { seccao: SeccaoReconciliacao }) {
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
          {seccao.numero}. {seccao.label}
        </p>
        <p className="text-sm font-black text-gray-900">
          {seccao.sinal} {moeda(seccao.total)}
        </p>
      </div>
      {seccao.itens.length > 0 && (
        <div className="divide-y divide-gray-50">
          {seccao.itens.map((item, index) => (
            <div key={index} className="flex items-center justify-between px-4 py-2 text-sm">
              <div>
                <p className="text-gray-700">{item.descricao}</p>
                <p className="text-xs text-gray-400">{item.data}</p>
              </div>
              <p className="font-bold text-gray-700">{moeda(item.valor)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReconciliacaoBancariaCard({ reconciliacao }: { reconciliacao: ReconciliacaoBancaria }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
      <p className="text-sm font-black text-gray-900">Reconciliação Bancária</p>

      <div className="flex items-center justify-between text-sm">
        <p className="text-gray-500 font-bold">Saldo pelo Banco</p>
        <p className="font-black text-gray-900">{moeda(reconciliacao.saldo_banco)}</p>
      </div>

      <div className="space-y-3">
        <SeccaoAjuste seccao={reconciliacao.debitado_banco_nao_creditado_livros} />
        <SeccaoAjuste seccao={reconciliacao.creditado_banco_nao_debitado_livros} />
        <SeccaoAjuste seccao={reconciliacao.debitado_livros_nao_creditado_banco} />
        <SeccaoAjuste seccao={reconciliacao.creditado_livros_nao_debitado_banco} />
      </div>

      <div className="border-t border-gray-100 pt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Saldo Financeiro</p>
          <p className="text-sm font-black text-gray-900">{moeda(reconciliacao.saldo_financeiro)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Saldo Contabilístico</p>
          <p className="text-sm font-black text-gray-900">{moeda(reconciliacao.saldo_contabilistico)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Diferença</p>
          <p className={`text-sm font-black ${Number(reconciliacao.diferenca) !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {moeda(reconciliacao.diferenca)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultadoConciliacao({ relatorio }: { relatorio: RelatorioConciliacao }) {
  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CartaoEstatistica icon={CheckCircle2} label="Conciliados" valor={relatorio.conciliados} cor="bg-emerald-50 text-emerald-600" />
        <CartaoEstatistica icon={Clock} label="Pendentes" valor={relatorio.pendentes} cor="bg-amber-50 text-amber-600" />
        <CartaoEstatistica icon={AlertCircle} label="Divergências" valor={relatorio.divergencias} cor="bg-red-50 text-red-600" />
        <CartaoEstatistica icon={FileSpreadsheet} label="Total Lançamentos" valor={relatorio.total_lancamentos} cor="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">Percentagem de Conciliação</p>
          <p className="text-sm font-black text-theme-primary">{relatorio.percentual_conciliacao.toFixed(1)}%</p>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-theme-primary rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.max(0, relatorio.percentual_conciliacao))}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 text-center">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Saldo ERP</p>
            <p className="text-sm font-black text-gray-900">{moeda(relatorio.saldo_erp)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Saldo Banco</p>
            <p className="text-sm font-black text-gray-900">{moeda(relatorio.saldo_banco)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Diferença</p>
            <p className={`text-sm font-black ${Number(relatorio.diferenca) !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>{moeda(relatorio.diferenca)}</p>
          </div>
        </div>
      </div>

      {relatorio.reconciliacao_bancaria && (
        <ReconciliacaoBancariaCard reconciliacao={relatorio.reconciliacao_bancaria} />
      )}

      {relatorio.analise_deepseek && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-black text-indigo-900">Análise IA</p>
          </div>
          <p className="text-sm text-indigo-900/80 whitespace-pre-wrap">{relatorio.analise_deepseek}</p>
        </div>
      )}

      {relatorio.sugestoes.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-sm font-black text-gray-900 mb-2">Sugestões</p>
          <ul className="space-y-1">
            {relatorio.sugestoes.map((sugestao, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                {sugestao}
              </li>
            ))}
          </ul>
        </div>
      )}

      <TabelaDetalhes detalhes={relatorio.detalhes} />
    </div>
  );
}

function NovaConciliacao() {
  const [erp, setErp] = useState<File | null>(null);
  const [extrato, setExtrato] = useState<File | null>(null);
  const [usarDeepseek, setUsarDeepseek] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [relatorio, setRelatorio] = useState<RelatorioConciliacao | null>(null);

  const enviar = async () => {
    if (!erp || !extrato) {
      setErro('Selecione o ficheiro do ERP e o extrato bancário.');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      const resposta = await conciliacaoService.conciliar(erp, extrato, usarDeepseek);
      setRelatorio(resposta);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível concluir a conciliação.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoFicheiro id="input-erp" label="Ficheiro ERP" ficheiro={erp} onSelecionar={setErp} onLimpar={() => setErp(null)} />
          <CampoFicheiro id="input-extrato" label="Extrato Bancário" ficheiro={extrato} onSelecionar={setExtrato} onLimpar={() => setExtrato(null)} />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={usarDeepseek}
            onChange={(e) => setUsarDeepseek(e.target.checked)}
            className="rounded border-gray-300 text-theme-primary focus:ring-theme-primary"
          />
          Ativar análise inteligente via IA
        </label>

        {erro && <AlertaErro mensagem={erro} />}

        <button
          type="button"
          onClick={enviar}
          disabled={carregando}
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100 disabled:opacity-60"
        >
          {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
          {carregando ? 'A conciliar...' : 'Conciliar'}
        </button>
      </div>

      {relatorio && <ResultadoConciliacao relatorio={relatorio} />}
    </div>
  );
}

function DetalheHistoricoPagina({ resumo, onVoltar }: { resumo: ConciliacaoResumo; onVoltar: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [detalhe, setDetalhe] = useState<ConciliacaoDetalhe | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro('');
    conciliacaoService
      .obterPorId(resumo.id)
      .then(setDetalhe)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar os detalhes.')))
      .finally(() => setCarregando(false));
  }, [resumo.id]);

  let detalhes: MatchResult[] = [];
  let reconciliacaoBancaria: ReconciliacaoBancaria | null = null;
  if (detalhe?.detalhes) {
    try {
      const parsed = JSON.parse(detalhe.detalhes);
      if (Array.isArray(parsed)) detalhes = parsed;
      else if (Array.isArray(parsed?.detalhes)) {
        detalhes = parsed.detalhes;
        reconciliacaoBancaria = parsed.reconciliacao_bancaria || null;
      }
    } catch {
      detalhes = [];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Conciliação #{resumo.id}</h2>
          <p className="text-sm text-gray-500">
            {new Date(resumo.data).toLocaleString('pt-PT')} · {resumo.erp || '-'} · {resumo.extrato || '-'}
          </p>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
        </div>
      ) : erro ? (
        <AlertaErro mensagem={erro} />
      ) : detalhe ? (
        <ResultadoConciliacao
          relatorio={{
            id: detalhe.id,
            saldo_banco: detalhe.saldo_banco,
            saldo_erp: detalhe.saldo_erp,
            conciliados: detalhe.conciliados,
            pendentes: detalhe.pendentes,
            divergencias: detalhe.divergencias,
            total_lancamentos: detalhe.total_lancamentos,
            diferenca: detalhe.diferenca,
            percentual_conciliacao: detalhe.percentual,
            detalhes,
            analise_deepseek: detalhe.analise_deepseek,
            sugestoes: detalhe.sugestoes || [],
            reconciliacao_bancaria: reconciliacaoBancaria,
          }}
        />
      ) : null}
    </div>
  );
}

function Historico() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [conciliacoes, setConciliacoes] = useState<ConciliacaoResumo[]>([]);
  const [selecionado, setSelecionado] = useState<ConciliacaoResumo | null>(null);

  useEffect(() => {
    conciliacaoService
      .listar(20)
      .then((resposta) => setConciliacoes(resposta.conciliacoes))
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o histórico.')))
      .finally(() => setCarregando(false));
  }, []);

  if (selecionado) {
    return <DetalheHistoricoPagina resumo={selecionado} onVoltar={() => setSelecionado(null)} />;
  }

  return (
    <div className="space-y-4">
      {erro && <AlertaErro mensagem={erro} />}

      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
        </div>
      ) : conciliacoes.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">Ainda não existem conciliações registadas.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">ERP</th>
                <th className="px-4 py-3 text-left">Extrato</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">Diferença</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {conciliacoes.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelecionado(item)}>
                  <td className="px-4 py-3 text-gray-700">{new Date(item.data).toLocaleString('pt-PT')}</td>
                  <td className="px-4 py-3 text-gray-700">{item.erp || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{item.extrato || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{item.total}</td>
                  <td className="px-4 py-3 text-right font-bold text-theme-primary">{item.percentual.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-gray-700">{moeda(item.diferenca)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    <History className="w-4 h-4 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OcrImagem() {
  const [imagem, setImagem] = useState<File | null>(null);
  const [usarDeepseek, setUsarDeepseek] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<OcrResponse | null>(null);

  const enviar = async () => {
    if (!imagem) {
      setErro('Selecione uma imagem do extrato bancário.');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      const resposta = await conciliacaoService.ocrImagem(imagem, usarDeepseek);
      setResultado(resposta);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível extrair o texto da imagem.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="max-w-md">
          <CampoFicheiro id="input-ocr-imagem" label="Imagem do Extrato" ficheiro={imagem} onSelecionar={setImagem} onLimpar={() => setImagem(null)} />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={usarDeepseek}
            onChange={(e) => setUsarDeepseek(e.target.checked)}
            className="rounded border-gray-300 text-theme-primary focus:ring-theme-primary"
          />
          Usar IA como suporte (fallback) na extração
        </label>

        {erro && <AlertaErro mensagem={erro} />}

        <button
          type="button"
          onClick={enviar}
          disabled={carregando}
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100 disabled:opacity-60"
        >
          {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          {carregando ? 'A extrair...' : 'Extrair Texto'}
        </button>
      </div>

      {resultado && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Motor: {nomeMotor(resultado.motor)}</p>
          <RegistosTabela registos={resultado.registos} />
        </div>
      )}
    </div>
  );
}

function TextoLivre() {
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState<AnaliseTextoResponse | null>(null);

  const enviar = async () => {
    if (!texto.trim()) {
      setErro('Cole o texto do extrato bancário.');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      const resposta = await conciliacaoService.analisarTexto(texto);
      setResultado(resposta);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível analisar o texto.'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Texto do Extrato</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            placeholder="Ex: 15/06/2026 PAGAMENTO FACTURA 1234 15.000,00 Kz"
            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
          />
        </div>

        {erro && <AlertaErro mensagem={erro} />}

        <button
          type="button"
          onClick={enviar}
          disabled={carregando}
          className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100 disabled:opacity-60"
        >
          {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanText className="w-5 h-5" />}
          {carregando ? 'A analisar...' : 'Extrair Lançamentos'}
        </button>
      </div>

      {resultado && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <RegistosTabela registos={resultado.registos} />
        </div>
      )}
    </div>
  );
}

function RegistosTabela({ registos }: { registos: Record<string, unknown>[] }) {
  if (!registos.length) {
    return <p className="text-sm text-gray-500 text-center py-8">Nenhum lançamento identificado.</p>;
  }

  const colunas = Array.from(new Set(registos.flatMap((registo) => Object.keys(registo))));

  return (
    <div className="overflow-x-auto border border-gray-100 rounded-2xl">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna} className="px-4 py-3 text-left">{coluna}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {registos.map((registo, index) => (
            <tr key={index}>
              {colunas.map((coluna) => (
                <td key={coluna} className="px-4 py-3 text-gray-700">{String(registo[coluna] ?? '-')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Conciliacao() {
  const [aba, setAba] = useState<Aba>('nova');

  const abas: { id: Aba; label: string; icon: any }[] = [
    { id: 'nova', label: 'Nova Conciliação', icon: Banknote },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'ocr', label: 'OCR de Imagem', icon: ImageIcon },
    { id: 'texto', label: 'Texto Livre', icon: ScanText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Conciliação Bancária</h2>
        <p className="text-sm text-gray-500">Concilia ficheiros do ERP com o extrato bancário usando IA.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {abas.map((item) => {
          const Icon = item.icon;
          const ativo = aba === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
                ativo ? 'border-theme-primary text-theme-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {aba === 'nova' && <NovaConciliacao />}
      {aba === 'historico' && <Historico />}
      {aba === 'ocr' && <OcrImagem />}
      {aba === 'texto' && <TextoLivre />}
    </div>
  );
}

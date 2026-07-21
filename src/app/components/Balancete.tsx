import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calculator,
  Check,
  FileDown,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  NotebookText,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from 'lucide-react';
import {
  AjusteFiscal,
  ConciliacaoApiError,
  EmpresaBalancete,
  ExercicioBalancete,
  LinhaRelatorio,
  NotaTemplateResumo,
  NotaValorItem,
  PrejuizoFiscal,
  RelatorioBalancete,
  SaldoConta,
  SaldoContaItem,
  balanceteService,
} from '../services/conciliacaoApi';
import { exportarExercicioExcel, exportarExercicioPdf, TabelaExportavel } from '../utils/balanceteExport';

type AbaExercicio = 'saldos' | 'balanco' | 'dr' | 'notas' | 'modelo-imposto';

function mensagemErro(erro: unknown, fallback: string) {
  if (erro instanceof ConciliacaoApiError) return erro.message;
  if (erro instanceof Error) return erro.message;
  return fallback;
}

function formatarValor(valor: unknown, moeda = 'AKZ') {
  const numero = Number(valor ?? 0);
  return `${Number.isFinite(numero) ? numero.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} ${moeda}`;
}

function AlertaErro({ mensagem }: { mensagem: string }) {
  return (
    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {mensagem}
    </div>
  );
}

function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-100 rounded-2xl p-6 shadow-sm ${className}`}>{children}</div>;
}

function BotaoPrimario({
  onClick,
  disabled,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-5 py-2.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-all shadow-md shadow-indigo-100 disabled:opacity-60"
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function nomeFicheiro(...partes: (string | number | undefined)[]) {
  return partes
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ────────────────────────────── Selector de Empresa ──────────────────────────────

function SelectorEmpresas({ onSelecionar }: { onSelecionar: (empresa: EmpresaBalancete) => void }) {
  const [empresas, setEmpresas] = useState<EmpresaBalancete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aCriar, setACriar] = useState(false);
  const [nome, setNome] = useState('');
  const [nif, setNif] = useState('');
  const [moeda, setMoeda] = useState('AKZ');
  const [aGuardar, setAGuardar] = useState(false);

  const carregar = () => {
    setCarregando(true);
    setErro('');
    balanceteService.empresas
      .listar()
      .then(setEmpresas)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar as empresas.')))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []);

  const criar = async () => {
    if (!nome.trim()) {
      setErro('Indique o nome da empresa.');
      return;
    }
    setAGuardar(true);
    setErro('');
    try {
      const empresa = await balanceteService.empresas.criar({ nome: nome.trim(), nif: nif.trim() || undefined, moeda });
      setEmpresas((lista) => [...lista, empresa]);
      setNome('');
      setNif('');
      setMoeda('AKZ');
      setACriar(false);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível criar a empresa.'));
    } finally {
      setAGuardar(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Balancete</h2>
          <p className="text-sm text-gray-500">Escolha a empresa para consultar exercícios e relatórios contabilísticos.</p>
        </div>
        <BotaoPrimario onClick={() => setACriar((v) => !v)} icon={Plus}>
          Nova Empresa
        </BotaoPrimario>
      </div>

      {aCriar && (
        <Cartao className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="AP Consultoria, Lda"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NIF</label>
              <input
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="5000123456"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>
          </div>
          <div className="space-y-1 max-w-[160px]">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Moeda</label>
            <input
              value={moeda}
              onChange={(e) => setMoeda(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
          {erro && <AlertaErro mensagem={erro} />}
          <BotaoPrimario onClick={criar} disabled={aGuardar} icon={aGuardar ? Loader2 : Check}>
            {aGuardar ? 'A guardar...' : 'Guardar Empresa'}
          </BotaoPrimario>
        </Cartao>
      )}

      {!aCriar && erro && <AlertaErro mensagem={erro} />}

      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
        </div>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">Ainda não existem empresas registadas no balancete.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {empresas.map((empresa) => (
            <button
              key={empresa.id}
              onClick={() => onSelecionar(empresa)}
              className="text-left bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-theme-primary hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-theme-primary-light flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5 text-theme-primary" />
              </div>
              <p className="font-bold text-gray-900 truncate">{empresa.nome}</p>
              <p className="text-xs text-gray-500">{empresa.nif || 'Sem NIF'} · {empresa.moeda}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Selector de Exercício ─────────────────────────────

function SelectorExercicios({
  empresa,
  onVoltar,
  onSelecionar,
}: {
  empresa: EmpresaBalancete;
  onVoltar: () => void;
  onSelecionar: (exercicio: ExercicioBalancete) => void;
}) {
  const [exercicios, setExercicios] = useState<ExercicioBalancete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aCriar, setACriar] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mesInicial, setMesInicial] = useState(1);
  const [mesFinal, setMesFinal] = useState(12);
  const [aGuardar, setAGuardar] = useState(false);
  const [aExportar, setAExportar] = useState<{ id: number; formato: 'excel' | 'pdf' } | null>(null);
  const [erroExportacao, setErroExportacao] = useState('');

  useEffect(() => {
    setCarregando(true);
    setErro('');
    balanceteService.exercicios
      .listar(empresa.id)
      .then(setExercicios)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar os exercícios.')))
      .finally(() => setCarregando(false));
  }, [empresa.id]);

  const criar = async () => {
    setAGuardar(true);
    setErro('');
    try {
      const exercicio = await balanceteService.exercicios.criar(empresa.id, {
        ano,
        mes_inicial: mesInicial,
        mes_final: mesFinal,
      });
      setExercicios((lista) => [...lista, exercicio]);
      setACriar(false);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível criar o exercício.'));
    } finally {
      setAGuardar(false);
    }
  };

  const montarExportacaoExercicio = async (exercicio: ExercicioBalancete) => {
    const tabelas: TabelaExportavel[] = [];
    let algumaFonteOk = false;

    try {
      const saldos = await balanceteService.saldos.listar(exercicio.id);
      algumaFonteOk = true;
      if (saldos.length) {
        tabelas.push({
          titulo: 'Saldos',
          colunas: ['Código da Conta', 'Saldo', 'Não Corrente'],
          linhas: saldos.map((s) => ({ celulas: [s.codigo_conta, s.saldo, s.nao_corrente ? 'Sim' : 'Não'] })),
        });
      }
    } catch {
      // Secção omitida — sem dados disponíveis nesta fonte.
    }

    const mapaRelatorio = (titulo: string, relatorio: RelatorioBalancete): TabelaExportavel => ({
      titulo,
      colunas: ['Designação', 'Notas', 'Valor'],
      linhas: relatorio.linhas.map((linha) => ({
        celulas: [linha.designacao, linha.nota_ref ?? '', linha.valor],
        destaque: ehTotalizadora(linha.designacao),
      })),
    });

    try {
      const balanco = await balanceteService.balanco(exercicio.id);
      algumaFonteOk = true;
      if (balanco.linhas.length) tabelas.push(mapaRelatorio('Balanço', balanco));
    } catch {
      // Secção omitida — sem dados disponíveis nesta fonte.
    }

    try {
      const dr = await balanceteService.demonstracaoResultados(exercicio.id);
      algumaFonteOk = true;
      if (dr.linhas.length) tabelas.push(mapaRelatorio('Demonstração de Resultados', dr));
    } catch {
      // Secção omitida — sem dados disponíveis nesta fonte.
    }

    try {
      const templates = await balanceteService.notas.listarTemplates();
      algumaFonteOk = true;
      for (const template of templates) {
        try {
          const detalhe = await balanceteService.notas.obter(exercicio.id, template.numero);
          const linhasNota = normalizarNotaParaTabela(detalhe);
          if (linhasNota?.length) {
            tabelas.push({
              titulo: `Nota ${template.numero} · ${template.titulo}`,
              colunas: ['Rubrica', 'Valor'],
              linhas: linhasNota.map((linha) => ({ celulas: [linha.rubrica, linha.valor] })),
            });
          }
        } catch {
          // Nota sem dados disponíveis — omitida do export.
        }
      }
    } catch {
      // Secção omitida — sem dados disponíveis nesta fonte.
    }

    try {
      const modeloImposto = await balanceteService.modeloImposto.obter(exercicio.id);
      algumaFonteOk = true;
      const linhasModelo = normalizarNotaParaTabela(modeloImposto);
      if (linhasModelo?.length) {
        tabelas.push({
          titulo: 'Modelo 1 · Imposto Industrial',
          colunas: ['Rubrica', 'Valor'],
          linhas: linhasModelo.map((linha) => ({ celulas: [linha.rubrica, linha.valor] })),
        });
      }
    } catch {
      // Secção omitida — sem dados disponíveis nesta fonte.
    }

    try {
      const prejuizos = await balanceteService.modeloImposto.listarPrejuizos(exercicio.id);
      algumaFonteOk = true;
      if (prejuizos.length) {
        tabelas.push({
          titulo: 'Modelo 1 · Prejuízos Fiscais',
          colunas: ['Exercício de Origem', 'Valor'],
          linhas: prejuizos.map((p) => ({ celulas: [p.ano_origem, p.valor] })),
        });
      }
    } catch {
      // Secção omitida — sem dados disponíveis nesta fonte.
    }

    if (!algumaFonteOk) {
      throw new Error('Não foi possível obter dados deste exercício para exportar.');
    }

    return {
      ficheiro: nomeFicheiro('balancete', empresa.nome, exercicio.ano),
      empresaNome: empresa.nome,
      nif: empresa.nif,
      ano: exercicio.ano,
      moeda: empresa.moeda,
      tabelas,
    };
  };

  const exportarExercicio = async (exercicio: ExercicioBalancete, formato: 'excel' | 'pdf') => {
    setAExportar({ id: exercicio.id, formato });
    setErroExportacao('');
    try {
      const dados = await montarExportacaoExercicio(exercicio);
      if (formato === 'excel') await exportarExercicioExcel(dados);
      else exportarExercicioPdf(dados);
    } catch (e) {
      setErroExportacao(mensagemErro(e, 'Não foi possível exportar este exercício.'));
    } finally {
      setAExportar(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onVoltar} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{empresa.nome}</h2>
          <p className="text-sm text-gray-500">Exercícios económicos · {empresa.nif || 'Sem NIF'}</p>
        </div>
        <BotaoPrimario onClick={() => setACriar((v) => !v)} icon={Plus}>
          Novo Exercício
        </BotaoPrimario>
      </div>

      {aCriar && (
        <Cartao className="space-y-4">
          <div className="grid grid-cols-3 gap-4 max-w-lg">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano</label>
              <input
                type="number"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mês Inicial</label>
              <input
                type="number"
                min={1}
                max={12}
                value={mesInicial}
                onChange={(e) => setMesInicial(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mês Final</label>
              <input
                type="number"
                min={1}
                max={12}
                value={mesFinal}
                onChange={(e) => setMesFinal(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
              />
            </div>
          </div>
          {erro && <AlertaErro mensagem={erro} />}
          <BotaoPrimario onClick={criar} disabled={aGuardar} icon={aGuardar ? Loader2 : Check}>
            {aGuardar ? 'A guardar...' : 'Guardar Exercício'}
          </BotaoPrimario>
        </Cartao>
      )}

      {!aCriar && erro && <AlertaErro mensagem={erro} />}
      {erroExportacao && <AlertaErro mensagem={erroExportacao} />}

      {carregando ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
        </div>
      ) : exercicios.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">Esta empresa ainda não tem exercícios registados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {exercicios.map((exercicio) => {
            const aExportarExcel = aExportar?.id === exercicio.id && aExportar.formato === 'excel';
            const aExportarPdf = aExportar?.id === exercicio.id && aExportar.formato === 'pdf';
            return (
              <div
                key={exercicio.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-theme-primary hover:shadow-md transition-all space-y-3"
              >
                <button type="button" onClick={() => onSelecionar(exercicio)} className="w-full text-left">
                  <div className="w-10 h-10 rounded-xl bg-theme-primary-light flex items-center justify-center mb-3">
                    <Calculator className="w-5 h-5 text-theme-primary" />
                  </div>
                  <p className="font-bold text-gray-900">{exercicio.ano}</p>
                  <p className="text-xs text-gray-500">Mês {exercicio.mes_inicial} a {exercicio.mes_final}</p>
                </button>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => exportarExercicio(exercicio, 'excel')}
                    disabled={!!aExportar}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all disabled:opacity-60"
                  >
                    {aExportarExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => exportarExercicio(exercicio, 'pdf')}
                    disabled={!!aExportar}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all disabled:opacity-60"
                  >
                    {aExportarPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────── Saldos ───────────────────────────────────

function PainelSaldos({ exercicioId, moeda }: { exercicioId: number; moeda: string }) {
  const [linhas, setLinhas] = useState<SaldoContaItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    setCarregando(true);
    setErro('');
    balanceteService.saldos
      .listar(exercicioId)
      .then((resposta: SaldoConta[]) =>
        setLinhas(resposta.map((s) => ({ codigo_conta: s.codigo_conta, saldo: s.saldo, nao_corrente: s.nao_corrente })))
      )
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar os saldos.')))
      .finally(() => setCarregando(false));
  }, [exercicioId]);

  const actualizarLinha = (index: number, alteracao: Partial<SaldoContaItem>) => {
    setLinhas((lista) => lista.map((linha, i) => (i === index ? { ...linha, ...alteracao } : linha)));
    setSucesso(false);
  };

  const removerLinha = (index: number) => {
    setLinhas((lista) => lista.filter((_, i) => i !== index));
    setSucesso(false);
  };

  const adicionarLinha = () => {
    setLinhas((lista) => [...lista, { codigo_conta: '', saldo: 0, nao_corrente: false }]);
  };

  const guardar = async () => {
    setAGuardar(true);
    setErro('');
    setSucesso(false);
    try {
      const validas = linhas.filter((linha) => linha.codigo_conta.trim());
      const resposta = await balanceteService.saldos.actualizar(exercicioId, validas);
      setLinhas(resposta.map((s) => ({ codigo_conta: s.codigo_conta, saldo: s.saldo, nao_corrente: s.nao_corrente })));
      setSucesso(true);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível guardar os saldos.'));
    } finally {
      setAGuardar(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {erro && <AlertaErro mensagem={erro} />}
      {sucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          Saldos guardados com sucesso.
        </div>
      )}

      <div className="overflow-x-auto border border-gray-100 rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Código da Conta</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-center">Não Corrente</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {linhas.map((linha, index) => (
              <tr key={index}>
                <td className="px-4 py-2">
                  <input
                    value={linha.codigo_conta}
                    onChange={(e) => actualizarLinha(index, { codigo_conta: e.target.value })}
                    placeholder="43"
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm font-bold focus:bg-white focus:ring-1 focus:ring-theme-primary outline-none"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={linha.saldo}
                    onChange={(e) => actualizarLinha(index, { saldo: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm text-right focus:bg-white focus:ring-1 focus:ring-theme-primary outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!linha.nao_corrente}
                    onChange={(e) => actualizarLinha(index, { nao_corrente: e.target.checked })}
                    className="rounded border-gray-300 text-theme-primary focus:ring-theme-primary"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => removerLinha(index)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={adicionarLinha}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-theme-primary hover:bg-theme-primary-light rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar Conta
        </button>
        <BotaoPrimario onClick={guardar} disabled={aGuardar} icon={aGuardar ? Loader2 : Save}>
          {aGuardar ? 'A guardar...' : 'Guardar Saldos'}
        </BotaoPrimario>
      </div>
      <p className="text-xs text-gray-400">Moeda de reporte: {moeda}</p>
    </div>
  );
}

// ───────────────────────────── Balanço / DR (relatório) ─────────────────────────────

const SECCAO_LABELS: Record<string, string> = {
  activo_nao_corrente: 'Activo Não Corrente',
  activo_corrente: 'Activo Corrente',
  capital_proprio: 'Capital Próprio',
  passivo_nao_corrente: 'Passivo Não Corrente',
  passivo_corrente: 'Passivo Corrente',
};

function humanizarSeccao(seccao: string) {
  return SECCAO_LABELS[seccao] || seccao.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function agruparPorSeccao(linhas: LinhaRelatorio[]) {
  const grupos = new Map<string, LinhaRelatorio[]>();
  linhas.forEach((linha) => {
    const lista = grupos.get(linha.seccao) || [];
    lista.push(linha);
    grupos.set(linha.seccao, lista);
  });
  return Array.from(grupos.entries());
}

function ehTotalizadora(designacao: string) {
  return /^(total|soma)/i.test(designacao.trim());
}

function PainelRelatorio({
  titulo,
  empresa,
  exercicio,
  carregar,
}: {
  titulo: string;
  empresa: EmpresaBalancete;
  exercicio: ExercicioBalancete;
  carregar: (exercicioId: number) => Promise<RelatorioBalancete>;
}) {
  const [relatorio, setRelatorio] = useState<RelatorioBalancete | null>(null);
  const [relatorioAnterior, setRelatorioAnterior] = useState<RelatorioBalancete | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro('');
    setRelatorio(null);
    setRelatorioAnterior(null);

    (async () => {
      try {
        const actual = await carregar(exercicio.id);
        if (cancelado) return;
        setRelatorio(actual);

        try {
          const exerciciosEmpresa = await balanceteService.exercicios.listar(empresa.id);
          const anterior = exerciciosEmpresa.find((item) => item.ano === exercicio.ano - 1);
          if (anterior && !cancelado) {
            const relatorioAnteriorResposta = await carregar(anterior.id);
            if (!cancelado) setRelatorioAnterior(relatorioAnteriorResposta);
          }
        } catch {
          // Comparação com o exercício anterior é apenas complementar — falhas aqui não bloqueiam o relatório actual.
        }
      } catch (e) {
        if (!cancelado) setErro(mensagemErro(e, `Não foi possível carregar ${titulo.toLowerCase()}.`));
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [exercicio.id, exercicio.ano, empresa.id]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
      </div>
    );
  }

  if (erro) return <AlertaErro mensagem={erro} />;
  if (!relatorio) return null;

  const grupos = agruparPorSeccao(relatorio.linhas);
  const bateVerificacao = relatorio.verificacao == null || Math.abs(relatorio.verificacao) < 0.01;
  const valoresAnteriores = new Map((relatorioAnterior?.linhas || []).map((l) => [l.codigo_linha, l.valor]));

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-100 pb-4">
        <p className="text-lg font-black text-gray-900 uppercase tracking-tight">{titulo}</p>
        <p className="text-xs text-gray-500">
          {empresa.nome}
          {empresa.nif && ` · NIF ${empresa.nif}`} · Exercício {exercicio.ano} · Valores expressos em {empresa.moeda}
        </p>
      </div>

      {relatorio.verificacao != null && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wide ${
            bateVerificacao ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <span>Verificação (deve ser 0)</span>
          <span>{formatarValor(relatorio.verificacao, empresa.moeda)}</span>
        </div>
      )}

      {grupos.map(([seccao, linhas]) => (
        <Cartao key={seccao} className="p-0 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">{humanizarSeccao(seccao)}</p>
            <div className="hidden md:flex items-center gap-8 text-[10px] font-black text-gray-400 uppercase tracking-wide">
              <span className="w-28 text-right">Exercício {exercicio.ano}</span>
              {relatorioAnterior && <span className="w-28 text-right">Exercício {exercicio.ano - 1}</span>}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {linhas.map((linha) => {
              const totalizadora = ehTotalizadora(linha.designacao);
              return (
                <div
                  key={linha.codigo_linha}
                  className={`flex items-center justify-between px-5 py-3 text-sm gap-4 ${totalizadora ? 'bg-gray-50/60' : ''}`}
                >
                  <p className={totalizadora ? 'font-black text-gray-900' : 'text-gray-700'}>
                    {linha.designacao}
                    {linha.nota_ref != null && (
                      <span className="ml-2 text-[10px] font-bold text-theme-primary align-super">Nota {linha.nota_ref}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-8 flex-shrink-0">
                    <p className={`w-28 text-right ${totalizadora ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                      {formatarValor(linha.valor, empresa.moeda)}
                    </p>
                    {relatorioAnterior && (
                      <p className={`w-28 text-right ${totalizadora ? 'font-black text-gray-500' : 'text-gray-400'}`}>
                        {formatarValor(valoresAnteriores.get(linha.codigo_linha) ?? 0, empresa.moeda)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Cartao>
      ))}

      {grupos.length === 0 && <p className="text-sm text-gray-500 text-center py-12">Sem linhas de relatório para este exercício.</p>}
    </div>
  );
}

// ─────────────────────────────────── Notas ───────────────────────────────────

interface LinhaNotaNormalizada {
  rubrica: string;
  valor: string;
}

function normalizarNotaParaTabela(dados: unknown): LinhaNotaNormalizada[] | null {
  const extrairLinhas = (itens: unknown): LinhaNotaNormalizada[] | null => {
    if (!Array.isArray(itens) || !itens.length) return null;
    const linhas = itens
      .map((item: any) => {
        if (item == null) return null;
        if (typeof item !== 'object') return { rubrica: '', valor: String(item) };
        const rubrica = item.rubrica || item.label || item.designacao || item.nome || item.titulo || '';
        const valorBruto = item.valor ?? item.valores ?? item.total ?? item.montante;
        if (!rubrica && valorBruto == null) return null;
        const valor = Array.isArray(valorBruto) ? valorBruto.join(' / ') : String(valorBruto ?? '-');
        return { rubrica: String(rubrica || '-'), valor };
      })
      .filter((item): item is LinhaNotaNormalizada => item !== null);
    return linhas.length ? linhas : null;
  };

  if (Array.isArray(dados)) return extrairLinhas(dados);
  if (dados && typeof dados === 'object') {
    const objecto = dados as Record<string, unknown>;
    if (Array.isArray(objecto.linhas)) return extrairLinhas(objecto.linhas);
    if (Array.isArray(objecto.valores)) return extrairLinhas(objecto.valores);
    if (Array.isArray(objecto.seccoes)) {
      const linhas = (objecto.seccoes as any[]).flatMap((seccao) => {
        const linhasSeccao = extrairLinhas(seccao?.linhas) || [];
        return linhasSeccao.map((linha) => ({ rubrica: seccao?.titulo ? `${seccao.titulo} · ${linha.rubrica}` : linha.rubrica, valor: linha.valor }));
      });
      return linhas.length ? linhas : null;
    }
  }
  return null;
}

function PainelNotas({ empresa, exercicio }: { empresa: EmpresaBalancete; exercicio: ExercicioBalancete }) {
  const [templates, setTemplates] = useState<NotaTemplateResumo[]>([]);
  const [carregandoTemplates, setCarregandoTemplates] = useState(true);
  const [erroTemplates, setErroTemplates] = useState('');
  const [notaSelecionada, setNotaSelecionada] = useState<NotaTemplateResumo | null>(null);

  useEffect(() => {
    balanceteService.notas
      .listarTemplates()
      .then(setTemplates)
      .catch((e) => setErroTemplates(mensagemErro(e, 'Não foi possível carregar as notas.')))
      .finally(() => setCarregandoTemplates(false));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-1 space-y-2">
        {carregandoTemplates ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
          </div>
        ) : erroTemplates ? (
          <AlertaErro mensagem={erroTemplates} />
        ) : (
          templates.map((template) => (
            <button
              key={template.numero}
              onClick={() => setNotaSelecionada(template)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                notaSelecionada?.numero === template.numero
                  ? 'bg-theme-primary text-white font-bold'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium'
              }`}
            >
              Nota {template.numero} · {template.titulo}
            </button>
          ))
        )}
      </div>

      <div className="md:col-span-3">
        {notaSelecionada ? (
          <DetalheNota empresa={empresa} exercicio={exercicio} template={notaSelecionada} />
        ) : (
          <p className="text-sm text-gray-500 text-center py-12">Selecione uma nota às contas para consultar/editar.</p>
        )}
      </div>
    </div>
  );
}

function DetalheNota({
  empresa,
  exercicio,
  template,
}: {
  empresa: EmpresaBalancete;
  exercicio: ExercicioBalancete;
  template: NotaTemplateResumo;
}) {
  const exercicioId = exercicio.id;
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [aGuardarObservacoes, setAGuardarObservacoes] = useState(false);
  const [sucessoObservacoes, setSucessoObservacoes] = useState(false);

  const [novoSeccaoLinhaId, setNovoSeccaoLinhaId] = useState('');
  const [novosValores, setNovosValores] = useState('');
  const [valoresPendentes, setValoresPendentes] = useState<NotaValorItem[]>([]);
  const [aGuardarValores, setAGuardarValores] = useState(false);
  const [sucessoValores, setSucessoValores] = useState(false);

  useEffect(() => {
    setCarregando(true);
    setErro('');
    setValoresPendentes([]);
    setSucessoObservacoes(false);
    setSucessoValores(false);
    balanceteService.notas
      .obter(exercicioId, template.numero)
      .then((resposta: any) => {
        setDados(resposta);
        const texto = resposta?.texto || resposta?.observacoes?.texto || '';
        setObservacoes(typeof texto === 'string' ? texto : '');
      })
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o detalhe da nota.')))
      .finally(() => setCarregando(false));
  }, [exercicioId, template.numero]);

  const adicionarValorPendente = () => {
    const id = Number(novoSeccaoLinhaId);
    if (!id) return;
    const valores = novosValores
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
    setValoresPendentes((lista) => [...lista, { seccao_linha_id: id, valores }]);
    setNovoSeccaoLinhaId('');
    setNovosValores('');
    setSucessoValores(false);
  };

  const guardarValores = async () => {
    if (!valoresPendentes.length) return;
    setAGuardarValores(true);
    setErro('');
    try {
      const resposta = await balanceteService.notas.actualizar(exercicioId, template.numero, valoresPendentes);
      setDados(resposta);
      setValoresPendentes([]);
      setSucessoValores(true);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível guardar os valores da nota.'));
    } finally {
      setAGuardarValores(false);
    }
  };

  const guardarObservacoes = async () => {
    setAGuardarObservacoes(true);
    setErro('');
    try {
      await balanceteService.notas.actualizarObservacoes(exercicioId, template.numero, observacoes);
      setSucessoObservacoes(true);
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível guardar as observações.'));
    } finally {
      setAGuardarObservacoes(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
      </div>
    );
  }

  const linhasTabela = normalizarNotaParaTabela(dados);
  const semDados = dados == null || (typeof dados === 'object' && Object.keys(dados as object).length === 0);

  return (
    <div className="space-y-6">
      {erro && <AlertaErro mensagem={erro} />}

      <Cartao className="space-y-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nota {template.numero} · {template.titulo}</p>

        {linhasTabela ? (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Rubrica</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {linhasTabela.map((linha, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2.5 text-gray-700">{linha.rubrica}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{linha.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : semDados ? (
          <p className="text-sm text-gray-500 text-center py-8">Sem dados disponíveis para esta nota.</p>
        ) : (
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 overflow-auto max-h-72 whitespace-pre-wrap">
            {JSON.stringify(dados, null, 2)}
          </pre>
        )}
      </Cartao>

      <Cartao className="space-y-4">
        <p className="text-sm font-black text-gray-900">Adicionar Valores por Linha</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ID da Linha da Secção</label>
            <input
              value={novoSeccaoLinhaId}
              onChange={(e) => setNovoSeccaoLinhaId(e.target.value)}
              placeholder="1"
              className="w-40 px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[220px]">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valores (separados por vírgula)</label>
            <input
              value={novosValores}
              onChange={(e) => setNovosValores(e.target.value)}
              placeholder="100000, 20000, 80000"
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
          <button
            type="button"
            onClick={adicionarValorPendente}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {valoresPendentes.length > 0 && (
          <div className="space-y-1">
            {valoresPendentes.map((item, index) => (
              <p key={index} className="text-xs text-gray-500">
                Linha #{item.seccao_linha_id}: {item.valores.join(', ')}
              </p>
            ))}
          </div>
        )}

        {sucessoValores && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            Valores guardados com sucesso.
          </div>
        )}

        <BotaoPrimario onClick={guardarValores} disabled={aGuardarValores || !valoresPendentes.length} icon={aGuardarValores ? Loader2 : Save}>
          {aGuardarValores ? 'A guardar...' : 'Guardar Valores'}
        </BotaoPrimario>
      </Cartao>

      <Cartao className="space-y-4">
        <p className="text-sm font-black text-gray-900">Observações</p>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={5}
          placeholder="Texto livre para restrições, contingências, compromissos, etc."
          className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
        />
        {sucessoObservacoes && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            Observações guardadas com sucesso.
          </div>
        )}
        <BotaoPrimario onClick={guardarObservacoes} disabled={aGuardarObservacoes} icon={aGuardarObservacoes ? Loader2 : Save}>
          {aGuardarObservacoes ? 'A guardar...' : 'Guardar Observações'}
        </BotaoPrimario>
      </Cartao>
    </div>
  );
}

// ───────────────────────────── Modelo de Imposto ─────────────────────────────

function PainelModeloImposto({ empresa, exercicio }: { empresa: EmpresaBalancete; exercicio: ExercicioBalancete }) {
  const exercicioId = exercicio.id;
  const moeda = empresa.moeda;
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const [ajustesCriados, setAjustesCriados] = useState<AjusteFiscal[]>([]);
  const [tipoAjuste, setTipoAjuste] = useState('acrescer');
  const [designacaoAjuste, setDesignacaoAjuste] = useState('');
  const [valorAjuste, setValorAjuste] = useState(0);
  const [artigoAjuste, setArtigoAjuste] = useState('');
  const [aGuardarAjuste, setAGuardarAjuste] = useState(false);

  const [prejuizos, setPrejuizos] = useState<PrejuizoFiscal[]>([]);
  const [anoPrejuizo, setAnoPrejuizo] = useState(new Date().getFullYear() - 1);
  const [valorPrejuizo, setValorPrejuizo] = useState(0);
  const [aGuardarPrejuizo, setAGuardarPrejuizo] = useState(false);

  const carregarModelo = () => {
    setCarregando(true);
    setErro('');
    balanceteService.modeloImposto
      .obter(exercicioId)
      .then(setDados)
      .catch((e) => setErro(mensagemErro(e, 'Não foi possível carregar o modelo de imposto.')))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregarModelo();
    balanceteService.modeloImposto
      .listarPrejuizos(exercicioId)
      .then(setPrejuizos)
      .catch(() => undefined);
  }, [exercicioId]);

  const criarAjuste = async () => {
    if (!designacaoAjuste.trim()) {
      setErro('Indique a designação do ajuste fiscal.');
      return;
    }
    setAGuardarAjuste(true);
    setErro('');
    try {
      const ajuste = await balanceteService.modeloImposto.criarAjuste(exercicioId, {
        tipo: tipoAjuste,
        designacao: designacaoAjuste.trim(),
        valor: valorAjuste,
        artigo: artigoAjuste.trim() || undefined,
      });
      setAjustesCriados((lista) => [...lista, ajuste]);
      setDesignacaoAjuste('');
      setValorAjuste(0);
      setArtigoAjuste('');
      carregarModelo();
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível criar o ajuste fiscal.'));
    } finally {
      setAGuardarAjuste(false);
    }
  };

  const criarPrejuizo = async () => {
    setAGuardarPrejuizo(true);
    setErro('');
    try {
      const prejuizo = await balanceteService.modeloImposto.criarPrejuizo(exercicioId, {
        ano_origem: anoPrejuizo,
        valor: valorPrejuizo,
      });
      setPrejuizos((lista) => [...lista, prejuizo]);
      setValorPrejuizo(0);
      carregarModelo();
    } catch (e) {
      setErro(mensagemErro(e, 'Não foi possível registar o prejuízo fiscal.'));
    } finally {
      setAGuardarPrejuizo(false);
    }
  };

  const linhasModelo = normalizarNotaParaTabela(dados);
  const semDadosModelo = dados == null || (typeof dados === 'object' && Object.keys(dados as object).length === 0);

  return (
    <div className="space-y-6">
      {erro && <AlertaErro mensagem={erro} />}

      <Cartao className="space-y-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Modelo 1 · Imposto Industrial</p>
        {carregando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
          </div>
        ) : linhasModelo ? (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Rubrica</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {linhasModelo.map((linha, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2.5 text-gray-700">{linha.rubrica}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{linha.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : semDadosModelo ? (
          <p className="text-sm text-gray-500 text-center py-8">Sem dados disponíveis.</p>
        ) : (
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 overflow-auto max-h-72 whitespace-pre-wrap">
            {JSON.stringify(dados, null, 2)}
          </pre>
        )}
      </Cartao>

      <Cartao className="space-y-4">
        <p className="text-sm font-black text-gray-900">Novo Ajuste Fiscal</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
            <select
              value={tipoAjuste}
              onChange={(e) => setTipoAjuste(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            >
              <option value="acrescer">Acrescer</option>
              <option value="deduzir">Deduzir</option>
              <option value="deducao_colecta">Dedução à Colecta</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Designação</label>
            <input
              value={designacaoAjuste}
              onChange={(e) => setDesignacaoAjuste(e.target.value)}
              placeholder="Multas e penalidades"
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor</label>
            <input
              type="number"
              value={valorAjuste}
              onChange={(e) => setValorAjuste(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
        </div>
        <div className="space-y-1 max-w-md">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Artigo (opcional)</label>
          <input
            value={artigoAjuste}
            onChange={(e) => setArtigoAjuste(e.target.value)}
            placeholder="Art. 18º CII"
            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
          />
        </div>
        <BotaoPrimario onClick={criarAjuste} disabled={aGuardarAjuste} icon={aGuardarAjuste ? Loader2 : Plus}>
          {aGuardarAjuste ? 'A guardar...' : 'Adicionar Ajuste'}
        </BotaoPrimario>

        {ajustesCriados.length > 0 && (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
            {ajustesCriados.map((ajuste) => (
              <div key={ajuste.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="font-bold text-gray-800 capitalize">{ajuste.tipo.replace(/_/g, ' ')} · {ajuste.designacao}</p>
                  {ajuste.artigo && <p className="text-xs text-gray-400">{ajuste.artigo}</p>}
                </div>
                <p className="font-bold text-gray-700">{formatarValor(ajuste.valor, moeda)}</p>
              </div>
            ))}
          </div>
        )}
      </Cartao>

      <Cartao className="space-y-4">
        <p className="text-sm font-black text-gray-900">Prejuízos Fiscais Reportáveis (Art. 46 CII)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano de Origem</label>
            <input
              type="number"
              value={anoPrejuizo}
              onChange={(e) => setAnoPrejuizo(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor</label>
            <input
              type="number"
              value={valorPrejuizo}
              onChange={(e) => setValorPrejuizo(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-theme-primary focus:ring-0 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-end">
            <BotaoPrimario onClick={criarPrejuizo} disabled={aGuardarPrejuizo} icon={aGuardarPrejuizo ? Loader2 : Plus}>
              {aGuardarPrejuizo ? 'A guardar...' : 'Registar'}
            </BotaoPrimario>
          </div>
        </div>

        {prejuizos.length > 0 && (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Ano de Origem</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {prejuizos.map((prejuizo) => (
                  <tr key={prejuizo.id}>
                    <td className="px-4 py-3 text-gray-700">{prejuizo.ano_origem}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatarValor(prejuizo.valor, moeda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </div>
  );
}

// ───────────────────────────── Abas do exercício ─────────────────────────────

function PainelExercicio({
  empresa,
  exercicio,
  onTrocarExercicio,
  onTrocarEmpresa,
}: {
  empresa: EmpresaBalancete;
  exercicio: ExercicioBalancete;
  onTrocarExercicio: () => void;
  onTrocarEmpresa: () => void;
}) {
  const [aba, setAba] = useState<AbaExercicio>('saldos');

  const abas: { id: AbaExercicio; label: string; icon: any }[] = useMemo(
    () => [
      { id: 'saldos', label: 'Saldos', icon: Landmark },
      { id: 'balanco', label: 'Balanço', icon: FileText },
      { id: 'dr', label: 'Demonstração de Resultados', icon: ScrollText },
      { id: 'notas', label: 'Notas às Contas', icon: NotebookText },
      { id: 'modelo-imposto', label: 'Modelo de Imposto', icon: Calculator },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onTrocarExercicio} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            {empresa.nome} · {exercicio.ano}
          </h2>
          <button onClick={onTrocarEmpresa} className="text-xs text-gray-400 hover:text-theme-primary font-bold uppercase tracking-wide">
            Trocar Empresa
          </button>
        </div>
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

      {aba === 'saldos' && <PainelSaldos exercicioId={exercicio.id} moeda={empresa.moeda} />}
      {aba === 'balanco' && (
        <PainelRelatorio titulo="Balanço" empresa={empresa} exercicio={exercicio} carregar={balanceteService.balanco} />
      )}
      {aba === 'dr' && (
        <PainelRelatorio
          titulo="Demonstração de Resultados"
          empresa={empresa}
          exercicio={exercicio}
          carregar={balanceteService.demonstracaoResultados}
        />
      )}
      {aba === 'notas' && <PainelNotas empresa={empresa} exercicio={exercicio} />}
      {aba === 'modelo-imposto' && <PainelModeloImposto empresa={empresa} exercicio={exercicio} />}
    </div>
  );
}

// ─────────────────────────────────── Página ───────────────────────────────────

export function Balancete() {
  const [empresa, setEmpresa] = useState<EmpresaBalancete | null>(null);
  const [exercicio, setExercicio] = useState<ExercicioBalancete | null>(null);

  if (!empresa) {
    return <SelectorEmpresas onSelecionar={setEmpresa} />;
  }

  if (!exercicio) {
    return (
      <SelectorExercicios
        empresa={empresa}
        onVoltar={() => setEmpresa(null)}
        onSelecionar={setExercicio}
      />
    );
  }

  return (
    <PainelExercicio
      empresa={empresa}
      exercicio={exercicio}
      onTrocarExercicio={() => setExercicio(null)}
      onTrocarEmpresa={() => {
        setEmpresa(null);
        setExercicio(null);
      }}
    />
  );
}

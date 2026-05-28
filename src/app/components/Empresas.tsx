import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Mail, MapPin, Phone, Plus, Search, Server, X, AlertCircle, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Empresa } from '../types/api';
import { empresasService } from '../services/api';

function getEmpresaEmail(empresa: Empresa) {
  return empresa.Email_empresa || empresa.email || '';
}

function normalizarListaEmpresas(response: any): Empresa[] {
  const lista = Array.isArray(response) ? response : response?.results || response?.data || [];
  return Array.isArray(lista) ? lista : [];
}

const formInicial = {
  nome: '',
  Email_empresa: '',
  telefone: '',
  nif: '',
  endereco: '',
  status: 'activo' as 'activo' | 'inactivo',
};

export function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [exibirModal, setExibirModal] = useState(false);
  const [exibirDetalhes, setExibirDetalhes] = useState(false);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
  const [empresaEdicao, setEmpresaEdicao] = useState<Empresa | null>(null);
  const [statusEnvio, setStatusEnvio] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState(formInicial);
  const [listaPostos, setListaPostos] = useState([{ id: '', nome: '' }]);

  const carregarEmpresas = async () => {
    setCarregando(true);
    setErro('');

    try {
      const response = await empresasService.listar({ search: busca || undefined, limit: 50 });
      const lista = normalizarListaEmpresas(response);
      setEmpresas(lista);
      return lista;
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
      setErro(error?.message || 'Falha ao carregar empresas.');
      return [];
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarEmpresas();
  }, []);

  useEffect(() => {
    const timer = setTimeout(carregarEmpresas, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatusEnvio('loading');
    setErro('');

    const postos = listaPostos
      .filter((posto) => posto.id.trim() || posto.nome.trim())
      .reduce<Record<string, Record<string, string>>>((acc, posto, index) => {
        const chave = posto.id.trim() || `p${index + 1}`;
        acc[chave] = {
          id: chave,
          ...(posto.nome.trim() ? { nome: posto.nome.trim() } : {}),
        };
        return acc;
      }, {});

    try {
      if (empresaEdicao) {
        await empresasService.atualizacaoParcial(empresaEdicao.id, {
          ...formData,
          postos,
        });
      } else {
        await empresasService.criar({
          ...formData,
          postos,
        });
      }

      setStatusEnvio('success');
      setTimeout(() => {
        setExibirModal(false);
        setEmpresaEdicao(null);
        setFormData(formInicial);
        setListaPostos([{ id: '', nome: '' }]);
        setStatusEnvio('idle');
        carregarEmpresas();
      }, 900);
    } catch (error: any) {
      console.error('Erro ao criar empresa:', error);
      if (error?.status >= 500) {
        try {
          const response = await empresasService.listar({ limit: 100 });
          const lista = normalizarListaEmpresas(response);
          const criada = lista.some((empresa) =>
            empresa.nif === formData.nif || getEmpresaEmail(empresa) === formData.Email_empresa
          );

          if (criada) {
            setEmpresas(lista);
            setStatusEnvio('success');
            setTimeout(() => {
              setExibirModal(false);
              setEmpresaEdicao(null);
              setFormData(formInicial);
              setListaPostos([{ id: '', nome: '' }]);
              setStatusEnvio('idle');
            }, 900);
            return;
          }
        } catch (confirmError) {
          console.error('Erro ao confirmar criação da empresa:', confirmError);
        }
      }
      setErro(error?.message || 'Falha ao cadastrar empresa.');
      setStatusEnvio('error');
      setTimeout(() => setStatusEnvio('idle'), 2500);
    }
  };

  const abrirDetalhes = async (empresa: Empresa) => {
    setErro('');
    try {
      const detalhe = await empresasService.obterPorId(empresa.id);
      setEmpresaSelecionada(detalhe);
    } catch (error) {
      console.error('Erro ao carregar detalhes da empresa:', error);
      setEmpresaSelecionada(empresa);
    }
    setExibirDetalhes(true);
  };

  const abrirEdicao = (empresa: Empresa) => {
    setEmpresaEdicao(empresa);
    setFormData({
      nome: empresa.nome || '',
      Email_empresa: getEmpresaEmail(empresa),
      telefone: empresa.telefone || '',
      nif: empresa.nif || '',
      endereco: empresa.endereco || '',
      status: (empresa.status as 'activo' | 'inactivo') || 'activo',
    });
    const postos = empresa.postos && typeof empresa.postos === 'object'
      ? Object.entries(empresa.postos).map(([chave, valor]: [string, any]) => ({
          id: valor?.id || chave,
          nome: valor?.nome || valor?.Nome || '',
        }))
      : [];
    setListaPostos(postos.length ? postos : [{ id: '', nome: '' }]);
    setExibirDetalhes(false);
    setExibirModal(true);
  };

  const removerEmpresa = async (empresa: Empresa) => {
    if (!window.confirm(`Deseja remover a empresa ${empresa.nome}?`)) return;
    setErro('');
    try {
      await empresasService.deletar(empresa.id);
      setExibirDetalhes(false);
      setEmpresaSelecionada(null);
      await carregarEmpresas();
    } catch (error: any) {
      console.error('Erro ao remover empresa:', error);
      setErro(error?.message || 'Falha ao remover empresa.');
    }
  };

  const fecharFormulario = () => {
    setExibirModal(false);
    setEmpresaEdicao(null);
    setFormData(formInicial);
    setListaPostos([{ id: '', nome: '' }]);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Empresas</h2>
          <p className="text-sm text-gray-500">Cadastre empresas e depois associe vários clientes à mesma empresa.</p>
        </div>
        <button
          onClick={() => setExibirModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar Empresa</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome, e-mail ou NIF..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          />
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{erro}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {carregando ? (
          Array(6).fill(0).map((_, index) => <div key={index} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)
        ) : empresas.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma empresa cadastrada.</p>
          </div>
        ) : empresas.map((empresa) => (
          <button
            key={empresa.id}
            onClick={() => abrirDetalhes(empresa)}
            className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-left hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                empresa.status === 'inactivo' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {empresa.status === 'inactivo' ? 'Inativa' : 'Ativa'}
              </span>
            </div>

            <h3 className="text-lg font-black text-gray-900 mb-1">{empresa.nome}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase mb-5">NIF {empresa.nif || 'N/A'}</p>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{getEmpresaEmail(empresa) || 'Sem e-mail'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{empresa.telefone || 'Sem telefone'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{empresa.endereco || 'Sem endereço'}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {exibirModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{empresaEdicao ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button onClick={fecharFormulario} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8 max-h-[65vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input label="Nome da empresa *" name="nome" value={formData.nome} onChange={setFormData} required />
                <Input label="E-mail da empresa *" name="Email_empresa" type="email" value={formData.Email_empresa} onChange={setFormData} required />
                <Input label="NIF *" name="nif" value={formData.nif} onChange={setFormData} required />
                <Input label="Telefone *" name="telefone" value={formData.telefone} onChange={setFormData} required />
                <div className="md:col-span-2">
                  <Input label="Endereço *" name="endereco" value={formData.endereco} onChange={setFormData} required />
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      Postos da empresa
                    </h4>
                    <button
                      type="button"
                      onClick={() => setListaPostos([...listaPostos, { id: '', nome: '' }])}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Posto
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaPostos.map((posto, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={posto.id}
                            onChange={(event) => {
                              const nova = [...listaPostos];
                              nova[index].id = event.target.value;
                              setListaPostos(nova);
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                            placeholder="Chave do posto. Ex: pi"
                          />
                          <input
                            type="text"
                            value={posto.nome}
                            onChange={(event) => {
                              const nova = [...listaPostos];
                              nova[index].nome = event.target.value;
                              setListaPostos(nova);
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                            placeholder="Nome ou observação do posto"
                          />
                        </div>
                        {listaPostos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setListaPostos(listaPostos.filter((_, i) => i !== index))}
                            className="absolute -right-2 -top-2 w-6 h-6 bg-red-100 text-red-600 rounded-full"
                          >
                            x
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={fecharFormulario} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={statusEnvio === 'loading' || statusEnvio === 'success'}
                  className={`px-8 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 min-w-[170px] justify-center ${
                    statusEnvio === 'success' ? 'bg-emerald-500 shadow-emerald-100' : statusEnvio === 'error' ? 'bg-red-500 shadow-red-100' : 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700'
                  }`}
                >
                  {statusEnvio === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : statusEnvio === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{statusEnvio === 'success' ? 'Salva!' : 'Salvar Empresa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {exibirDetalhes && empresaSelecionada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-100 uppercase tracking-widest">Detalhes da empresa</p>
                  <h3 className="text-2xl font-black">{empresaSelecionada.nome}</h3>
                </div>
              </div>
              <button onClick={() => setExibirDetalhes(false)} className="p-2 hover:bg-white/20 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="NIF" value={empresaSelecionada.nif || 'N/A'} />
                <Info label="Status" value={empresaSelecionada.status === 'inactivo' ? 'Inativa' : 'Ativa'} />
                <Info label="E-mail" value={getEmpresaEmail(empresaSelecionada) || 'Sem e-mail'} />
                <Info label="Telefone" value={empresaSelecionada.telefone || 'Sem telefone'} />
                <div className="md:col-span-2">
                  <Info label="Endereço" value={empresaSelecionada.endereco || 'Sem endereço'} />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Postos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {empresaSelecionada.postos && Object.keys(empresaSelecionada.postos).length ? (
                    Object.entries(empresaSelecionada.postos).map(([chave, valor]: [string, any]) => (
                      <div key={chave} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase">{valor?.id || chave}</p>
                        <p className="text-sm font-bold text-gray-800">{valor?.nome || valor?.Nome || 'Posto sem nome'}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Sem postos cadastrados.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => removerEmpresa(empresaSelecionada)} className="px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Remover
              </button>
              <button onClick={() => abrirEdicao(empresaSelecionada)} className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2">
                <Pencil className="w-4 h-4" /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  required,
  type = 'text',
}: {
  label: string;
  name: keyof typeof formInicial;
  value: string;
  onChange: React.Dispatch<React.SetStateAction<typeof formInicial>>;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-bold text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={(event) => onChange((prev) => ({ ...prev, [name]: event.target.value }))}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

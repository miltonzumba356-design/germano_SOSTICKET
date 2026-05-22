import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  Save,
  Settings,
} from 'lucide-react';
import { configuracoesService } from '../services/api';

type ConfiguracaoSistema = {
  moeda: string;
  fuso_horario: string;
  email_notificacoes: boolean;
  prazo_padrao_intervencao: number | string;
  taxa_hora: string;
  taxa_mensal: string;
  taxa_anual: string;
};

const configInicial: ConfiguracaoSistema = {
  moeda: 'Kz',
  fuso_horario: 'Africa/Luanda',
  email_notificacoes: true,
  prazo_padrao_intervencao: 48,
  taxa_hora: '5000.00',
  taxa_mensal: '5000.00',
  taxa_anual: '5000.00',
};

export function Configuracoes() {
  const [formData, setFormData] = useState<ConfiguracaoSistema>(configInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregarConfiguracoes = async () => {
    setCarregando(true);
    setErro('');
    try {
      const response = await configuracoesService.listar();
      const dados = Array.isArray(response) ? response[0] : (response as any)?.results?.[0] || response;
      setFormData({ ...configInicial, ...(dados || {}) });
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
      setErro(error?.message || 'Não foi possível carregar as configurações.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    setSucesso('');

    try {
      await configuracoesService.atualizar({
        moeda: formData.moeda,
        fuso_horario: formData.fuso_horario,
        email_notificacoes: formData.email_notificacoes,
        prazo_padrao_intervencao: Number(formData.prazo_padrao_intervencao || 0),
        taxa_hora: String(formData.taxa_hora || '0'),
        taxa_mensal: String(formData.taxa_mensal || '0'),
        taxa_anual: String(formData.taxa_anual || '0'),
      });
      setSucesso('Configurações atualizadas com sucesso.');
      await carregarConfiguracoes();
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      setErro(error?.message || 'Falha ao salvar configurações.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h2>
        <p className="text-sm text-gray-500">Parâmetros usados pela API para SLA, notificações e cálculo de contratos.</p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{erro}</p>
        </div>
      )}
      {sucesso && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-bold">{sucesso}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {carregando ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            <div className="p-8 space-y-8">
              <section className="space-y-5">
                <Header icon={Globe} title="Geral" description="Moeda e fuso horário usados em datas e valores." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Moeda" name="moeda" value={formData.moeda} onChange={handleChange} required />
                  <Select
                    label="Fuso Horário"
                    name="fuso_horario"
                    value={formData.fuso_horario}
                    onChange={handleChange}
                    options={['Africa/Luanda', 'Europe/Lisbon', 'UTC']}
                  />
                </div>
              </section>

              <section className="space-y-5">
                <Header icon={Bell} title="SLA e Notificações" description="Prazo padrão das intervenções e envio de e-mails." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Prazo padrão de intervenção (horas)"
                    name="prazo_padrao_intervencao"
                    type="number"
                    min="0"
                    value={formData.prazo_padrao_intervencao}
                    onChange={handleChange}
                    required
                  />
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span>
                      <span className="block text-sm font-bold text-gray-900">Notificações por e-mail</span>
                      <span className="block text-xs text-gray-500">Usado pelo backend em alertas automáticos.</span>
                    </span>
                    <input
                      type="checkbox"
                      name="email_notificacoes"
                      checked={formData.email_notificacoes}
                      onChange={handleChange}
                      className="w-5 h-5 accent-indigo-600"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-5">
                <Header icon={CreditCard} title="Taxas" description="Valores usados no cálculo de contratos e intervenções." />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Taxa hora" name="taxa_hora" value={formData.taxa_hora} onChange={handleChange} required />
                  <Input label="Taxa mensal" name="taxa_mensal" value={formData.taxa_mensal} onChange={handleChange} required />
                  <Input label="Taxa anual" name="taxa_anual" value={formData.taxa_anual} onChange={handleChange} required />
                </div>
              </section>
            </div>

            <div className="px-8 py-5 bg-gray-50 flex items-center justify-end border-t border-gray-100">
              <button
                type="submit"
                disabled={salvando}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Configurações
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function Header({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <header className="flex items-center gap-4">
      <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </header>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <input
        {...inputProps}
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-gray-900"
      />
    </div>
  );
}

function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <select
        {...props}
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-gray-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

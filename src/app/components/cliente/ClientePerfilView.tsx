import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  User, Lock, Bell, LogOut, Mail, Phone, Loader2, Save,
  CheckCircle2, AlertCircle, Shield,
} from 'lucide-react';
import type { Usuario } from '../../types/api';

interface FormDataState {
  nome: string;
  telefone: string;
  avatar_url: string;
}

interface SenhaState {
  password_atual: string;
  password_nova: string;
  confirmar: string;
}

export interface ClientePerfilViewProps {
  usuario: Usuario | null;
  perfil: Usuario | null;
  formData: FormDataState;
  setFormData: (fn: (prev: FormDataState) => FormDataState) => void;
  senha: SenhaState;
  setSenha: (fn: (prev: SenhaState) => SenhaState) => void;
  preferencias: Record<string, boolean>;
  setPreferencias: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  handleSalvarPerfil: (e: React.FormEvent) => void | Promise<void>;
  handleAlterarSenha: (e: React.FormEvent) => void | Promise<void>;
  tentarLogout: () => void;
  carregando: boolean;
  salvando: boolean;
  erro: string;
  sucesso: string;
}

type Secao = 'perfil' | 'seguranca' | 'notificacoes';

const SECOES = [
  { id: 'perfil' as const, label: 'Dados Pessoais', icon: User },
  { id: 'seguranca' as const, label: 'Segurança', icon: Lock },
  { id: 'notificacoes' as const, label: 'Notificações', icon: Bell },
];

export function ClientePerfilView({
  usuario, perfil, formData, setFormData, senha, setSenha, preferencias, setPreferencias,
  handleSalvarPerfil, handleAlterarSenha, tentarLogout, carregando, salvando, erro, sucesso,
}: ClientePerfilViewProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>('perfil');
  const nomePerfil = perfil?.nome || usuario?.nome || 'Utilizador';
  const ultimoErroMostrado = useRef('');
  const ultimoSucessoMostrado = useRef('');

  useEffect(() => {
    if (erro && erro !== ultimoErroMostrado.current) toast.error(erro);
    ultimoErroMostrado.current = erro;
  }, [erro]);

  useEffect(() => {
    if (sucesso && sucesso !== ultimoSucessoMostrado.current) toast.success(sucesso);
    ultimoSucessoMostrado.current = sucesso;
  }, [sucesso]);

  if (carregando) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-8 space-y-4">
      <div>
        <h2 className="cliente-font-heading text-2xl font-bold text-[#191c1e]">Meu Perfil</h2>
        <p className="text-sm text-[#4a4455] mt-0.5">Dados pessoais, segurança e notificações</p>
      </div>

      {/* Cartão de identidade */}
      <div className="bg-white rounded-[18px] shadow-sm p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#7c3aed] to-[#630ed4] flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3">
          {nomePerfil.substring(0, 1).toUpperCase()}
        </div>
        <h3 className="cliente-font-heading text-lg font-bold text-[#191c1e]">{nomePerfil}</h3>
        <p className="text-xs font-semibold text-[#7c3aed] bg-[#ede0ff] inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-wide">
          {perfil?.perfil || usuario?.perfil}
        </p>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#4a4455]">
          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {perfil?.email || usuario?.email || '-'}</span>
          {(perfil?.telefone) && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {perfil.telefone}</span>}
        </div>
      </div>

      {erro && <Aviso tipo="error" texto={erro} />}
      {sucesso && <Aviso tipo="success" texto={sucesso} />}

      {/* Navegação de secções */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {SECOES.map((secao) => {
          const Icon = secao.icon;
          const ativo = secaoAtiva === secao.id;
          return (
            <button
              key={secao.id}
              onClick={() => setSecaoAtiva(secao.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                ativo ? 'bg-[#7c3aed] text-white shadow-md shadow-[#7c3aed]/25' : 'bg-[#eceef0] text-[#4a4455]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {secao.label}
            </button>
          );
        })}
      </div>

      {/* Formulário da secção ativa */}
      <div className="bg-white rounded-[18px] shadow-sm p-5">
        {secaoAtiva === 'perfil' && (
          <form onSubmit={handleSalvarPerfil} className="space-y-4">
            <Campo label="Nome" value={formData.nome} onChange={(v) => setFormData((prev) => ({ ...prev, nome: v }))} required />
            <Campo label="Email" value={perfil?.email || usuario?.email || ''} disabled icone={Mail} />
            <Campo label="Telefone" value={formData.telefone} onChange={(v) => setFormData((prev) => ({ ...prev, telefone: v }))} icone={Phone} />
            <Campo label="Avatar URL" value={formData.avatar_url} onChange={(v) => setFormData((prev) => ({ ...prev, avatar_url: v }))} />
            <BotaoSalvar salvando={salvando} label="Atualizar Perfil" />
          </form>
        )}

        {secaoAtiva === 'seguranca' && (
          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <p className="flex items-center gap-2 text-xs font-bold text-[#4a4455] uppercase tracking-widest mb-1">
              <Shield className="w-4 h-4 text-[#7c3aed]" /> Alterar Password
            </p>
            <Campo label="Password Atual" type="password" value={senha.password_atual} onChange={(v) => setSenha((prev) => ({ ...prev, password_atual: v }))} required />
            <Campo label="Nova Password" type="password" value={senha.password_nova} onChange={(v) => setSenha((prev) => ({ ...prev, password_nova: v }))} required />
            <Campo label="Confirmar Nova Password" type="password" value={senha.confirmar} onChange={(v) => setSenha((prev) => ({ ...prev, confirmar: v }))} required />
            <BotaoSalvar salvando={salvando} label="Alterar Password" />
          </form>
        )}

        {secaoAtiva === 'notificacoes' && (
          <form onSubmit={handleSalvarPerfil} className="space-y-2">
            <Toggle label="Alertas de Novos Clientes" checked={!!preferencias.novos_clientes} onChange={(c) => setPreferencias((prev) => ({ ...prev, novos_clientes: c }))} />
            <Toggle label="Relatório Semanal" checked={!!preferencias.relatorio_semanal} onChange={(c) => setPreferencias((prev) => ({ ...prev, relatorio_semanal: c }))} />
            <Toggle label="Alertas de SLA" checked={!!preferencias.alertas_sla} onChange={(c) => setPreferencias((prev) => ({ ...prev, alertas_sla: c }))} />
            <Toggle label="Acesso à Conta" checked={!!preferencias.acesso_conta} onChange={(c) => setPreferencias((prev) => ({ ...prev, acesso_conta: c }))} />
            <div className="pt-2">
              <BotaoSalvar salvando={salvando} label="Salvar Preferências" />
            </div>
          </form>
        )}
      </div>

      <button
        onClick={tentarLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-red-600 font-bold rounded-[18px] shadow-sm hover:bg-red-50 active:scale-[0.99] transition-all"
      >
        <LogOut className="w-4 h-4" /> Sair
      </button>
    </div>
  );
}

function Aviso({ tipo, texto }: { tipo: 'error' | 'success'; texto: string }) {
  const isError = tipo === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div className={`flex items-center gap-2 p-3.5 rounded-[14px] text-sm font-semibold ${isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      {texto}
    </div>
  );
}

function Campo({
  label, value, onChange, type = 'text', disabled = false, required = false, icone: Icone,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  icone?: any;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#4a4455] flex items-center gap-1">
        {Icone && <Icone className="w-3 h-3" />} {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-3 bg-[#f7f9fb] border border-transparent rounded-[12px] outline-none focus:bg-white focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all text-sm text-[#191c1e] disabled:opacity-50"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-3.5 bg-[#f7f9fb] rounded-[12px] cursor-pointer">
      <span className="text-sm font-semibold text-[#191c1e]">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-[#7c3aed]" />
    </label>
  );
}

function BotaoSalvar({ salvando, label }: { salvando: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={salvando}
      className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-[#7c3aed] text-white font-bold rounded-full hover:bg-[#630ed4] active:scale-[0.99] transition-all shadow-lg shadow-[#7c3aed]/25 disabled:opacity-50"
    >
      {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {label}
    </button>
  );
}

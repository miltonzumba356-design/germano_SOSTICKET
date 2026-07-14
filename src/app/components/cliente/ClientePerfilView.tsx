import { useState } from 'react';
import {
  User, Lock, Bell, LogOut, Mail, Phone, Camera, Loader2, Save,
  CheckCircle2, AlertCircle, Shield, ChevronRight,
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

export function ClientePerfilView({
  usuario, perfil, formData, setFormData, senha, setSenha, preferencias, setPreferencias,
  handleSalvarPerfil, handleAlterarSenha, tentarLogout, carregando, salvando, erro, sucesso,
}: ClientePerfilViewProps) {
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>('perfil');
  const nomePerfil = perfil?.nome || usuario?.nome || 'Utilizador';

  if (carregando) {
    return (
      <div className="flex justify-center py-24 bg-white rounded-3xl border border-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4">
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Coluna esquerda: identidade + navegação de configurações */}
      <aside className="w-full sm:w-[320px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/40">
        <div className="p-6 text-center border-b border-gray-100 bg-white">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 bg-theme-primary rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl border-4 border-white">
              {nomePerfil.substring(0, 1).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-theme-primary">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{nomePerfil}</h3>
          <p className="text-xs font-bold text-theme-primary bg-theme-light inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-wider">
            {perfil?.perfil || usuario?.perfil}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <ItemNav icon={User} label="Dados Pessoais" ativo={secaoAtiva === 'perfil'} onClick={() => setSecaoAtiva('perfil')} />
          <ItemNav icon={Lock} label="Segurança" ativo={secaoAtiva === 'seguranca'} onClick={() => setSecaoAtiva('seguranca')} />
          <ItemNav icon={Bell} label="Notificações" ativo={secaoAtiva === 'notificacoes'} onClick={() => setSecaoAtiva('notificacoes')} />
          <button
            onClick={tentarLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors mt-4"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-bold">Sair</span>
          </button>
        </nav>
      </aside>

      {/* Coluna direita: formulário da secção ativa */}
      <section className="flex-1 overflow-y-auto p-6 bg-[#f7f5fb]">
        <div className="max-w-lg mx-auto space-y-5">
          {erro && <Aviso tipo="error" texto={erro} />}
          {sucesso && <Aviso tipo="success" texto={sucesso} />}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {secaoAtiva === 'perfil' && (
              <form onSubmit={handleSalvarPerfil} className="space-y-5">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Dados Pessoais</h4>
                <Campo label="Nome" value={formData.nome} onChange={(v) => setFormData((prev) => ({ ...prev, nome: v }))} required />
                <Campo label="Email" value={perfil?.email || usuario?.email || ''} disabled icone={Mail} />
                <Campo label="Telefone" value={formData.telefone} onChange={(v) => setFormData((prev) => ({ ...prev, telefone: v }))} icone={Phone} />
                <Campo label="Avatar URL" value={formData.avatar_url} onChange={(v) => setFormData((prev) => ({ ...prev, avatar_url: v }))} />
                <BotaoSalvar salvando={salvando} label="Atualizar Perfil" />
              </form>
            )}

            {secaoAtiva === 'seguranca' && (
              <form onSubmit={handleAlterarSenha} className="space-y-5">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-theme-primary" /> Segurança
                </h4>
                <Campo label="Password Atual" type="password" value={senha.password_atual} onChange={(v) => setSenha((prev) => ({ ...prev, password_atual: v }))} required />
                <Campo label="Nova Password" type="password" value={senha.password_nova} onChange={(v) => setSenha((prev) => ({ ...prev, password_nova: v }))} required />
                <Campo label="Confirmar Nova Password" type="password" value={senha.confirmar} onChange={(v) => setSenha((prev) => ({ ...prev, confirmar: v }))} required />
                <BotaoSalvar salvando={salvando} label="Alterar Password" />
              </form>
            )}

            {secaoAtiva === 'notificacoes' && (
              <form onSubmit={handleSalvarPerfil} className="space-y-3">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Notificações</h4>
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
        </div>
      </section>
    </div>
    </div>
  );
}

function ItemNav({ icon: Icon, label, ativo, onClick }: { icon: any; label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
        ativo ? 'bg-theme-light text-theme-dark font-bold' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </span>
      <ChevronRight className="w-4 h-4 opacity-40" />
    </button>
  );
}

function Aviso({ tipo, texto }: { tipo: 'error' | 'success'; texto: string }) {
  const isError = tipo === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-bold ${isError ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
      <Icon className="w-5 h-5" />
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
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {Icone && <Icone className="w-3 h-3" />} {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary focus:bg-white transition-all text-sm font-medium text-gray-900 disabled:opacity-50"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-50 hover:border-gray-100 transition-all cursor-pointer">
      <span className="text-sm font-bold text-gray-900">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 accent-[var(--theme-primary)]" />
    </label>
  );
}

function BotaoSalvar({ salvando, label }: { salvando: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={salvando}
      className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary text-white font-bold rounded-xl hover:bg-theme-primary-hover transition-all shadow-lg disabled:opacity-50"
    >
      {salvando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
      {label}
    </button>
  );
}

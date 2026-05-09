import { useState } from 'react';
import { User, Lock, Bell, LogOut, Camera, Mail, Phone, MapPin, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Perfil() {
  const { usuario, logout } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<'info' | 'senha' | 'notificacoes'>('info');

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Meu Perfil</h2>
          <p className="text-gray-500 mt-1">Gerencie suas informações e preferências de segurança.</p>
        </div>
        <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          Sair do Sistema
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Card de Perfil Esquerdo */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden text-center p-8">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-indigo-100 border-4 border-white">
                {usuario?.nome.substring(0,1).toUpperCase()}
              </div>
              <button className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-indigo-600 hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{usuario?.nome}</h3>
            <p className="text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-3 py-1 rounded-full mt-2 uppercase tracking-wider">
              {usuario?.perfil}
            </p>
            
            <div className="mt-8 space-y-4 text-left">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{usuario?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>+244 923 000 000</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>Luanda, Angola</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <Shield className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
            <h4 className="text-lg font-bold mb-2">Conta Verificada</h4>
            <p className="text-sm text-white/80 leading-relaxed mb-4">A sua conta possui todos os privilégios de administrador do sistema.</p>
            <div className="flex items-center gap-2 text-xs font-bold bg-white/20 inline-block px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3 h-3" /> SECURITY STATUS: OK
            </div>
          </div>
        </div>

        {/* Abas de Configuração Direita */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-8 px-8 border-b border-gray-100">
              <TabLink active={abaAtiva === 'info'} onClick={() => setAbaAtiva('info')} label="Dados Pessoais" />
              <TabLink active={abaAtiva === 'senha'} onClick={() => setAbaAtiva('senha')} label="Segurança" />
              <TabLink active={abaAtiva === 'notificacoes'} onClick={() => setAbaAtiva('notificacoes')} label="Notificações" />
            </div>

            <div className="p-8">
               {abaAtiva === 'info' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <InputField label="Nome de Exibição" value={usuario?.nome} />
                     <InputField label="Email Principal" value={usuario?.email} disabled />
                     <InputField label="Telefone" value="+244 923 000 000" />
                     <InputField label="Cargo / Departamento" value="Administração Central" />
                   </div>
                   <div className="pt-6">
                     <button className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                       Atualizar Informações
                     </button>
                   </div>
                 </div>
               )}

               {abaAtiva === 'senha' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                   <p className="text-sm text-gray-500 mb-4">Recomendamos que altere a sua password a cada 90 dias.</p>
                   <div className="max-w-md space-y-4">
                     <InputField label="Password Atual" type="password" placeholder="••••••••" />
                     <InputField label="Nova Password" type="password" placeholder="Mínimo 8 caracteres" />
                     <InputField label="Confirmar Nova Password" type="password" placeholder="Repita a nova password" />
                   </div>
                   <div className="pt-6">
                     <button className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                       Alterar Password
                     </button>
                   </div>
                 </div>
               )}

               {abaAtiva === 'notificacoes' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <NotificationToggle label="Alertas de Novos Clientes" description="Receber e-mail quando um novo cliente se registar." checked={true} />
                    <NotificationToggle label="Relatório Semanal" description="Receber resumo financeiro e operacional todas as segundas." checked={true} />
                    <NotificationToggle label="Alertas de SLA" description="Notificar quando um ticket estiver próximo do vencimento." checked={true} />
                    <NotificationToggle label="Acesso à Conta" description="Alertar via e-mail quando for feito login num novo dispositivo." checked={false} />
                  </div>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function TabLink({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`py-6 text-sm font-bold transition-all border-b-2 ${
        active ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function InputField({ label, value, placeholder, type = "text", disabled = false }: { label: string, value?: string, placeholder?: string, type?: string, disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <input 
        type={type} 
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed" 
      />
    </div>
  );
}

function NotificationToggle({ label, description, checked }: { label: string, description: string, checked: boolean }) {
  return (
    <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-50 hover:border-gray-100 transition-all">
       <div>
         <p className="text-sm font-bold text-gray-900">{label}</p>
         <p className="text-xs text-gray-500 mt-0.5">{description}</p>
       </div>
       <div className="relative">
          <input type="checkbox" defaultChecked={checked} className="peer sr-only" id={label} />
          <label htmlFor={label} className="block w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-emerald-500 transition-colors cursor-pointer after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-6"></label>
       </div>
    </div>
  );
}

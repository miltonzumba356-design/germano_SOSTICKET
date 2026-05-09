import { useState } from 'react';
import { 
  Settings, 
  Mail, 
  CreditCard, 
  Users, 
  Shield, 
  Globe, 
  Bell, 
  Database,
  Save,
  Trash2,
  Lock
} from 'lucide-react';

export function Configuracoes() {
  const [secaoAtiva, setSecaoAtiva] = useState<'geral' | 'email' | 'financeiro' | 'usuarios'>('geral');

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h2>
        <p className="text-sm text-gray-500">Personalize o comportamento e as integrações da plataforma.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar de Configurações */}
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            <MenuButton active={secaoAtiva === 'geral'} onClick={() => setSecaoAtiva('geral')} label="Gerais" icon={Settings} />
            <MenuButton active={secaoAtiva === 'email'} onClick={() => setSecaoAtiva('email')} label="E-mail" icon={Mail} />
            <MenuButton active={secaoAtiva === 'financeiro'} onClick={() => setSecaoAtiva('financeiro')} label="Financeiro" icon={CreditCard} />
            <MenuButton active={secaoAtiva === 'usuarios'} onClick={() => setSecaoAtiva('usuarios')} label="Utilizadores" icon={Users} />
          </nav>
        </aside>

        {/* Área de Formulário */}
        <main className="flex-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
            
            {secaoAtiva === 'geral' && (
              <div className="p-8 space-y-8">
                <header className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Globe className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Configurações Gerais</h3>
                    <p className="text-sm text-gray-500">Informações básicas da sua empresa.</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Nome da Empresa" placeholder="Ex: Safir TI Solutions" />
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Logo da Empresa</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                         Logo
                      </div>
                      <button className="text-xs font-bold text-indigo-600 hover:underline">ALTERAR IMAGEM</button>
                    </div>
                  </div>
                  <Select label="Moeda Padrão" options={['Kz (Kwanza)', 'USD ($)', 'EUR (€)']} />
                  <Select label="Fuso Horário" options={['GMT+1 Luanda', 'GMT+0 Lisboa', 'GMT-3 São Paulo']} />
                  <Select label="Idioma" options={['Português (PT)', 'Português (BR)', 'English (US)']} />
                </div>
              </div>
            )}

            {secaoAtiva === 'email' && (
              <div className="p-8 space-y-8">
                <header className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><Mail className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Configurações de E-mail</h3>
                    <p className="text-sm text-gray-500">Configuração do servidor SMTP para envios automáticos.</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Servidor SMTP" placeholder="smtp.exemplo.com" />
                  <Input label="Porta" placeholder="587" />
                  <Input label="Utilizador" placeholder="email@empresa.com" />
                  <Input label="Senha" type="password" placeholder="••••••••" />
                  <div className="md:col-span-2">
                    <Toggle label="Notificações automáticas para Clientes" description="Envia e-mail ao abrir ou fechar um ticket." defaultChecked={true} />
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3">
                   <Bell className="w-5 h-5 text-amber-600 mt-0.5" />
                   <div className="text-xs text-amber-700 leading-relaxed">
                     <strong>Dica:</strong> Recomendamos o uso de SSL/TLS para envios seguros. Teste a conexão antes de salvar.
                   </div>
                </div>
              </div>
            )}

            {secaoAtiva === 'financeiro' && (
              <div className="p-8 space-y-8">
                <header className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><CreditCard className="w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Financeiro & Faturação</h3>
                    <p className="text-sm text-gray-500">Definições de preços, taxas e alertas.</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Taxa por Hora (Padrão)" placeholder="0.00 Kz" />
                  <Input label="Imposto (IVA %)" placeholder="14" />
                  <Input label="Dias para Alerta de Expiração" placeholder="30" />
                  <Select label="Forma de Pagamento Padrão" options={['Transferência Bancária', 'Cartão de Crédito', 'Dinheiro']} />
                </div>
              </div>
            )}

            {secaoAtiva === 'usuarios' && (
              <div className="p-8 space-y-8">
                 <div className="flex items-center justify-between">
                    <header className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Gestão de Utilizadores</h3>
                        <p className="text-sm text-gray-500">Administradores e acessos de backoffice.</p>
                      </div>
                    </header>
                    <button className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">ADICIONAR USER</button>
                 </div>

                 <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-xs font-bold text-gray-400 uppercase">
                          <th className="px-6 py-4">Nome</th>
                          <th className="px-6 py-4">Nível</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr>
                          <td className="px-6 py-4 font-bold">Admin Safir</td>
                          <td className="px-6 py-4"><span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">SUPER ADMIN</span></td>
                          <td className="px-6 py-4 text-right">
                             <button className="text-gray-400 hover:text-indigo-600"><Settings className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                 </div>
              </div>
            )}

            {/* Rodapé de Ações */}
            <div className="px-8 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-100">
               <button className="flex items-center gap-2 text-red-600 text-xs font-bold hover:underline">
                 <Trash2 className="w-4 h-4" /> DESCARTAR ALTERAÇÕES
               </button>
               <button className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                 <Save className="w-4 h-4" /> SALVAR CONFIGURAÇÕES
               </button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function MenuButton({ active, onClick, label, icon: Icon }: { active: boolean, onClick: () => void, label: string, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function Input({ label, type = "text", placeholder }: { label: string, type?: string, placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <input type={type} placeholder={placeholder} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-gray-900" />
    </div>
  );
}

function Select({ label, options }: { label: string, options: string[] }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-gray-900">
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, description, defaultChecked }: { label: string, description: string, defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
       <div>
         <p className="text-sm font-bold text-gray-900">{label}</p>
         <p className="text-xs text-gray-500">{description}</p>
       </div>
       <input type="checkbox" defaultChecked={defaultChecked} className="w-10 h-5 bg-gray-300 rounded-full appearance-none checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:translate-x-5" />
    </div>
  );
}

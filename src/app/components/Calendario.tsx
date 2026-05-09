import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Ticket
} from 'lucide-react';

export function Calendario() {
  const [dataAtual, setDataAtual] = useState(new Date());

  // Logica simples para gerar dias do mês
  const diasNoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
  const primeiroDiaSemana = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).getDay();
  
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDiaSemana }, (_, i) => i);

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendário de Trabalho</h2>
          <p className="text-sm text-gray-500">Visualize suas intervenções agendadas.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-gray-900 min-w-[120px] text-center">
            {meses[dataAtual.getMonth()]} {dataAtual.getFullYear()}
          </span>
          <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="px-4 py-4 text-xs font-bold text-gray-400 text-center uppercase tracking-widest">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {espacosVazios.map(i => (
            <div key={`empty-${i}`} className="min-h-[140px] p-2 border-b border-r border-gray-50 bg-gray-50/20"></div>
          ))}
          {dias.map(dia => {
            const isHoje = dia === new Date().getDate() && dataAtual.getMonth() === new Date().getMonth();
            const temEvento = dia % 5 === 0; // Simulação de eventos

            return (
              <div key={dia} className={`min-h-[140px] p-3 border-b border-r border-gray-50 transition-all hover:bg-gray-50/50 group cursor-pointer`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-bold ${isHoje ? 'w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center' : 'text-gray-400 group-hover:text-gray-900'}`}>
                    {dia}
                  </span>
                  {temEvento && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>}
                </div>
                {temEvento && (
                  <div className="space-y-2">
                    <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-700 truncate">#TKT-001 Instalação</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-2 h-2 text-indigo-400" />
                        <span className="text-[8px] text-indigo-400 font-bold">09:00</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-500" />
            Intervenções do Dia
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all cursor-pointer border border-transparent hover:border-gray-200">
              <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase">Mai</span>
                <span className="text-lg font-black text-gray-900">07</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm">Instalação de Servidor Proliant</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
                    <MapPin className="w-3 h-3" /> Electro M - Luanda
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                    <Clock className="w-3 h-3" /> 09:30 - 12:00
                  </span>
                </div>
              </div>
              <button className="px-3 py-1 bg-white text-indigo-600 border border-indigo-100 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                Ver Ticket
              </button>
            </div>
          </div>
        </div>

        <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Resumo da Semana</h3>
            <p className="text-indigo-100 text-sm mb-6">Você tem 4 intervenções agendadas para os próximos 7 dias.</p>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-indigo-500 pb-2">
                <span className="text-sm">Total de Horas</span>
                <span className="text-2xl font-black">18.5h</span>
              </div>
              <div className="flex justify-between items-end border-b border-indigo-500 pb-2">
                <span className="text-sm">Tickets Pendentes</span>
                <span className="text-2xl font-black">3</span>
              </div>
              <div className="flex justify-between items-end border-b border-indigo-500 pb-2">
                <span className="text-sm">SLA Médio</span>
                <span className="text-2xl font-black">98%</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

// Skeletons no formato real do conteúdo (em vez de um spinner genérico),
// para reduzir a sensação de "salto" quando os dados chegam.

export function ConversaSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-[18px] shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[#eceef0] flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3.5 w-2/5 bg-[#eceef0] rounded-full" />
          <div className="h-2.5 w-10 bg-[#eceef0] rounded-full" />
        </div>
        <div className="h-3 w-4/5 bg-[#eceef0] rounded-full" />
        <div className="flex gap-2 pt-0.5">
          <div className="h-4 w-14 bg-[#eceef0] rounded-full" />
          <div className="h-4 w-14 bg-[#eceef0] rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="bg-white rounded-[18px] shadow-sm p-4 animate-pulse">
      <div className="w-9 h-9 rounded-xl bg-[#eceef0] mb-3" />
      <div className="h-5 w-10 bg-[#eceef0] rounded-full mb-2" />
      <div className="h-2.5 w-16 bg-[#eceef0] rounded-full" />
    </div>
  );
}

export function ContratoSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-[18px] shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-full bg-[#eceef0] flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3.5 w-1/3 bg-[#eceef0] rounded-full" />
          <div className="h-4 w-14 bg-[#eceef0] rounded-full" />
        </div>
        <div className="h-3 w-2/5 bg-[#eceef0] rounded-full" />
        <div className="h-1.5 w-full bg-[#eceef0] rounded-full" />
      </div>
    </div>
  );
}

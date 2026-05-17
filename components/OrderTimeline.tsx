interface OrderTimelineProps {
  currentStatus: string;
  updates?: { status: string; created_at: string; note?: string }[];
}

const stages = [
  { id: 'ordered',   label: 'Ordered' },
  { id: 'cutting',   label: 'Cutting' },
  { id: 'sewing',    label: 'Sewing' },
  { id: 'printing',  label: 'Printing' },
  { id: 'qc',        label: 'QC' },
  { id: 'shipping',  label: 'Shipping' },
  { id: 'delivered', label: 'Delivered' },
];

export default function OrderTimeline({ currentStatus, updates = [] }: OrderTimelineProps) {
  const currentStageIndex = stages.findIndex(s => s.id === currentStatus);

  return (
    <div className="w-full">
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-kazi-sand" />
        {/* Progress line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-kazi-green transition-all duration-700"
          style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
        />

        {/* Stages */}
        <div className="relative flex justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex;

            return (
              <div key={stage.id} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-300 z-10 font-sans font-semibold ${
                  isCompleted && !isCurrent
                    ? 'bg-kazi-green border-kazi-green text-white'
                    : isCurrent
                    ? 'bg-white border-kazi-green text-kazi-green shadow-sm'
                    : 'bg-white border-kazi-sand text-kazi-slate/40'
                }`}>
                  {isCompleted && !isCurrent ? '✓' : index + 1}
                </div>
                <span className={`mt-2 text-xs font-sans font-medium text-center max-w-[72px] ${
                  isCompleted ? 'text-kazi-charcoal' : 'text-kazi-slate/40'
                }`}>
                  {stage.label}
                </span>
                {updates.find(u => u.status === stage.id)?.note && (
                  <span className="mt-1 text-[10px] text-kazi-slate-light text-center max-w-[90px] truncate">
                    {updates.find(u => u.status === stage.id)?.note}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

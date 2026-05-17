interface OrderStatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ordered:   { label: 'Ordered',       className: 'bg-kazi-charcoal/10 text-kazi-charcoal' },
  cutting:   { label: 'Cutting',       className: 'bg-kazi-slate/10 text-kazi-charcoal' },
  sewing:    { label: 'Sewing',        className: 'bg-kazi-slate/15 text-kazi-charcoal' },
  printing:  { label: 'Printing',      className: 'bg-kazi-green/10 text-kazi-green-dark' },
  qc:        { label: 'Quality Check', className: 'bg-kazi-slate/12 text-kazi-charcoal' },
  shipping:  { label: 'Shipping',      className: 'bg-kazi-green/15 text-kazi-green-dark' },
  delivered: { label: 'Delivered',     className: 'bg-kazi-green/20 text-kazi-green-dark font-semibold' },
  pending:   { label: 'Pending',       className: 'bg-kazi-sand/60 text-kazi-slate' },
  quoted:    { label: 'Quoted',        className: 'bg-kazi-slate/10 text-kazi-charcoal' },
  accepted:  { label: 'Accepted',      className: 'bg-kazi-green/20 text-kazi-green-dark' },
  rejected:  { label: 'Rejected',      className: 'bg-kazi-charcoal/10 text-kazi-slate' },
};

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-kazi-sand/40 text-kazi-slate' };
  return (
    <span className={`inline-flex px-3 py-1 rounded-sm text-xs font-sans font-medium uppercase tracking-wide ${config.className}`}>
      {config.label}
    </span>
  );
}

import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'priority' | 'availability' | 'resource_type';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', className = '' }) => {
  const normalized = (status || '').toLowerCase().replace(/_/g, ' ');

  // Color selection based on domain status
  let colorClass = 'text-slate-600';
  if (['critical', 'exhausted', 'suspended', 'rejected', 'cancelled'].includes(normalized)) {
    colorClass = 'text-red-700 font-semibold';
  } else if (['high', 'reserved', 'in transit', 'in_transit', 'under review', 'pending'].includes(normalized)) {
    colorClass = 'text-amber-700 font-semibold';
  } else if (['verified', 'assigned', 'open', 'free'].includes(normalized)) {
    colorClass = 'text-blue-700 font-semibold';
  } else if (['active', 'available', 'delivered', 'completed', 'resolved'].includes(normalized)) {
    colorClass = 'text-emerald-700 font-semibold';
  }

  return (
    <span className={`inline-flex items-center text-xs tracking-tight ${colorClass} ${className}`}>
      <span className="capitalize">{normalized}</span>
    </span>
  );
};

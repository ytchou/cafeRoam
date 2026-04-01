'use client';

import { PAYMENT_METHOD_LABELS } from '@/lib/constants/payment-methods';

interface PaymentMethod {
  method: string;
  accepted: boolean;
  confirmationCount: number;
  userVote: boolean | null;
}

interface PaymentMethodSectionProps {
  methods: PaymentMethod[];
}

export function PaymentMethodSection({ methods }: PaymentMethodSectionProps) {
  if (methods.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <h2 className="text-text-primary mb-2 text-sm font-semibold">
        Payment Methods
      </h2>
      <div className="flex flex-wrap gap-2">
        {methods.map((m) => (
          <span
            key={m.method}
            data-accepted={String(m.accepted)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              m.accepted
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-400 line-through'
            }`}
          >
            {PAYMENT_METHOD_LABELS[m.method] ?? m.method}
            {m.accepted && m.confirmationCount > 0 && (
              <span className="text-green-500">{m.confirmationCount}</span>
            )}
            {m.accepted && m.confirmationCount === 0 && (
              <span className="text-xs text-gray-400">reported</span>
            )}
          </span>
        ))}
        {/* TODO: "Suggest edit" button — wire bottom-sheet/popover with confirmation toggles */}
      </div>
    </div>
  );
}

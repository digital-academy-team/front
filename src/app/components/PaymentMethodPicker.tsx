import { CreditCard, Trash2 } from 'lucide-react';
import { maskCardNumber } from '@/app/store/PaymentMethodsContext';
import { PaymentMethod } from '@/app/types';
import { Button } from '@/app/components/ui/button';

interface PaymentMethodPickerProps {
  methods: PaymentMethod[];
  selectedMethodId: string | null;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

export function PaymentMethodPicker({ methods, selectedMethodId, onSelect, onRemove, emptyAction }: PaymentMethodPickerProps) {
  if (methods.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 px-5 py-4 text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-purple-500 dark:text-purple-300" />
          <span>No saved payment methods yet. Use the button above to add one.</span>
        </div>
        {emptyAction && (
          <Button type="button" variant="outline" size="sm" onClick={emptyAction.onClick} className="mt-3">
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {methods.map((method) => {
        const selected = method.id === selectedMethodId;

        return (
          <div
            key={method.id}
            className={`relative rounded-2xl border p-4 transition-all duration-200 ${
              selected
                ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-900/20 shadow-sm'
                : 'border-gray-200 dark:border-slate-700 hover:border-purple-300 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-start gap-3 pr-12">
              <button
                type="button"
                onClick={() => onSelect(method.id)}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${selected ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold dark:text-slate-100">{method.nickname}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{method.holderName}</p>
                    </div>
                    {selected && (
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                    <span className="font-mono">{maskCardNumber(method.cardNumber)}</span>
                    <span>Expires {method.expiry}</span>
                  </div>
                </div>
              </button>

              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(method.id)}
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-700 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  aria-label={`Remove ${method.nickname}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
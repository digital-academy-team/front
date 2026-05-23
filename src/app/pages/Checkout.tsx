import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useCart } from '@/app/store/CartContext';
import { usePaymentMethods } from '@/app/store/PaymentMethodsContext';
import { useAuth } from '@/app/store/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { PaymentMethodPicker } from '@/app/components/PaymentMethodPicker';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { enrollInCourse } = useAuth();
  const { methods: paymentMethods, selectedMethodId, selectedMethod, selectMethod, removeMethod } = usePaymentMethods();
  const navigate = useNavigate();
  const [step, setStep] = useState<'summary' | 'payment' | 'confirmation'>('summary');
  const [orderId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());

  const onPayment = async () => {
    if (!selectedMethod) {
      toast.error('Add a payment method in your profile first.');
      return;
    }

    await new Promise(r => setTimeout(r, 1500));
    await Promise.all(items.map(item => enrollInCourse(item.courseId, item.title, item.price)));
    clearCart();
    setStep('confirmation');
    toast.success(`Paid with ${selectedMethod.nickname}.`);
  };

  if (step === 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center dark:bg-slate-950 min-h-screen">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-3xl font-bold mb-2 dark:text-slate-100">Purchase Complete!</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-2">Order ID: <span className="font-mono font-bold dark:text-slate-200">#{orderId}</span></p>
        <p className="text-gray-600 dark:text-slate-400 mb-8">You now have access to all purchased courses.</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-purple-600 hover:bg-purple-700">
          Go to My Learning
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 dark:bg-slate-950 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 dark:text-slate-100">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 'summary' && (
            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => (
                  <div key={item.courseId} className="flex gap-4 pb-4 border-b dark:border-slate-700 last:border-0">
                    <img src={item.image} alt={item.title} loading="lazy" decoding="async" width={64} height={48} className="w-16 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1 dark:text-slate-100">{item.title}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{item.instructor}</p>
                    </div>
                    <span className="font-bold flex-shrink-0 dark:text-slate-100">${item.price}</span>
                  </div>
                ))}
                <Button onClick={() => setStep('payment')} className="w-full bg-purple-600 hover:bg-purple-700">
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 'payment' && (
            <Card>
              <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <PaymentMethodPicker
                  methods={paymentMethods}
                  selectedMethodId={selectedMethodId}
                  onSelect={selectMethod}
                  onRemove={(id) => {
                    removeMethod(id);
                    toast.success('Payment method removed.');
                  }}
                  emptyAction={{
                    label: 'Add payment method',
                    onClick: () => navigate('/profile?tab=payments'),
                  }}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep('summary')}>Back</Button>
                  <Button
                    type="button"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={onPayment}
                    disabled={!selectedMethod}
                  >
                    {selectedMethod ? `Pay $${total.toFixed(2)}` : 'Add payment method first'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 dark:text-slate-100">Total</h3>
              <div className="flex justify-between font-bold text-xl dark:text-slate-100">
                <span>Amount Due</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">30-day money-back guarantee</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

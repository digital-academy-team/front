import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useCart } from '@/app/store/CartContext';
import { useAuth } from '@/app/store/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface PaymentForm {
  cardNumber: string;
  expiry: string;
  cvv: string;
  name: string;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { enrollInCourse } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'summary' | 'payment' | 'confirmation'>('summary');
  const [orderId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PaymentForm>();

  const onPayment = async (_data: PaymentForm) => {
    await new Promise(r => setTimeout(r, 1500));
    await Promise.all(items.map(item => enrollInCourse(item.courseId, item.title, item.price)));
    clearCart();
    setStep('confirmation');
    toast.success('Payment successful!');
  };

  if (step === 'confirmation') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Purchase Complete!</h1>
        <p className="text-gray-600 mb-2">Order ID: <span className="font-mono font-bold">#{orderId}</span></p>
        <p className="text-gray-600 mb-8">You now have access to all purchased courses.</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-purple-600 hover:bg-purple-700">
          Go to My Learning
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 'summary' && (
            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => (
                  <div key={item.courseId} className="flex gap-4 pb-4 border-b last:border-0">
                    <img src={item.image} alt={item.title} className="w-16 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.instructor}</p>
                    </div>
                    <span className="font-bold flex-shrink-0">${item.price}</span>
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
              <CardContent>
                <form onSubmit={handleSubmit(onPayment)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cardholder Name</Label>
                    <Input placeholder="John Doe" {...register('name', { required: 'Required' })} />
                    {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input placeholder="1234 5678 9012 3456" {...register('cardNumber', { required: 'Required' })} />
                    {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry</Label>
                      <Input placeholder="MM/YY" {...register('expiry', { required: 'Required' })} />
                      {errors.expiry && <p className="text-sm text-red-500">{errors.expiry.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input placeholder="123" {...register('cvv', { required: 'Required' })} />
                      {errors.cvv && <p className="text-sm text-red-500">{errors.cvv.message}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep('summary')}>Back</Button>
                    <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
                      {isSubmitting ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4">Total</h3>
              <div className="flex justify-between font-bold text-xl">
                <span>Amount Due</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">30-day money-back guarantee</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

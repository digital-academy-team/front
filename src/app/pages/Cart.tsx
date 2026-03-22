import { Link, useNavigate } from 'react-router';
import { useCart } from '@/app/store/CartContext';
import { useAuth } from '@/app/store/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Trash2, ShoppingCart } from 'lucide-react';

export default function Cart() {
  const { items, removeFromCart, total } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center px-4">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some courses to get started!</p>
          <Link to="/courses"><Button className="bg-purple-600 hover:bg-purple-700">Browse Courses</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <Card key={item.courseId}>
              <CardContent className="p-4 flex gap-4">
                <img src={item.image} alt={item.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.instructor}</p>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="font-bold text-lg">${item.price}</span>
                  {item.originalPrice && (
                    <span className="text-sm text-gray-400 line-through">${item.originalPrice}</span>
                  )}
                  <button onClick={() => removeFromCart(item.courseId)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div>
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold">Order Summary</h2>
              <div className="flex justify-between text-gray-600">
                <span>{items.length} course{items.length > 1 ? 's' : ''}</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => isAuthenticated ? navigate('/checkout') : navigate('/login', { state: { from: { pathname: '/checkout' } } })}
              >
                Proceed to Checkout
              </Button>
              <Link to="/courses" className="block">
                <Button variant="outline" className="w-full">Continue Shopping</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { CartItem } from '../types';
import { createOrderInDb } from '../services/supabaseData';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  customerName?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  customerName,
}) => {
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [confirmedOrderCode, setConfirmedOrderCode] = useState('#CZ-8493');

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packagingFee = 0; // Complimentary luxury packaging
  const deliveryFee = 0; // Free luxury delivery
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax + packagingFee + deliveryFee;

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const { orderCode } = await createOrderInDb({
        customer: customerName || 'CakeZone Member',
        items,
        specialInstructions,
        amount: total,
      });
      if (orderCode) {
        setConfirmedOrderCode(orderCode);
      }
    } finally {
      setIsCheckingOut(false);
      setCheckoutComplete(true);
    }
  };

  const handleFinish = () => {
    setCheckoutComplete(false);
    setSpecialInstructions('');
    onClearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-surface sm:border-l border-outline-variant shadow-2xl flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 bg-surface-container border-b border-outline-variant/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shopping_bag</span>
              <h2 className="text-base sm:text-lg font-bold text-on-surface font-headline">
                Artisanal Bag ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close shopping bag"
              className="w-9 h-9 inline-flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
            {checkoutComplete ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-black text-on-surface font-headline">
                  Order Confirmed!
                </h3>
                <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                  Your artisanal order {confirmedOrderCode} has been scheduled in the patisserie production queue.
                </p>
                <div className="p-4 rounded-xl bg-surface-container text-xs text-left space-y-1.5 text-on-surface-variant">
                  <p className="font-bold text-on-surface">Order Summary:</p>
                  <p>Estimated Delivery: Tomorrow by 2:00 PM</p>
                  <p>Handcrafted by: Master Baker CZ</p>
                  <p className="font-bold text-primary pt-1">Total Paid: ₹{total.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={handleFinish}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">cake</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Your bag is empty</h3>
                <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                  Indulge in our signature creations or design a bespoke custom cake.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Explore Creations
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover bg-surface-container shrink-0"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-on-surface">{item.name}</h4>
                            {item.details && (
                              <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                                {item.details}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-outline hover:text-error text-xs p-1 cursor-pointer"
                            title="Remove item"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center border border-outline-variant rounded-lg bg-surface">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="px-2 py-0.5 text-on-surface hover:bg-surface-container text-xs font-bold rounded-l cursor-pointer"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-0.5 text-xs font-bold text-on-surface tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="px-2 py-0.5 text-on-surface hover:bg-surface-container text-xs font-bold rounded-r cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-bold text-sm text-primary tabular-nums">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Special Instructions */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
                    Cake Inscription or Baker Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g., 'Happy 30th Birthday Sophia!' or delivery buzzer note..."
                    className="w-full p-2.5 text-xs bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          {!checkoutComplete && items.length > 0 && (
            <div className="p-6 bg-surface-container border-t border-outline-variant/40 space-y-4">
              <div className="space-y-2 text-xs text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-on-surface tabular-nums">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Luxury Gold-Foil Packaging</span>
                  <span className="font-semibold text-emerald-600">Complimentary</span>
                </div>
                <div className="flex justify-between">
                  <span>Metropolitan Chilled Courier</span>
                  <span className="font-semibold text-emerald-600">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax (GST 5%)</span>
                  <span className="font-semibold text-on-surface tabular-nums">
                    ₹{tax.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-on-surface pt-2 border-t border-outline-variant/30">
                  <span>Total</span>
                  <span className="text-primary tabular-nums">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                className="w-full py-3.5 px-4 bg-primary text-on-primary font-headline font-bold rounded-xl shadow-md hover:bg-primary/90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isCheckingOut ? (
                  <span>Securing Artisan Slot...</span>
                ) : (
                  <>
                    <span>Proceed to Bespoke Checkout</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { createOrderInDb } from '../services/supabaseData';
import { LOGO_URL } from '../data/initialData';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  customerName?: string;
  customerEmail?: string;
}

const WHATSAPP_NUMBER_DISPLAY = '+91 9770566246';
const WHATSAPP_NUMBER_CLEAN = '919770566246';

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  customerName,
  customerEmail,
}) => {
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [contactError, setContactError] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'bag' | 'whatsapp' | 'confirmed'>('bag');
  const [isWhatsAppPopupOpen, setIsWhatsAppPopupOpen] = useState(false);
  const [chatDraftMessage, setChatDraftMessage] = useState('');
  const [hasSentWhatsAppMsg, setHasSentWhatsAppMsg] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [confirmedOrderCode, setConfirmedOrderCode] = useState('#CZ-8493');
  const [confirmedSnapshot, setConfirmedSnapshot] = useState<{
    items: CartItem[];
    total: number;
    contactNumber: string;
    whatsappUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCheckoutStep((prev) => (prev === 'confirmed' ? 'bag' : prev));
      setIsWhatsAppPopupOpen(false);
      setHasSentWhatsAppMsg(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (items.length === 0 && checkoutStep === 'whatsapp' && !isWhatsAppPopupOpen) {
      setCheckoutStep('bag');
    }
  }, [items.length, checkoutStep, isWhatsAppPopupOpen]);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const packagingFee = 0; // Complimentary luxury packaging
  const deliveryFee = 0; // Free luxury delivery
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax + packagingFee + deliveryFee;

  const isContactValid = /^\d{10}$/.test(contactNumber);

  const buildWhatsAppMessage = (
    orderItems: CartItem[],
    orderTotal: number,
    phone: string,
    code?: string
  ) => {
    const lines: string[] = [
      `Hello CakeZone! I would like to place a bespoke cake order${code ? ` (${code})` : ''}:`,
      '',
    ];

    orderItems.forEach((item, index) => {
      lines.push(`${index + 1}. Item Name: ${item.name}`);
      lines.push(`   Quantity: ${item.quantity}`);
      if (item.details) {
        lines.push(`   Details: ${item.details}`);
      }
      lines.push(`   Price: ₹${(item.price * item.quantity).toLocaleString('en-IN')}`);
      lines.push('');
    });

    if (specialInstructions.trim()) {
      lines.push(`Special Instructions / Inscription: ${specialInstructions.trim()}`);
      lines.push('');
    }

    lines.push(`Total Amount (incl. GST): ₹${orderTotal.toLocaleString('en-IN')}`);
    if (customerName) {
      lines.push(`Customer Name: ${customerName}`);
    }
    if (customerEmail) {
      lines.push(`Customer Email: ${customerEmail}`);
    }
    if (phone.trim()) {
      lines.push(`Contact Number: ${phone.trim()}`);
    }
    lines.push('');
    lines.push('Please confirm my order. Thank you!');

    return lines.join('\n');
  };

  const whatsappMessage = buildWhatsAppMessage(items, total, contactNumber);

  // Step 1 -> Step 2: Proceed to Bespoke Checkout
  const handleProceedToBespokeCheckout = () => {
    setContactError('');
    setCheckoutStep('whatsapp');
  };

  // Step 2 -> Open Small WhatsApp Window (after validating mandatory contact number)
  const handleOpenWhatsAppWindow = () => {
    if (!contactNumber.trim()) {
      setContactError('Contact number is mandatory to proceed with your bespoke order.');
      return;
    }
    if (!isContactValid) {
      setContactError('Please enter a valid 10-digit mobile contact number (digits only, no special characters).');
      return;
    }
    setContactError('');
    const prefilled = buildWhatsAppMessage(items, total, contactNumber);
    setChatDraftMessage(prefilled);
    setHasSentWhatsAppMsg(false);
    setIsWhatsAppPopupOpen(true);
  };

  // Send message inside the small WhatsApp window -> Relocate to Order Confirmed!
  const handleSendWhatsAppMessage = async () => {
    if (isCheckingOut || hasSentWhatsAppMsg) return;

    const snapshotItems = [...items];
    const snapshotTotal = total;
    const snapshotPhone = contactNumber.trim();
    setIsCheckingOut(true);
    setHasSentWhatsAppMsg(true);

    try {
      const { orderCode } = await createOrderInDb({
        customer: customerName || 'Customer',
        customerEmail: customerEmail || '',
        customerPhone: snapshotPhone,
        items: snapshotItems,
        specialInstructions,
        amount: snapshotTotal,
      });
      const finalCode = orderCode || `#CZ-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmedOrderCode(finalCode);

      const finalMsg =
        chatDraftMessage.trim() ||
        buildWhatsAppMessage(snapshotItems, snapshotTotal, snapshotPhone, finalCode);

      setConfirmedSnapshot({
        items: snapshotItems,
        total: snapshotTotal,
        contactNumber: snapshotPhone,
        whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER_CLEAN}?text=${encodeURIComponent(finalMsg)}`,
      });

      // Brief pause so user sees their sent message tick in the small WhatsApp window before relocating to Order Confirmed!
      await new Promise((resolve) => setTimeout(resolve, 950));

      setIsWhatsAppPopupOpen(false);
      setCheckoutStep('confirmed');
      onClearCart();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleFinish = () => {
    setCheckoutStep('bag');
    setConfirmedSnapshot(null);
    setSpecialInstructions('');
    setContactError('');
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
        <div className="w-screen max-w-md bg-surface sm:border-l border-outline-variant shadow-2xl flex flex-col justify-between relative">
          {/* Drawer Header */}
          <div className="px-4 sm:px-6 py-4 bg-surface-container border-b border-outline-variant/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">
                  {checkoutStep === 'whatsapp'
                    ? 'chat'
                    : checkoutStep === 'confirmed'
                    ? 'verified'
                    : 'shopping_bag'}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-on-surface font-headline">
                  {checkoutStep === 'whatsapp'
                    ? 'Bespoke Checkout'
                    : checkoutStep === 'confirmed'
                    ? 'Order Confirmed!'
                    : `Artisanal Bag (${items.reduce((s, i) => s + i.quantity, 0)})`}
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

            {/* 2-Step Checkout Progress Bar */}
            {(items.length > 0 || checkoutStep === 'confirmed') && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    checkoutStep === 'bag'
                      ? 'bg-primary text-on-primary border-primary shadow-xs'
                      : 'bg-primary/10 text-primary border-primary/20'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                    {checkoutStep === 'bag' ? '1' : '✓'}
                  </span>
                  <span className="truncate">1. Bespoke Checkout</span>
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    checkoutStep === 'whatsapp'
                      ? 'bg-[#25D366] text-white border-[#25D366] shadow-xs'
                      : checkoutStep === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-surface text-on-surface-variant border-outline-variant/50'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                    {checkoutStep === 'confirmed' ? '✓' : '2'}
                  </span>
                  <span className="truncate">2. WhatsApp Order</span>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
            {checkoutStep === 'confirmed' ? (
              <div className="py-6 text-center space-y-5 animate-fadeIn">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Sent to WhatsApp {WHATSAPP_NUMBER_DISPLAY}
                  </span>
                  <h3 className="text-2xl font-black text-on-surface font-headline pt-1">
                    Order Confirmed!
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed">
                    Your artisanal order <span className="font-bold text-on-surface">{confirmedOrderCode}</span> has been confirmed and scheduled in the patisserie production queue.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container text-xs text-left space-y-2.5 text-on-surface-variant border border-outline-variant/40">
                  <p className="font-bold text-on-surface uppercase tracking-wider text-[11px]">
                    Confirmed Items Summary:
                  </p>
                  <div className="space-y-2 divide-y divide-outline-variant/30">
                    {(confirmedSnapshot?.items || items).map((item) => (
                      <div key={item.id} className="pt-2 first:pt-0 flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-on-surface">{item.name}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            Quantity: <span className="font-bold text-on-surface">{item.quantity}</span>
                          </p>
                        </div>
                        <span className="font-bold text-primary tabular-nums">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-outline-variant/40 space-y-1">
                    <p>
                      Customer Contact:{' '}
                      <span className="font-semibold text-on-surface">
                        {confirmedSnapshot?.contactNumber || contactNumber}
                      </span>
                    </p>
                    <p>
                      WhatsApp Concierge:{' '}
                      <span className="font-semibold text-on-surface">{WHATSAPP_NUMBER_DISPLAY}</span>
                    </p>
                    <p>Estimated Delivery: Tomorrow by 2:00 PM</p>
                    <p className="font-bold text-primary text-sm pt-1">
                      Total Order Amount: ₹{(confirmedSnapshot?.total ?? total).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleFinish}
                  className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            ) : checkoutStep === 'whatsapp' ? (
              <div className="space-y-5 animate-fadeIn">
                {/* Step 2 Banner */}
                <div className="p-4 rounded-2xl bg-[#ebf9f2] border border-[#c5ebd8] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#128C7E]">
                      Step 2 of 2 • Bespoke Checkout
                    </span>
                    <span className="text-xs font-bold text-[#128C7E]">{WHATSAPP_NUMBER_DISPLAY}</span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface font-headline">
                    Enter Contact & Place Order via WhatsApp
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Add your mandatory contact number below, then click <strong>Place Order via WhatsApp</strong> to open the WhatsApp chat window and send your pre-typed order.
                  </p>
                </div>

                {/* Mandatory Contact Number Input */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                  <label className="flex items-center justify-between text-xs font-bold text-on-surface uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-primary">call</span>
                      Contact Number <span className="text-error">*</span>
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Mandatory
                    </span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                    value={contactNumber}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setContactNumber(sanitized);
                      if (contactError) setContactError('');
                    }}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 text-sm font-medium bg-surface border rounded-xl text-on-surface focus:outline-none focus:ring-2 transition-all ${
                      contactError
                        ? 'border-error focus:ring-error/30'
                        : isContactValid
                        ? 'border-emerald-500 focus:ring-emerald-500/20'
                        : 'border-outline-variant focus:ring-primary/30'
                    }`}
                  />
                  {contactError ? (
                    <p className="text-[11px] font-semibold text-error flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {contactError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant">
                      Enter a 10-digit mobile number (numbers only, no special characters).
                    </p>
                  )}
                </div>

                {/* Order Items Being Sent */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Selected Creations ({items.reduce((s, i) => s + i.quantity, 0)})
                  </h4>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/40"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover bg-surface-container shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-on-surface truncate">{item.name}</p>
                            <p className="text-[11px] font-semibold text-primary">
                              Quantity: {item.quantity}
                            </p>
                            {item.details && (
                              <p className="text-[10px] text-on-surface-variant truncate">
                                {item.details}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-on-surface tabular-nums shrink-0">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-Typed WhatsApp Message Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
                      Auto-Typed WhatsApp Message
                    </label>
                    <span className="text-[11px] font-semibold text-[#128C7E]">
                      To: {WHATSAPP_NUMBER_DISPLAY}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#efeae2] border border-outline-variant/50 shadow-inner">
                    <div className="bg-white rounded-xl p-3 shadow-xs text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {whatsappMessage}
                    </div>
                  </div>
                </div>
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
          {checkoutStep === 'bag' && items.length > 0 && (
            <div className="p-5 sm:p-6 bg-surface-container border-t border-outline-variant/40 space-y-4">
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
                type="button"
                onClick={handleProceedToBespokeCheckout}
                className="w-full py-3.5 px-4 bg-primary text-on-primary font-headline font-bold rounded-xl shadow-md hover:bg-primary/90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Bespoke Checkout</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}

          {checkoutStep === 'whatsapp' && items.length > 0 && (
            <div className="p-5 sm:p-6 bg-surface-container border-t border-outline-variant/40 space-y-3">
              <div className="flex justify-between items-center text-sm font-black text-on-surface">
                <span>Total Payable</span>
                <span className="text-primary tabular-nums text-base">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenWhatsAppWindow}
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-headline font-bold rounded-xl shadow-md active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                <span>Place Order via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckoutStep('bag')}
                className="w-full py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Back to Artisanal Bag</span>
              </button>
            </div>
          )}

          {/* Small Floating WhatsApp Chat Window Modal */}
          {isWhatsAppPopupOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center sm:items-end sm:justify-end p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-fadeIn">
              <div className="w-full max-w-[360px] rounded-2xl overflow-hidden shadow-2xl border border-[#128C7E]/30 bg-[#efeae2] flex flex-col">
                {/* WhatsApp Top Bar */}
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/30 shadow-xs shrink-0">
                      <img
                        src={LOGO_URL}
                        alt="CakeZone Logo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold leading-tight">CakeZone</p>
                        <span className="material-symbols-outlined text-[14px] text-[#25D366]">
                          verified
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100 leading-tight">
                        {WHATSAPP_NUMBER_DISPLAY} • online
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppPopupOpen(false)}
                    className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/90 cursor-pointer"
                    aria-label="Close WhatsApp window"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {/* WhatsApp Chat Body */}
                <div className="p-3.5 space-y-3 max-h-[290px] overflow-y-auto text-xs">
                  {/* Encryption Notice */}
                  <div className="bg-[#FFF5C4] text-[#54656F] text-[10px] text-center px-3 py-1.5 rounded-lg shadow-2xs">
                    Messages are end-to-end encrypted. Tap <strong>Send</strong> below to confirm your order.
                  </div>

                  {/* Greeting from Patisserie */}
                  <div className="bg-white text-slate-800 p-2.5 rounded-xl rounded-tl-none shadow-xs max-w-[88%] space-y-1">
                    <p className="font-bold text-[11px] text-[#075E54]">CakeZone</p>
                    <p className="leading-relaxed text-[11px]">
                      Welcome! Your bespoke cake order & contact number ({contactNumber}) are pre-typed below. Simply press <strong>Send</strong> to confirm! 🎂
                    </p>
                  </div>

                  {/* Sent Message Bubble when user clicks Send */}
                  {hasSentWhatsAppMsg && (
                    <>
                      <div className="bg-[#dcf8c6] text-slate-900 p-2.5 rounded-xl rounded-tr-none shadow-xs ml-auto max-w-[90%] whitespace-pre-wrap text-[11px] leading-relaxed">
                        {chatDraftMessage}
                        <div className="text-[9px] text-slate-500 text-right mt-1 flex items-center justify-end gap-1">
                          <span>Just now</span>
                          <span className="text-[#34B7F1] font-bold">✓✓</span>
                        </div>
                      </div>
                      <div className="bg-white text-slate-800 p-2.5 rounded-xl rounded-tl-none shadow-xs max-w-[88%] space-y-1">
                        <p className="font-bold text-[11px] text-[#075E54]">CakeZone</p>
                        <p className="leading-relaxed text-[11px] font-medium text-emerald-700">
                          Order received! Redirecting you to Order Confirmed...
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Auto-Typed Chat Input Bar */}
                <div className="p-2.5 bg-[#f0f2f5] border-t border-slate-300/80 space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 px-3 py-2 shadow-2xs">
                      <p className="text-[10px] font-bold text-[#128C7E] uppercase tracking-wider mb-1">
                        Auto-Typed Order Message
                      </p>
                      <textarea
                        rows={4}
                        value={chatDraftMessage}
                        onChange={(e) => setChatDraftMessage(e.target.value)}
                        disabled={hasSentWhatsAppMsg}
                        className="w-full text-[11px] text-slate-800 bg-transparent focus:outline-none resize-none leading-snug font-sans"
                      />
                    </div>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER_CLEAN}?text=${encodeURIComponent(
                        chatDraftMessage.trim() || whatsappMessage
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        handleSendWhatsAppMessage();
                      }}
                      title="Send WhatsApp Message to +91 9770566246"
                      className={`w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 cursor-pointer ${
                        isCheckingOut || hasSentWhatsAppMsg ? 'opacity-60 pointer-events-none' : ''
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">send</span>
                    </a>
                  </div>

                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER_CLEAN}?text=${encodeURIComponent(
                      chatDraftMessage.trim() || whatsappMessage
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleSendWhatsAppMessage();
                    }}
                    className={`w-full py-2 rounded-xl bg-[#075E54] hover:bg-[#064e46] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                      isCheckingOut || hasSentWhatsAppMsg ? 'opacity-60 pointer-events-none' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>
                      {hasSentWhatsAppMsg
                        ? 'Message Sent! Opening Order Confirmed...'
                        : 'Send Message & Confirm Order'}
                    </span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



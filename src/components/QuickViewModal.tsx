import React, { useState } from 'react';
import { CakeProduct } from '../types';

interface QuickViewModalProps {
  cake: CakeProduct | null;
  onClose: () => void;
  onAddToCart: (cake: CakeProduct, quantity: number) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  cake,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);

  if (!cake) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col md:flex-row relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-surface/80 backdrop-blur-sm text-on-surface hover:bg-surface-variant flex items-center justify-center cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        {/* Image side */}
        <div className="md:w-1/2 aspect-square relative bg-surface-container">
          <img
            src={cake.image}
            alt={cake.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-1">
            {cake.tags.map((tag) => (
              <span
                key={tag}
                className="bg-primary/90 text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm shadow-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Details side */}
        <div className="p-6 md:w-1/2 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-primary uppercase">
              Artisanal Creation
            </span>
            <h3 className="text-2xl font-black font-headline text-on-surface mt-1">
              {cake.name}
            </h3>
            <div className="text-xl font-bold text-primary mt-2 tabular-nums">
              ${cake.price}.00
            </div>
            <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
              {cake.description}
            </p>

            <div className="mt-4 pt-4 border-t border-outline-variant/40 space-y-2 text-xs">
              <div>
                <span className="font-bold text-on-surface">Artisanal Ingredients: </span>
                <span className="text-on-surface-variant">{cake.ingredients}</span>
              </div>
              <div>
                <span className="font-bold text-on-surface">Portion Size: </span>
                <span className="text-on-surface-variant">{cake.servings}</span>
              </div>
              <div className="flex items-center gap-3 text-emerald-700 font-medium pt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check</span> Freshly Baked
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check</span> Chilled Courier
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-on-surface">Quantity:</span>
              <div className="flex items-center border border-outline-variant rounded-lg bg-surface">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-2.5 py-1 text-on-surface hover:bg-surface-container text-xs font-bold rounded-l cursor-pointer"
                >
                  -
                </button>
                <span className="px-3 py-1 text-xs font-bold text-on-surface tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-2.5 py-1 text-on-surface hover:bg-surface-container text-xs font-bold rounded-r cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                onAddToCart(cake, quantity);
                onClose();
              }}
              className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">shopping_bag</span>
              <span>Add to Bag • ${(cake.price * quantity).toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

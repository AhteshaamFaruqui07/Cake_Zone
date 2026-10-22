import React, { useState } from 'react';
import { HERO_CAKE_URL } from '../data/initialData';

interface CakeConfiguratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomCake: (customCake: {
    name: string;
    price: number;
    image: string;
    details: string;
  }) => void;
}

export const CakeConfiguratorModal: React.FC<CakeConfiguratorModalProps> = ({
  isOpen,
  onClose,
  onAddCustomCake,
}) => {
  const [tiers, setTiers] = useState<number>(3);
  const [spongeFlavor, setSpongeFlavor] = useState('Valrhona Chocolate Fudge');
  const [filling, setFilling] = useState('Fleur de Sel Caramel & Toasted Pecans');
  const [finish, setFinish] = useState('Smooth Velvet Buttercream with Ganache Drips');
  const [accents, setAccents] = useState<string[]>([
    '24k Edible Gold Leaf Flakes',
    'Cascading Pastel Sugar Peonies',
  ]);
  const [inscription, setInscription] = useState('Happy Anniversary Eleanor & Marcus');
  const [eventDate, setEventDate] = useState('2026-11-15');

  if (!isOpen) return null;

  const toggleAccent = (accent: string) => {
    if (accents.includes(accent)) {
      setAccents(accents.filter((a) => a !== accent));
    } else {
      setAccents([...accents, accent]);
    }
  };

  // Pricing calculation
  const baseTierPrice = tiers === 1 ? 95 : tiers === 2 ? 185 : tiers === 3 ? 320 : 480;
  const accentPrice = accents.length * 25;
  const totalPrice = baseTierPrice + accentPrice;

  const handleSaveAndAdd = () => {
    const details = `${tiers} Tiers · ${spongeFlavor} · ${filling} · ${accents.join(', ')} · "${inscription}"`;
    onAddCustomCake({
      name: `Bespoke ${tiers}-Tier Celebration Cake`,
      price: totalPrice,
      image: HERO_CAKE_URL,
      details,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface max-w-3xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-primary-container text-on-primary-container flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">
              Bespoke Patisserie Atelier
            </span>
            <h2 className="text-xl font-bold font-headline">Design Your Custom Cake</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-on-primary-container hover:bg-black/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Configurator Form */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tiers Selection */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              1. Choose Cake Architecture (Tiers &amp; Guest Count)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { count: 1, label: '1 Tier', guests: '12 - 16 guests', price: '$95' },
                { count: 2, label: '2 Tiers', guests: '25 - 35 guests', price: '$185' },
                { count: 3, label: '3 Tiers', guests: '50 - 75 guests', price: '$320' },
                { count: 4, label: '4 Tiers', guests: '100+ guests', price: '$480' },
              ].map((t) => (
                <button
                  key={t.count}
                  type="button"
                  onClick={() => setTiers(t.count)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    tiers === t.count
                      ? 'border-primary bg-secondary-container/40 text-on-surface ring-1 ring-primary'
                      : 'border-outline-variant hover:bg-surface-container'
                  }`}
                >
                  <p className="font-bold text-sm text-primary">{t.label}</p>
                  <p className="text-[11px] text-on-surface-variant">{t.guests}</p>
                  <p className="text-xs font-semibold text-on-surface mt-1">{t.price}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sponge Flavor */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              2. Artisanal Sponge Flavor
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'Valrhona Chocolate Fudge',
                'Madagascar Bourbon Vanilla Bean',
                'Kyoto Ceremonial Uji Matcha',
                'Red Velvet Cocoa & French Butter',
                'French Almond Frangipane',
              ].map((flavor) => (
                <button
                  key={flavor}
                  type="button"
                  onClick={() => setSpongeFlavor(flavor)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    spongeFlavor === flavor
                      ? 'border-primary bg-primary-container/10 font-bold text-primary ring-1 ring-primary'
                      : 'border-outline-variant hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {flavor}
                </button>
              ))}
            </div>
          </div>

          {/* Fillings */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              3. Handcrafted Core Filling
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'Fleur de Sel Caramel & Toasted Pecans',
                '70% Guanaja Dark Chocolate Truffle',
                'Wild Oregon Blackberry & Raspberry Coulis',
                'Belgian White Chocolate Opalys Mousse',
                'Crispy Hazelnut Praline Feuilletine',
              ].map((fill) => (
                <button
                  key={fill}
                  type="button"
                  onClick={() => setFilling(fill)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    filling === fill
                      ? 'border-primary bg-primary-container/10 font-bold text-primary ring-1 ring-primary'
                      : 'border-outline-variant hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {fill}
                </button>
              ))}
            </div>
          </div>

          {/* Exterior Finish */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              4. Exterior Finishing
            </label>
            <select
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              className="w-full p-2.5 text-xs bg-surface border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Smooth Velvet Buttercream with Ganache Drips">
                Smooth Velvet Buttercream with Dark Ganache Drips
              </option>
              <option value="Mirror Smooth Valrhona Dark Ganache Glaze">
                Mirror Smooth Valrhona Dark Ganache Glaze
              </option>
              <option value="Rustic Semi-Naked with 24k Gold Edging">
                Rustic Semi-Naked with 24k Gold Edging
              </option>
              <option value="Opulent Marble Royal Fondant Sculpture">
                Opulent Marble Royal Fondant Sculpture
              </option>
            </select>
          </div>

          {/* Accents (Multiselect) */}
          <div>
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-2">
              5. Bespoke Accents (+$25 ea)
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                '24k Edible Gold Leaf Flakes',
                'Cascading Pastel Sugar Peonies',
                'Handcrafted Macaron Crown',
                'Organic Forest Berries & Figs',
                'Polished Florentine Silver Leaf',
              ].map((accent) => {
                const isSelected = accents.includes(accent);
                return (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => toggleAccent(accent)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary text-on-primary shadow-xs'
                        : 'border-outline-variant bg-surface hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {accent}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inscription & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Personalized Gold Plaque Inscription
              </label>
              <input
                type="text"
                value={inscription}
                onChange={(e) => setInscription(e.target.value)}
                placeholder="e.g. Happy 50th Birthday!"
                className="w-full p-2.5 text-xs bg-surface border border-outline-variant rounded-xl text-on-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                Event Delivery Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface border border-outline-variant rounded-xl text-on-surface"
              />
            </div>
          </div>
        </div>

        {/* Footer with Price and CTA */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant flex items-center justify-between">
          <div>
            <span className="text-[11px] text-on-surface-variant font-medium">Estimated Total</span>
            <div className="text-xl font-black text-primary font-headline tabular-nums">
              ${totalPrice.toFixed(2)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-outline text-xs font-bold text-on-surface hover:bg-surface-variant cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndAdd}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
            >
              Add Bespoke Creation to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

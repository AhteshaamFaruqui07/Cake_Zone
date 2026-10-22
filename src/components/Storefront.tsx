import React, { useState, useEffect } from 'react';
import { CakeProduct } from '../types';
import {
  HERO_CAKE_URL,
  INGREDIENTS_IMAGE_URL,
  CHEFS_IMAGE_URL,
  SIGNATURE_CAKES,
  REVIEWS,
} from '../data/initialData';

interface StorefrontProps {
  onQuickView: (cake: CakeProduct) => void;
  onOrderNow: (cake: CakeProduct) => void;
  onOpenConfigurator: () => void;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
  isLoggedIn?: boolean;
  onRequireAuth?: (actionName?: string) => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  onQuickView,
  onOrderNow,
  onOpenConfigurator,
  userName,
  onUpdateUserName,
  isLoggedIn,
  onRequireAuth,
}) => {
  const [localName, setLocalName] = useState(userName || '');

  useEffect(() => {
    if (userName) {
      setLocalName(userName);
    }
  }, [userName]);

  const displayName = userName?.trim() || localName.trim() || 'Guest';

  const handleProtectedAction = (actionCallback: () => void, actionName: string) => {
    if (!isLoggedIn) {
      if (onRequireAuth) {
        onRequireAuth(actionName);
      }
      return;
    }
    actionCallback();
  };

  return (
    <div className="w-full">
      {/* Guest Mode Notice Banner */}
      {!isLoggedIn && (
        <div className="bg-primary/10 border-b border-primary/20 px-6 py-2.5 text-center text-xs text-primary font-medium flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm">lock</span>
          <span>Sign in required to navigate, customize cakes, or place orders.</span>
          <button
            type="button"
            onClick={() => onRequireAuth?.('sign in')}
            className="font-bold underline cursor-pointer hover:opacity-80"
          >
            Sign In Now
          </button>
        </div>
      )}

      {/* Hero Section with Full Background Video */}
      <section
        className="relative overflow-hidden min-h-[580px] md:min-h-[660px] flex items-center pt-12 pb-24 md:py-32"
        id="home"
      >
        {/* Full Hero Video Background with Enhanced Color Vibrancy */}
        <video
          src="/assets/aistudio/kling_20261020_VIDEO_Use_the_up_5466_0_97ab3ed5.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 filter saturate-125 contrast-105 brightness-102"
        >
          Your browser does not support the video tag.
        </video>

        {/* Lightened Semi-Transparent Overlay Scrim to let the vibrant video colors shine through */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/65 via-background/40 to-transparent md:from-background/60 md:via-background/30 md:to-transparent z-10" />

        {/* Hero Content Canvas */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 w-full">
          <div className="flex flex-col items-start gap-6 max-w-2xl">
            {/* Welcome, Guest / User Heading */}
            <span className="text-lg md:text-xl font-bold font-headline text-primary tracking-wide inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary">waving_hand</span>
              <span>Welcome,</span>
              <span className="text-on-surface font-black select-none">{displayName}</span>
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-headline tracking-tight text-on-surface leading-tight text-balance">
              Crafted with Love, Baked to Perfection
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-xl font-medium">
              Experience the pinnacle of patisserie craftsmanship. Each creation is meticulously
              handcrafted using rare ingredients, French butter, and uncompromising passion.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleProtectedAction(() => {
                    document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
                  }, 'browse collections');
                }}
                className="px-8 py-4 rounded-xl bg-primary text-on-primary font-label font-bold shadow-lg hover:bg-primary/90 transition-all transform active:scale-95 cursor-pointer"
              >
                Explore Collections
              </button>
              <button
                type="button"
                onClick={() => {
                  handleProtectedAction(onOpenConfigurator, 'design custom cakes');
                }}
                className="px-8 py-4 rounded-xl bg-surface/90 backdrop-blur-md text-primary font-label font-bold border border-primary/30 hover:bg-surface transition-all transform active:scale-95 shadow-md cursor-pointer"
              >
                Design Custom Cake
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Collections Section */}
      <section className="py-24 bg-surface-container-low" id="collections">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-primary font-bold text-sm tracking-widest uppercase">
              SIGNATURE CREATIONS
            </span>
            <h2 className="text-3xl md:text-4xl font-black font-headline mt-2 text-on-surface">
              Indulge in Extraordinary Flavors
            </h2>
            <p className="text-on-surface-variant mt-4">
              Discover our most celebrated masterpiece cakes, ready to elevate your most cherished
              celebrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {SIGNATURE_CAKES.map((cake) => (
              <div
                key={cake.id}
                className="bg-surface rounded-xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group border border-outline-variant/30"
              >
                <div className="relative overflow-hidden aspect-square bg-surface-container">
                  <img
                    src={cake.image}
                    alt={cake.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-4 right-4 bg-surface/90 backdrop-blur-sm text-primary font-bold px-3 py-1 rounded-full text-sm shadow-xs">
                    ${cake.price}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                  <div>
                    <h3 className="font-headline font-bold text-xl text-on-surface">
                      {cake.name}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                      {cake.description}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleProtectedAction(() => onQuickView(cake), `view ${cake.name}`);
                      }}
                      className="flex-1 py-2.5 rounded-lg border border-outline text-on-surface text-sm font-bold hover:bg-surface-variant transition-colors active:scale-95 cursor-pointer"
                    >
                      Quick View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleProtectedAction(() => onOrderNow(cake), `order ${cake.name}`);
                      }}
                      className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-colors shadow-xs active:scale-95 cursor-pointer"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Craft / Story Section */}
      <section className="py-24 overflow-hidden" id="about">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {/* Feature 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                UNCOMPROMISING QUALITY
              </span>
              <h2 className="text-3xl md:text-4xl font-black font-headline text-on-surface">
                Rare &amp; Sustainably Sourced Ingredients
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-base">
                We travel the globe to source the finest ingredients—from organic Bourbon vanilla
                pods in Madagascar to single-origin cacao from Ecuador. Every element is selected with
                strict adherence to flavor integrity and ethical harvesting.
              </p>
              <div className="pt-2 flex items-center gap-6 text-sm text-on-surface-variant font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">eco</span>
                  <span>100% Organic Flours</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">verified</span>
                  <span>Pure French Butter</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={INGREDIENTS_IMAGE_URL}
                alt="A rustic wooden kitchen table neatly arranged with premium baking ingredients"
                className="rounded-2xl shadow-xl object-cover w-full h-[350px] bg-surface-container"
                loading="lazy"
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <img
                src={CHEFS_IMAGE_URL}
                alt="An expert master pastry chef meticulously piping intricate buttercream flowers"
                className="rounded-2xl shadow-xl object-cover w-full h-[350px] bg-surface-container"
                loading="lazy"
              />
            </div>
            <div className="order-1 md:order-2 space-y-4">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                MASTER ARTISANS
              </span>
              <h2 className="text-3xl md:text-4xl font-black font-headline text-on-surface">
                Sculpted by World-Class Pastry Chefs
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-base">
                Our brigade of master bakers and sugar artists combine classical French patisserie
                techniques with avant-garde modern design, turning edible treats into breathtaking
                contemporary sculptures.
              </p>
              <div className="pt-2 flex items-center gap-6 text-sm text-on-surface-variant font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">award_star</span>
                  <span>Parisian Culinary Guild</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">brush</span>
                  <span>Bespoke Sugar Sculpting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Cake Builder CTA Banner */}
      <section
        className="py-20 bg-primary-container text-on-primary-container relative overflow-hidden"
        id="custom-cakes"
      >
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <span className="px-4 py-1.5 rounded-full bg-surface/20 backdrop-blur-sm text-on-primary font-label text-sm font-bold tracking-wide">
            BESPOKE EXPERIENCE
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-headline mt-6 text-on-primary">
            Design Your Dream Custom Cake
          </h2>
          <p className="text-on-primary-container/90 mt-4 max-w-2xl mx-auto text-lg leading-relaxed">
            Have a unique vision? Use our interactive configurator to select tiers, custom fillings,
            color palettes, and bespoke sugar artistry for your special event.
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={() => {
                handleProtectedAction(onOpenConfigurator, 'launch the cake configurator');
              }}
              className="inline-block px-8 py-4 rounded-xl bg-surface text-primary font-label font-bold shadow-xl hover:bg-surface-bright transition-all transform active:scale-95 cursor-pointer"
            >
              Launch Cake Configurator
            </button>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="py-24 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-primary font-bold text-sm tracking-widest uppercase">
              TESTIMONIALS
            </span>
            <h2 className="text-3xl md:text-4xl font-black font-headline mt-2 text-on-surface">
              Loved by Connoisseurs Worldwide
            </h2>
            <p className="text-on-surface-variant mt-4">
              Hear what our esteemed clients have to say about their unforgettable CakeZone experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {REVIEWS.map((review) => (
              <div
                key={review.id}
                className="bg-surface p-8 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex text-tertiary gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-amber-500"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-on-surface-variant italic leading-relaxed text-sm">
                    {review.quote}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-4 pt-4 border-t border-outline-variant">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container">
                    {review.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface text-sm">{review.author}</h4>
                    <p className="text-xs text-on-surface-variant">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="bg-surface-container-low dark:bg-surface-container w-full border-t border-outline-variant"
        id="contact"
      >
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-8 max-w-7xl mx-auto gap-6">
          <div className="text-lg font-bold text-primary font-headline">CakeZone</div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-label">
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                alert('CakeZone Privacy Policy: We safeguard your personal data with high-grade encryption.');
              }}
              href="#privacy"
            >
              Privacy Policy
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                alert('Terms of Service: Custom artisanal cake orders require 48 hours notice for bespoke sculpting.');
              }}
              href="#terms"
            >
              Terms of Service
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                alert('FAQ: We deliver refrigerated in temperature-controlled luxury packaging across the metropolitan area.');
              }}
              href="#faq"
            >
              FAQ
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                alert('Shipping Info: Same-day delivery for signature creations ordered before 11 AM.');
              }}
              href="#shipping"
            >
              Shipping Info
            </a>
          </div>
          <div className="text-sm text-on-surface-variant">
            © 2023 CakeZone. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

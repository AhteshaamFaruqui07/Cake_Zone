import React, { useEffect, useState } from 'react';

export interface FlyEventDetail {
  image: string;
  startRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  cakeName?: string;
}

interface FlyingItemInstance {
  id: string;
  image: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
  initialSize: number;
  startTime: number;
  duration: number;
}

// Gentle Web Audio API pop chime when item lands in the cart
const playCartLandingSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.17);
  } catch {
    // Audio autoplay restrictions or headless environments
  }
};

export const triggerFlyToCart = (
  image: string,
  elementOrRect: HTMLElement | DOMRect | { left: number; top: number; width: number; height: number },
  cakeName?: string
) => {
  if (typeof window === 'undefined') return;

  let rect: { left: number; top: number; width: number; height: number };
  if (elementOrRect instanceof HTMLElement) {
    const domRect = elementOrRect.getBoundingClientRect();
    rect = {
      left: domRect.left,
      top: domRect.top,
      width: domRect.width,
      height: domRect.height,
    };
  } else {
    rect = {
      left: elementOrRect.left,
      top: elementOrRect.top,
      width: elementOrRect.width,
      height: elementOrRect.height,
    };
  }

  window.dispatchEvent(
    new CustomEvent<FlyEventDetail>('cakezone:fly-to-cart', {
      detail: { image, startRect: rect, cakeName },
    })
  );
};

export const FlyToCartOverlay: React.FC = () => {
  const [flyingItems, setFlyingItems] = useState<FlyingItemInstance[]>([]);
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number; scale: number; rotate: number; opacity: number } }>({});
  const [cartBurst, setCartBurst] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const handleFlyEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FlyEventDetail>;
      const { image, startRect } = customEvent.detail;
      if (!startRect) return;

      // Locate target cart button
      const cartButton = document.getElementById('navbar-cart-button');
      let endX = window.innerWidth - 60;
      let endY = 32;

      if (cartButton) {
        const cartRect = cartButton.getBoundingClientRect();
        endX = cartRect.left + cartRect.width / 2;
        endY = cartRect.top + cartRect.height / 2;
      }

      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;
      const initialSize = Math.max(56, Math.min(startRect.width, startRect.height, 100));

      // Upward parabolic control point for authentic flight trajectory
      const arcHeight = Math.max(120, Math.abs(endX - startX) * 0.28);
      const midX = startX + (endX - startX) * 0.45;
      const midY = Math.min(startY, endY) - arcHeight;

      const id = `fly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newItem: FlyingItemInstance = {
        id,
        image,
        startX,
        startY,
        endX,
        endY,
        midX,
        midY,
        initialSize,
        startTime: performance.now(),
        duration: 750, // smooth 750ms flight
      };

      setFlyingItems((prev) => [...prev, newItem]);
    };

    window.addEventListener('cakezone:fly-to-cart', handleFlyEvent);
    return () => {
      window.removeEventListener('cakezone:fly-to-cart', handleFlyEvent);
    };
  }, []);

  // Animation frame loop for all active flying elements
  useEffect(() => {
    if (flyingItems.length === 0) return;

    let animId: number;

    const tick = () => {
      const now = performance.now();
      const updatedPositions: { [id: string]: { x: number; y: number; scale: number; rotate: number; opacity: number } } = {};
      const expiredIds: string[] = [];

      flyingItems.forEach((item) => {
        const elapsed = now - item.startTime;
        const progress = Math.min(1, elapsed / item.duration);

        // Smooth cubic easing
        // Start with pop, arc across screen, plunge into cart
        const t = progress;
        const invT = 1 - t;

        // Quadratic Bezier Formula: P(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
        const x = invT * invT * item.startX + 2 * invT * t * item.midX + t * t * item.endX;
        const y = invT * invT * item.startY + 2 * invT * t * item.midY + t * t * item.endY;

        // Scale down from 1.15 to 0.22 as it approaches cart
        const scale = 1.15 - 0.93 * Math.pow(t, 1.2);
        // Playful spin/tilt during flight
        const rotate = -12 + 38 * t;
        // Fade out right as it enters the bag
        const opacity = t > 0.88 ? Math.max(0, (1 - t) / 0.12) : 1;

        updatedPositions[item.id] = { x, y, scale, rotate, opacity };

        if (progress >= 1) {
          expiredIds.push(item.id);
        }
      });

      setPositions(updatedPositions);

      // Handle items that landed
      if (expiredIds.length > 0) {
        expiredIds.forEach((id) => {
          const landedItem = flyingItems.find((it) => it.id === id);
          if (landedItem) {
            // Trigger cart bounce & ripple burst
            window.dispatchEvent(new CustomEvent('cakezone:cart-bounce'));
            playCartLandingSound();

            setCartBurst({ x: landedItem.endX, y: landedItem.endY, active: true });
            setTimeout(() => {
              setCartBurst((prev) => ({ ...prev, active: false }));
            }, 600);
          }
        });

        setFlyingItems((prev) => prev.filter((it) => !expiredIds.includes(it.id)));
      }

      if (flyingItems.length > 0) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [flyingItems]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden" aria-hidden="true">
      {flyingItems.map((item) => {
        const pos = positions[item.id];
        if (!pos) return null;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${item.initialSize}px`,
              height: `${item.initialSize}px`,
              transform: `translate3d(${pos.x - item.initialSize / 2}px, ${pos.y - item.initialSize / 2}px, 0) scale(${pos.scale}) rotate(${pos.rotate}deg)`,
              opacity: pos.opacity,
              willChange: 'transform, opacity',
            }}
            className="flex items-center justify-center pointer-events-none"
          >
            {/* Glowing Golden-Pink Halo around flying product */}
            <div className="relative w-full h-full rounded-2xl sm:rounded-3xl p-[3px] bg-gradient-to-tr from-[#ff2d55] via-amber-400 to-[#7c3aed] shadow-[0_12px_36px_rgba(255,45,85,0.65)] overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="w-full h-full rounded-xl sm:rounded-2xl object-cover bg-white"
              />
              {/* Specular Shine Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Trailing sparkle particles */}
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#ff2d55] animate-ping opacity-60" />
          </div>
        );
      })}

      {/* Cart Splash / Sparkle Ripple when item lands */}
      {cartBurst.active && (
        <div
          style={{
            position: 'absolute',
            left: `${cartBurst.x}px`,
            top: `${cartBurst.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="pointer-events-none"
        >
          <div className="w-12 h-12 rounded-full border-2 border-[#ff2d55] animate-ping opacity-75" />
          <div className="absolute inset-0 w-8 h-8 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full bg-amber-400/40 animate-pulse" />
        </div>
      )}
    </div>
  );
};

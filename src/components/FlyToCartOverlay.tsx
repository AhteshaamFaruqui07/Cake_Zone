import React, { useEffect, useRef, useState } from 'react';

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

interface RenderPosition {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
}

const playCartLandingSound = () => {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.11);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio restrictions in muted/headless browsers
  }
};

export const triggerFlyToCart = (
  image: string,
  elementOrRect:
    | HTMLElement
    | DOMRect
    | { left: number; top: number; width: number; height: number },
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

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const FlyToCartOverlay: React.FC = () => {
  const [flyingItems, setFlyingItems] = useState<FlyingItemInstance[]>([]);
  const [positions, setPositions] = useState<Record<string, RenderPosition>>({});
  const [cartBurst, setCartBurst] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const flyingItemsRef = useRef<FlyingItemInstance[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const burstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const startLoopIfNeeded = () => {
      if (rafIdRef.current !== null) return;

      const tick = () => {
        const now = performance.now();
        const current = flyingItemsRef.current;

        if (current.length === 0) {
          rafIdRef.current = null;
          setPositions({});
          return;
        }

        const nextPositions: Record<string, RenderPosition> = {};
        const landedItems: FlyingItemInstance[] = [];
        const stillFlying: FlyingItemInstance[] = [];

        for (const item of current) {
          const elapsed = now - item.startTime;
          const rawProgress = Math.min(1, elapsed / item.duration);

          if (rawProgress >= 1) {
            landedItems.push(item);
            continue;
          }

          stillFlying.push(item);

          const t = easeInOutCubic(rawProgress);
          const invT = 1 - t;

          // Parabolic quadratic Bezier trajectory from card to navbar bag
          const x = invT * invT * item.startX + 2 * invT * t * item.midX + t * t * item.endX;
          const y = invT * invT * item.startY + 2 * invT * t * item.midY + t * t * item.endY;

          // Quick initial pop followed by smooth shrink into bag
          const popScale =
            rawProgress < 0.16
              ? 1 + 0.16 * (rawProgress / 0.16)
              : 1.16 - 0.92 * Math.pow((rawProgress - 0.16) / 0.84, 1.15);

          const rotate = -8 + 26 * rawProgress;
          const opacity = rawProgress > 0.86 ? Math.max(0, (1 - rawProgress) / 0.14) : 1;

          nextPositions[item.id] = { x, y, scale: popScale, rotate, opacity };
        }

        if (landedItems.length > 0) {
          flyingItemsRef.current = stillFlying;
          setFlyingItems(stillFlying);

          const lastLanded = landedItems[landedItems.length - 1];
          window.dispatchEvent(new CustomEvent('cakezone:cart-bounce'));
          playCartLandingSound();

          setCartBurst({ x: lastLanded.endX, y: lastLanded.endY, active: true });
          if (burstTimerRef.current) {
            window.clearTimeout(burstTimerRef.current);
          }
          burstTimerRef.current = window.setTimeout(() => {
            setCartBurst((prev) => ({ ...prev, active: false }));
          }, 550);
        }

        setPositions(nextPositions);

        if (flyingItemsRef.current.length > 0) {
          rafIdRef.current = requestAnimationFrame(tick);
        } else {
          rafIdRef.current = null;
        }
      };

      rafIdRef.current = requestAnimationFrame(tick);
    };

    const handleFlyEvent = (e: Event) => {
      const customEvent = e as CustomEvent<FlyEventDetail>;
      const { image, startRect } = customEvent.detail;
      if (!startRect) return;

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        window.dispatchEvent(new CustomEvent('cakezone:cart-bounce'));
        return;
      }

      const cartButton = document.getElementById('navbar-cart-button');
      let endX = window.innerWidth - 64;
      let endY = 36;

      if (cartButton) {
        const cartRect = cartButton.getBoundingClientRect();
        endX = cartRect.left + cartRect.width / 2;
        endY = cartRect.top + cartRect.height / 2;
      }

      const startX = startRect.left + startRect.width / 2;
      const startY = startRect.top + startRect.height / 2;
      const initialSize = Math.max(58, Math.min(Math.max(startRect.width, startRect.height) * 0.34, 76));

      // Balanced parabolic curve that lifts out of the card and glides smoothly into the top-right bag
      const horizontalDelta = endX - startX;
      const verticalDelta = startY - endY;
      const midX = startX + horizontalDelta * 0.28;
      const midY =
        verticalDelta > 40
          ? Math.max(endY + 34, startY - Math.max(70, verticalDelta * 0.55))
          : Math.max(52, Math.min(startY, endY) - 24);

      const id = `fly-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
        duration: 720,
      };

      const nextList = [...flyingItemsRef.current, newItem];
      flyingItemsRef.current = nextList;
      setFlyingItems(nextList);
      startLoopIfNeeded();
    };

    window.addEventListener('cakezone:fly-to-cart', handleFlyEvent);
    return () => {
      window.removeEventListener('cakezone:fly-to-cart', handleFlyEvent);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (burstTimerRef.current) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden"
      aria-hidden="true"
    >
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
            <div className="relative w-full h-full rounded-2xl p-[2.5px] bg-gradient-to-br from-white via-[#CFBCFF] to-[#6750A4] shadow-[0_18px_40px_-8px_rgba(79,55,138,0.45)] overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="w-full h-full rounded-[13px] object-cover bg-white"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>
        );
      })}

      {cartBurst.active && (
        <div
          style={{
            position: 'absolute',
            left: `${cartBurst.x}px`,
            top: `${cartBurst.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="pointer-events-none flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full border-2 border-[#6750a4] animate-ping opacity-75" />
          <span className="absolute -top-5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-sm">
            +1
          </span>
        </div>
      )}
    </div>
  );
};

import { useEffect, useRef, useCallback } from 'react';

interface UseShakeOptions {
  threshold?: number;
  onShake: () => void;
}

/**
 * Interface para DeviceMotionEvent com API de permissão do iOS 13+.
 * A API requestPermission não faz parte do spec W3C e existe apenas em iOS Safari.
 * Por isso não está no tipo DOM padrão — necessário extends manual.
 */
interface DeviceMotionEventIOS extends DeviceMotionEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}
interface DeviceMotionEventIOSConstructor extends EventTarget {
  new (type: string, eventInitDict?: DeviceMotionEventInit): DeviceMotionEventIOS;
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

/**
 * Detecta shake do celular via DeviceMotionEvent e chama `onShake`.
 * Threshold padrão: 18 m/s² (aceleração total).
 */
export function useShakeDetection({ threshold = 18, onShake }: UseShakeOptions) {
  const lastShake = useRef<number>(0);

  useEffect(() => {
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const total = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);
      const now = Date.now();
      if (total > threshold && now - lastShake.current > 1200) {
        lastShake.current = now;
        onShake();
      }
    };

    // Solicitar permissão em iOS 13+
    const requestAndAttach = async () => {
      const DeviceMotionEventIOS = DeviceMotionEvent as unknown as DeviceMotionEventIOSConstructor;
      if (typeof DeviceMotionEventIOS.requestPermission === 'function') {
        try {
          const perm = await DeviceMotionEventIOS.requestPermission();
          if (perm !== 'granted') return;
        } catch {
          return;
        }
      }
      window.addEventListener('devicemotion', handleMotion);
    };

    requestAndAttach();
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [threshold, onShake]);
}

/**
 * Adiciona detecção de pinch (zoom) em um elemento via pointer events.
 * Retorna um ref para aplicar ao elemento alvo.
 */
export function usePinchDetection(onPinch: () => void) {
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialDist = useRef<number | null>(null);
  const triggered = useRef(false);

  const getDist = () => {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return Math.hypot(b.x - a.x, b.y - a.y);
  };

  const onPointerDown = useCallback((e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      initialDist.current = getDist();
      triggered.current = false;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2 && initialDist.current !== null && !triggered.current) {
        const current = getDist();
        if (current !== null && Math.abs(current - initialDist.current) > 40) {
          triggered.current = true;
          onPinch();
        }
      }
    },
    [onPinch],
  );

  const onPointerUp = useCallback((e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) initialDist.current = null;
  }, []);

  const attachRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
    },
    [onPointerDown, onPointerMove, onPointerUp],
  );

  return attachRef;
}

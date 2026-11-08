'use client';

import { useEffect, useRef, useState } from 'react';

/** Tweens toward `target` (ease-out, ~450 ms). Snaps immediately when reduced motion is on. */
export function useAnimatedNumber(target: number, reduced = false, duration = 450): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const valueRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      valueRef.current = target;
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    fromRef.current = valueRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const v = fromRef.current + (target - fromRef.current) * e;
      valueRef.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, duration]);

  return value;
}

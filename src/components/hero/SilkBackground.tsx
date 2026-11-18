'use client';

import { useEffect, useRef } from 'react';
import { browserEnvironment, mountSilk } from './silkController';

export default function SilkBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const hero = element?.closest<HTMLElement>('.hero-v2');
    if (
      !element ||
      !hero ||
      typeof window.matchMedia !== 'function' ||
      typeof ResizeObserver === 'undefined' ||
      typeof IntersectionObserver === 'undefined'
    )
      return;
    return mountSilk(hero, element, browserEnvironment());
  }, []);
  return (
    <>
      <canvas ref={canvas} aria-hidden="true" />
      <div className="hero-fallback" aria-hidden="true" />
    </>
  );
}

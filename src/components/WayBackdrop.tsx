'use client';

import { useSyncExternalStore } from 'react';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'framer-motion';
import styles from './WayBackdrop.module.css';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const preference = window.matchMedia(REDUCED_MOTION_QUERY);
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

function prefersReducedMotion() {
  return typeof window.matchMedia !== 'function' || window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

const objects = [
  { id: 'sculpture', shape: 'sculpture', phase: 0, angle: -5, travel: 22 },
  { id: 'crystal', shape: 'crystal', phase: 1.2, angle: 8, travel: 9 },
  { id: 'ribbon', shape: 'sculpture', phase: 2.4, angle: 24, travel: 24 },
  { id: 'facet', shape: 'crystal', phase: 3.6, angle: -16, travel: 16 },
  { id: 'twist', shape: 'sculpture', phase: 4.8, angle: -28, travel: 20 },
  { id: 'prism', shape: 'crystal', phase: 5.6, angle: 20, travel: 18 },
] as const;

type Artwork = (typeof objects)[number];

function ArtworkImage({ artwork }: { artwork: Artwork }) {
  const sculpture = artwork.shape === 'sculpture';
  return (
    <img
      src={sculpture ? '/rescale-sculpture.webp' : '/rescale-crystal.webp'}
      width={sculpture ? 400 : 220}
      height={sculpture ? 408 : 230}
      alt=""
      draggable={false}
      decoding="async"
      className={styles.image}
    />
  );
}

function ScrollObject({ artwork, scroll }: { artwork: Artwork; scroll: MotionValue<number> }) {
  // Bounded travel keeps the full silhouettes on screen, even on very long pages.
  const x = useTransform(scroll, (value) => `${Math.sin(value / 920 + artwork.phase) * 6}px`);
  const y = useTransform(
    scroll,
    (value) => `${Math.sin(value / 680 + artwork.phase) * artwork.travel}px`,
  );
  const turn = useTransform(
    scroll,
    (value) => `${artwork.angle + Math.sin(value / 1100 + artwork.phase) * 12}deg`,
  );
  const style = { '--drift-x': x, '--drift-y': y, '--turn': turn } as MotionStyle;

  return (
    <motion.div
      data-way-object={artwork.id}
      className={`${styles.object} ${styles[artwork.id]}`}
      style={style}
    >
      <ArtworkImage artwork={artwork} />
    </motion.div>
  );
}

function ScrollArtwork() {
  const { scrollY } = useScroll();
  const scroll = useSpring(scrollY, { stiffness: 100, damping: 28, mass: 0.4 });

  return objects.map((artwork) => (
    <ScrollObject key={artwork.id} artwork={artwork} scroll={scroll} />
  ));
}

export default function WayBackdrop() {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    () => true,
  );

  return (
    <div
      aria-hidden="true"
      data-way-backdrop
      data-way-motion={reducedMotion ? 'reduced' : 'scroll'}
      className={styles.backdrop}
    >
      {reducedMotion ? (
        objects.map((artwork) => (
          <div
            key={artwork.id}
            data-way-object={artwork.id}
            className={`${styles.object} ${styles[artwork.id]}`}
          >
            <ArtworkImage artwork={artwork} />
          </div>
        ))
      ) : (
        <ScrollArtwork />
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

interface Props {
  /** Display height in px (width scales by aspect ratio) */
  size?: number;
  /** If true, boosts logo colours to near-white — for dark nav */
  brighten?: boolean;
  className?: string;
}

export default function LogoCanvas({ size = 70, brighten = true, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/logo.jpg.PNG';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        // Smoothly fade near-white pixels to transparent
        const whiteness = Math.min(r, g, b) / 255;
        if (whiteness > 0.88) {
          d[i + 3] = Math.round(((1 - whiteness) / 0.12) * 80);
        }
        // Brighten remaining pixels to near-white (for dark nav)
        if (brighten && d[i + 3] > 20) {
          d[i]     = Math.min(255, d[i]     + 140);
          d[i + 1] = Math.min(255, d[i + 1] + 140);
          d[i + 2] = Math.min(255, d[i + 2] + 140);
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // Scale display size
      const aspect = img.naturalWidth / img.naturalHeight;
      canvas.style.height = `${size}px`;
      canvas.style.width  = `${size * aspect}px`;
    };
  }, [size, brighten]);

  return <canvas ref={canvasRef} className={className} />;
}

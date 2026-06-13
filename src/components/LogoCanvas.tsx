'use client';

import { useEffect, useRef } from 'react';

interface Props {
  size?: number;
  brighten?: boolean;
  className?: string;
}

export default function LogoCanvas({ size = 70, brighten = false, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/way-logo.png';
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
        const lightness = (r + g + b) / 3;
        if (lightness > 170) {
          const fade = Math.min(1, (lightness - 170) / 50);
          d[i + 3] = Math.round((1 - fade) * d[i + 3]);
        }
        if (brighten && d[i + 3] > 20) {
          d[i]     = Math.min(255, d[i]     + 160);
          d[i + 1] = Math.min(255, d[i + 1] + 160);
          d[i + 2] = Math.min(255, d[i + 2] + 160);
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const aspect = img.naturalWidth / img.naturalHeight;
      canvas.style.height = `${size}px`;
      canvas.style.width  = `${size * aspect}px`;
    };
  }, [size, brighten]);

  return <canvas ref={canvasRef} className={className} />;
}

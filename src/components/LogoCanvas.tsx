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

      // Draw at full resolution for pixel processing
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

      // Find tight bounding box of non-transparent pixels
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (d[(y * canvas.width + x) * 4 + 3] > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Crop canvas to content bounds
      const cw = maxX - minX + 1;
      const ch = maxY - minY + 1;
      const cropped = ctx.getImageData(minX, minY, cw, ch);
      canvas.width = cw;
      canvas.height = ch;
      ctx.putImageData(cropped, 0, 0);

      // Scale to requested size
      const aspect = cw / ch;
      canvas.style.height = `${size}px`;
      canvas.style.width  = `${size * aspect}px`;
    };
  }, [size, brighten]);

  return <canvas ref={canvasRef} className={className} />;
}

'use client';

import { useEffect, useRef } from 'react';

interface Props {
  className?: string;
}

export default function PaintingCanvas({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/bars-painting.png';
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
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;
        const lightness = (max + min) / 2;

        if (chroma < 38) {
          if (lightness > 205) {
            d[i + 3] = 0;
          } else if (lightness > 165) {
            const fade = (lightness - 165) / 40;
            d[i + 3] = Math.round((1 - fade) * d[i + 3]);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (d[(y * canvas.width + x) * 4 + 3] > 12) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX > minX && maxY > minY) {
        const cw = maxX - minX + 1;
        const ch = maxY - minY + 1;
        const cropped = ctx.getImageData(minX, minY, cw, ch);
        canvas.width = cw;
        canvas.height = ch;
        ctx.putImageData(cropped, 0, 0);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

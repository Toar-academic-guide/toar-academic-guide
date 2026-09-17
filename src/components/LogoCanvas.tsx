'use client';

import { useEffect, useRef } from 'react';

interface Props {
  size?: number;
  brighten?: boolean;
  className?: string;
}

export default function LogoCanvas({ size = 70, brighten = false, className = '' }: Props) {
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
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const lightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

        if (lightness > 170) {
          const fade = Math.min(1, (lightness - 170) / 50);
          data[i + 3] = Math.round((1 - fade) * data[i + 3]);
        }

        if (brighten && data[i + 3] > 20) {
          data[i] = Math.min(255, data[i] + 160);
          data[i + 1] = Math.min(255, data[i + 1] + 160);
          data[i + 2] = Math.min(255, data[i + 2] + 160);
        }
      }

      ctx.putImageData(imageData, 0, 0);

      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] > 10) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const cropWidth = maxX - minX + 1;
      const cropHeight = maxY - minY + 1;
      const cropped = ctx.getImageData(minX, minY, cropWidth, cropHeight);

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      ctx.putImageData(cropped, 0, 0);

      const aspect = cropWidth / cropHeight;
      canvas.style.width = `${size * aspect}px`;
      canvas.style.height = `${size}px`;
    };
  }, [size, brighten]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Way"
      role="img"
      className={`shrink-0 ${className}`}
      style={{ height: size }}
    />
  );
}

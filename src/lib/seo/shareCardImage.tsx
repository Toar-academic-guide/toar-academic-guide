import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { SHARE_IMAGE_SIZE, type ShareCard } from './shareCards';

// next/og cannot parse the site's variable Heebo file, so the cards use static Hebrew and Latin cuts.
function loadFont(file: string) {
  return readFile(join(process.cwd(), 'src/lib/seo/fonts', file)).then((font) =>
    font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
  );
}

const hebrew = loadFont('Heebo-Hebrew-700.ttf');
const latin = loadFont('Heebo-Latin-700.ttf');

function line(text: string, color: string, size: number) {
  const tokens = text.match(/[\u0590-\u05FF]+|\d+|[^\s\d\u0590-\u05FF]+/g) ?? [];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        direction: 'rtl',
        color,
        fontSize: size,
        lineHeight: 1.25,
      }}
    >
      {tokens.map((token, index) => {
        const hebrew = /[\u0590-\u05FF]/.test(token);
        return (
          <div
            key={index}
            style={{
              display: 'flex',
              fontFamily: hebrew ? 'Heebo' : 'Heebo Latin',
              direction: hebrew ? 'rtl' : 'ltr',
              marginRight: index === 0 || /^[.,]$/.test(token) ? 0 : 14,
            }}
          >
            {token}
          </div>
        );
      })}
    </div>
  );
}

export function renderShareCard(card: ShareCard) {
  return Promise.all([hebrew, latin]).then(
    ([hebrewFont, latinFont]) =>
      new ImageResponse(
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: '#f7fbff',
            color: '#0c1d45',
            direction: 'rtl',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -260,
              bottom: -220,
              width: 520,
              height: 520,
              borderRadius: 9999,
              background: '#d9ecff',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: -80,
              bottom: -40,
              width: 300,
              height: 300,
              borderRadius: 9999,
              background: '#e6e1ff',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              width: '100%',
              height: '100%',
              padding: '72px 88px',
              direction: 'ltr',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontFamily: 'Heebo Latin',
                fontSize: 40,
                color: '#7784e8',
                direction: 'ltr',
              }}
            >
              myway
            </div>
            <div style={{ display: 'flex', marginTop: 28 }}>
              {line(card.headline, '#0c1d45', card.headline.length > 22 ? 58 : 68)}
            </div>
            <div style={{ display: 'flex', marginTop: 18 }}>
              {line(card.subline, '#435072', 32)}
            </div>
          </div>
        </div>,
        {
          ...SHARE_IMAGE_SIZE,
          fonts: [
            { name: 'Heebo', data: hebrewFont, weight: 700 },
            { name: 'Heebo Latin', data: latinFont, weight: 700 },
          ],
        },
      ),
  );
}

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export type ShareCardId =
  'admission' | 'sekhem' | 'institutions' | 'psychometricTwoDomain' | 'openDays';

export type ShareCard = {
  id: ShareCardId;
  imagePath: string;
  alt: string;
  headline: string;
  subline: string;
};

export const shareCards: Record<ShareCardId, ShareCard> = {
  admission: {
    id: 'admission',
    imagePath: '/app/calculator/opengraph-image',
    alt: 'מחשבון סיכויי קבלה לתואר ב-MyWay',
    headline: 'מחשבון סיכויי קבלה',
    subline: 'בגרות ופסיכומטרי. לאן אתם מתקבלים.',
  },
  sekhem: {
    id: 'sekhem',
    imagePath: '/sekhem-calculator/opengraph-image',
    alt: 'מחשבון סכם וממוצע בגרות לפי מוסד ב-MyWay',
    headline: 'מחשבון סכם וממוצע בגרות',
    subline: 'לפי המוסד, מול סף הקבלה.',
  },
  institutions: {
    id: 'institutions',
    imagePath: '/institutions/opengraph-image',
    alt: 'מוסדות לימוד בישראל ב-MyWay',
    headline: 'מוסדות לימוד בישראל',
    subline: 'השוואה לפי תחום, מיקום וסוג מוסד.',
  },
  psychometricTwoDomain: {
    id: 'psychometricTwoDomain',
    imagePath: '/psychometric-two-domain/opengraph-image',
    alt: 'מדריך הפסיכומטרי הדו־תחומי ב-MyWay',
    headline: 'פסיכומטרי דו־תחומי',
    subline: 'מה משתנה מדצמבר 2026',
  },
  openDays: {
    id: 'openDays',
    imagePath: '/open-days/opengraph-image',
    alt: 'ימים פתוחים באוניברסיטאות ובמכללות ב-MyWay',
    headline: 'ימים פתוחים',
    subline: 'תאריכים באוניברסיטאות ובמכללות.',
  },
};

export function socialImage(card: ShareCard) {
  return {
    url: card.imagePath,
    width: SHARE_IMAGE_SIZE.width,
    height: SHARE_IMAGE_SIZE.height,
    type: 'image/png' as const,
    alt: card.alt,
  };
}

export function socialMetadata(card: ShareCard, title: string, description: string, url: string) {
  const image = socialImage(card);
  return {
    openGraph: {
      title,
      description,
      url,
      type: 'website' as const,
      locale: 'he_IL',
      siteName: 'MyWay',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image],
    },
  };
}

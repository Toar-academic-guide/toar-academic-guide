import { renderShareCard } from '@/lib/seo/shareCardImage';
import { SHARE_IMAGE_SIZE, shareCards } from '@/lib/seo/shareCards';

export const alt = shareCards.institutions.alt;
export const size = SHARE_IMAGE_SIZE;
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default function Image() {
  return renderShareCard(shareCards.institutions);
}

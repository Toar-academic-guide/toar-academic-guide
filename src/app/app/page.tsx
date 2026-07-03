import { redirect } from 'next/navigation';

import { ROUTES } from '@/lib/routes';

export default function AppIndexPage() {
  redirect(ROUTES.profile);
}

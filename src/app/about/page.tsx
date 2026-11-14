import AboutPage from '@/components/AboutPage';
import { ABOUT_INDEPENDENCE_DESCRIPTION } from '@/lib/aboutIndependence';

export const metadata = {
  title: 'מי אנחנו',
  description: ABOUT_INDEPENDENCE_DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'מי אנחנו',
    description: ABOUT_INDEPENDENCE_DESCRIPTION,
    url: '/about',
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
  },
};

export default function AboutRoutePage() {
  return <AboutPage />;
}

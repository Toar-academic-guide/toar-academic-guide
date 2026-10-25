import AboutPage from '@/components/AboutPage';

export const metadata = {
  title: 'מי אנחנו',
  description: 'הסיפור של יונתן ועמית, והדרך שבה נולד Way.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'מי אנחנו',
    description: 'הסיפור של יונתן ועמית, והדרך שבה נולד Way.',
    url: '/about',
    type: 'website',
    locale: 'he_IL',
    siteName: 'MyWay',
  },
};

export default function AboutRoutePage() {
  return <AboutPage />;
}

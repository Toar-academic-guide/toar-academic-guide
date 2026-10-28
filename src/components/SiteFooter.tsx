import Image from 'next/image';
import Link from 'next/link';
import { FOOTER_LEGAL_LINKS, FOOTER_NAV_LINKS } from '@/lib/footerLinks';

const linkClassName =
  'inline-flex min-h-11 min-w-11 items-center rounded-sm text-[#dbe4ff] underline-offset-4 hover:text-white hover:underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9b8ff]';

export default function SiteFooter() {
  return (
    <footer
      dir="rtl"
      className="relative z-10 border-t border-[#0c1d45] bg-[#0c1d45] px-5 text-right text-sm leading-[1.6] text-[#c9d3ea] md:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 py-6 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-16 md:pb-[18px]">
          <div className="col-span-2 min-w-0 md:col-span-1">
            <Link href="/" aria-label="MyWay — עמוד הבית" className={linkClassName}>
              <Image
                src="/brand/myway-wordmark-inverse.svg"
                alt="MyWay"
                width={606}
                height={186}
                unoptimized
                className="h-[30px] w-auto md:h-[34px]"
              />{' '}
            </Link>
            <p className="mb-3 mt-2 max-w-[340px] md:max-w-none">
              בדיקת סיכויי קבלה לתוכניות לימודים לתואר, לפי הנתונים שהזנת.{' '}
            </p>
            <h2 className="font-semibold leading-[22px] text-[#f8fbff]">יצירת קשר</h2>{' '}
            <a
              href="mailto:info@findmyway.co.il"
              className={`${linkClassName} underline decoration-[#a9b5d1] decoration-1 hover:decoration-white hover:decoration-2`}
            >
              <bdi dir="ltr">info@findmyway.co.il</bdi>
            </a>
          </div>
          <nav aria-label="ניווט בכותרת התחתונה" className="min-w-0">
            <h2 className="font-semibold leading-[22px] text-[#f8fbff]">ניווט</h2>{' '}
            <ul>
              {FOOTER_NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={linkClassName}>
                    {label}
                  </Link>{' '}
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="קישורים משפטיים" className="min-w-0">
            <h2 className="font-semibold leading-[22px] text-[#f8fbff]">מידע משפטי</h2>{' '}
            <ul>
              {FOOTER_LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={linkClassName}>
                    {label}
                  </Link>{' '}
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col items-start gap-3 border-t border-[#2b3d64] pb-6 pt-5 text-xs leading-[1.6] text-[#a9b5d1] md:flex-row md:items-center md:justify-between md:gap-6 md:py-4">
          <p className="max-w-[330px] md:max-w-none">
            התוצאות הן הערכה בלבד; ההחלטה על קבלה היא של המוסד{' '}
          </p>
          <p className="whitespace-nowrap">
            <bdi dir="ltr">© 2026 MyWay</bdi>{' '}
          </p>
        </div>
      </div>
    </footer>
  );
}

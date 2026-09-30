import Image from 'next/image';
import WayPageShell from '@/components/WayPageShell';

// Temporary founders photo; replace the public asset before publishing.
const ABOUT_FOUNDERS_IMAGE_SRC = '/about-founders-temporary.png';

export default function AboutPage() {
  return (
    <WayPageShell contentClassName="">
      <main className="relative z-10 flex min-h-screen items-center px-4 pb-16 pt-32 sm:px-6 lg:pt-36">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#445274] sm:text-6xl">
            הדרך שלנו התחילה בדיוק בצומת הזאת.
          </h1>

          <div className="mt-8 w-full max-w-[22.5rem] overflow-hidden rounded-[1.6rem] border border-white bg-white/72 p-2 shadow-[0_20px_64px_rgba(105,133,190,0.15)] backdrop-blur sm:max-w-[25rem]">
            <Image
              src={ABOUT_FOUNDERS_IMAGE_SRC}
              width={1200}
              height={1600}
              alt="יונתן ועמית בשדה חמניות"
              loading="eager"
              sizes="(max-width: 640px) calc(100vw - 2rem), 400px"
              className="aspect-[4/3] w-full rounded-[1.2rem] object-cover object-center"
            />
          </div>

          <article className="mt-6 max-w-4xl rounded-[1.8rem] border border-white bg-white/78 p-6 shadow-[0_24px_80px_rgba(105,133,190,0.16)] backdrop-blur sm:p-9">
            <p className="text-center text-lg leading-9 text-[#52607f]">
              אנחנו יונתן ועמית, חברים מאז התיכון. למדנו יחד פיזיקה ומחשבים, ובהמשך גם שירתנו יחד
              בצבא. אחרי השחרור כל אחד מאיתנו פנה לדרך אחרת. עמית המשיך לעולמות הטכנולוגיה, וכיום
              עובד בהייטק ולומד מדעי המחשב באופן מקוון באוניברסיטת לונדון, מסלול שמצא לאחר מחקר ארוך
              וחיפוש אחר לימודים שיוכל לשלב עם עבודתו. יונתן לומד כיום פסיכולוגיה, ביולוגיה ומדעי
              המוח באוניברסיטת תל אביב. הדרך לשם כללה שבעה ימים פתוחים, שתי פגישות עם יועצת
              תעסוקתית, שני פסיכומטריים, שיפור של שלוש בגרויות ברמת חמש יחידות ושיחות עם יותר ממאה
              אנשים על המסלולים שבחרו, הכול מתוך רצון להבין ולדייק את הדרך המתאימה לו. מהחוויות האלה
              הבנו ששמות של תארים הם רק כותרות. כדי לבחור נכון צריך להבין מה באמת לומדים, איך נראים
              הלימודים והעבודה ביום יום ולאן כל מסלול יכול להוביל. את Way הקמנו מתוך צורך שחווינו
              בעצמנו: להפוך צומת עמוסה באפשרויות ובמידע מפוזר לדרך אישית, ברורה ומעשית יותר.
            </p>
          </article>
        </div>
      </main>
    </WayPageShell>
  );
}

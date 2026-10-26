'use client';

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      dir="rtl"
      className="sr-only text-right focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#0c1d45] focus:px-5 focus:py-3 focus:text-white focus:outline-solid focus:outline-2 focus:outline-offset-2 focus:outline-[#6554b8]"
      onClick={(event) => {
        const main = document.getElementById('main-content') ?? document.querySelector('main');
        if (!main) return;
        event.preventDefault();
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        main.scrollIntoView({ block: 'start', behavior: 'instant' });
      }}
    >
      דלג לתוכן הראשי
    </a>
  );
}

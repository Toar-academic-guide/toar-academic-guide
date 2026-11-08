const profiles = [
  {
    name: 'אינסטגרם',
    label: 'MyWay באינסטגרם',
    href: 'https://www.instagram.com/findmyway_il/',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
      </svg>
    ),
  },
  {
    name: 'טיקטוק',
    label: 'MyWay בטיקטוק',
    href: 'https://www.tiktok.com/@myway_study',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M16.5 2h-3.2v12.3a3.3 3.3 0 1 1-2.8-3.3V7.8a6.5 6.5 0 1 0 6 6.5V8.1a8 8 0 0 0 4.7 1.5V6.4A4.8 4.8 0 0 1 16.5 2Z" />
      </svg>
    ),
  },
];

export default function SocialFollowLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div dir="rtl" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-right text-sm">
      {profiles.map(({ name, label, href, icon }) => (
        <a
          key={href}
          href={href}
          aria-label={label}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-11 items-center gap-2 rounded-sm px-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${tone === 'dark' ? 'text-[#dbe4ff] hover:text-white focus-visible:outline-[#a9b8ff]' : 'text-slate-600 hover:text-[#3730a3] focus-visible:outline-[#4f46e5]'}`}
        >
          {icon}
          <span>{name}</span>
        </a>
      ))}
    </div>
  );
}

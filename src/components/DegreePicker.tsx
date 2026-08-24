'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronLeft,
  Code2,
  Compass,
  Dumbbell,
  Flame,
  FlaskConical,
  GraduationCap,
  Grid2X2,
  HeartPulse,
  Info,
  Laptop,
  Leaf,
  Mic,
  Music,
  Palette,
  Plane,
  Scale,
  Search,
  Sigma,
  Star,
  Stethoscope,
  UsersRound,
  Utensils,
  X,
} from 'lucide-react';
import { FIELD_ENRICHMENT, PROGRAM_FIELD_MAP } from '@/data/degrees/fieldEnrichment';
import type { CatalogueProgram } from '@/types/catalogue';

interface Props {
  programs: CatalogueProgram[];
  savedProgramIds: string[];
  onToggleProgramGroup: (programIds: string[]) => void;
  onDone: () => void;
}

type DegreeChoice = {
  key: string;
  category: string;
  name: string;
  aboutText: string;
  programIds: string[];
};

type CategoryTone = {
  aura: string;
  icon: string;
  panel: string;
  ring: string;
};

type CategoryMeta = {
  icon: LucideIcon;
  tone: CategoryTone;
  tags: string[];
};

const categoryTones: CategoryTone[] = [
  {
    aura: 'from-[#ff79a8] to-[#f04f8f]',
    icon: 'text-white',
    panel: 'from-[#fff7fb] to-[#fffefe]',
    ring: 'ring-[#ff8eb7]/42',
  },
  {
    aura: 'from-[#76ddff] to-[#28aee8]',
    icon: 'text-white',
    panel: 'from-[#f4fcff] to-[#ffffff]',
    ring: 'ring-[#72cfff]/42',
  },
  {
    aura: 'from-[#a982ff] to-[#7959e8]',
    icon: 'text-white',
    panel: 'from-[#fbf8ff] to-[#ffffff]',
    ring: 'ring-[#9677ff]/48',
  },
  {
    aura: 'from-[#87eba1] to-[#42c87b]',
    icon: 'text-white',
    panel: 'from-[#f6fff8] to-[#ffffff]',
    ring: 'ring-[#87e6a6]/42',
  },
  {
    aura: 'from-[#ffbd72] to-[#f28a3d]',
    icon: 'text-white',
    panel: 'from-[#fffaf4] to-[#ffffff]',
    ring: 'ring-[#ffb672]/42',
  },
  {
    aura: 'from-[#67dfcf] to-[#20b8b2]',
    icon: 'text-white',
    panel: 'from-[#f4fffd] to-[#ffffff]',
    ring: 'ring-[#70ddd3]/42',
  },
  {
    aura: 'from-[#ffd95f] to-[#f6b928]',
    icon: 'text-white',
    panel: 'from-[#fffdf4] to-[#ffffff]',
    ring: 'ring-[#ffd45d]/44',
  },
  {
    aura: 'from-[#b58bff] to-[#8358e9]',
    icon: 'text-white',
    panel: 'from-[#fbf8ff] to-[#ffffff]',
    ring: 'ring-[#a687ff]/44',
  },
];

const categoryMeta: Record<string, CategoryMeta> = {
  'אמנות ועיצוב': { icon: Palette, tone: categoryTones[0], tags: ['creative', 'popular'] },
  'מדעי המחשב': { icon: Laptop, tone: categoryTones[1], tags: ['tech', 'popular'] },
  הנדסה: { icon: Code2, tone: categoryTones[2], tags: ['tech', 'popular', 'science'] },
  'הנדסה וטכנולוגיה': {
    icon: Code2,
    tone: categoryTones[2],
    tags: ['tech', 'popular', 'science'],
  },
  'מדעי הבריאות': { icon: HeartPulse, tone: categoryTones[3], tags: ['people', 'science'] },
  רפואה: { icon: Stethoscope, tone: categoryTones[3], tags: ['people', 'science', 'popular'] },
  'רפואה אינטגרטיבית': { icon: HeartPulse, tone: categoryTones[3], tags: ['people'] },
  'כלכלה ועסקים': { icon: BriefcaseBusiness, tone: categoryTones[4], tags: ['popular'] },
  'מדעי החברה': { icon: UsersRound, tone: categoryTones[5], tags: ['people', 'popular'] },
  תקשורת: { icon: Mic, tone: categoryTones[5], tags: ['people', 'creative'] },
  חינוך: { icon: GraduationCap, tone: categoryTones[6], tags: ['people'] },
  'מדעים מדויקים': { icon: Sigma, tone: categoryTones[7], tags: ['science'] },
  'מדעי החיים': { icon: Leaf, tone: categoryTones[3], tags: ['science'] },
  משפטים: { icon: Scale, tone: categoryTones[1], tags: ['people', 'popular'] },
  אדריכלות: { icon: Building2, tone: categoryTones[0], tags: ['creative', 'tech'] },
  'טכנולוגיה ופיתוח': { icon: Laptop, tone: categoryTones[1], tags: ['tech'] },
  'מוזיקה ותיאטרון': { icon: Music, tone: categoryTones[0], tags: ['creative'] },
  ספורט: { icon: Dumbbell, tone: categoryTones[5], tags: ['people'] },
  'קולינריה וגסטרונומיה': { icon: Utensils, tone: categoryTones[4], tags: ['creative'] },
  'תיירות ואירוח': { icon: Plane, tone: categoryTones[6], tags: ['people'] },
};

const fallbackMeta: CategoryMeta = {
  icon: BookOpen,
  tone: categoryTones[7],
  tags: [],
};

const filterOptions = [
  { id: 'all', label: 'הכל', icon: Grid2X2 },
  { id: 'popular', label: 'מבוקשים', icon: Flame },
  { id: 'tech', label: 'טכנולוגיים', icon: Laptop },
  { id: 'creative', label: 'יצירתיים', icon: Palette },
  { id: 'people', label: 'עם אנשים', icon: UsersRound },
  { id: 'science', label: 'מדעיים', icon: FlaskConical },
] as const;

const preferredCategoryOrder = [
  'מדעי הבריאות',
  'רפואה',
  'הנדסה',
  'מדעי המחשב',
  'אמנות ועיצוב',
  'כלכלה ועסקים',
  'מדעי החברה',
  'חינוך',
  'מדעים מדויקים',
  'הנדסה וטכנולוגיה',
  'טכנולוגיה ופיתוח',
  'משפטים',
  'מדעי החיים',
  'תקשורת',
  'אדריכלות',
  'מוזיקה ותיאטרון',
  'ספורט',
  'קולינריה וגסטרונומיה',
  'רפואה אינטגרטיבית',
  'תיירות ואירוח',
];

const degreeAboutOverrides: Record<string, string> = {
  'הנדסת חשמל':
    'תואר של ארבע שנים, אינטנסיבי מאוד, עם בסיס כבד במתמטיקה ופיזיקה ובהמשך קורסים באלקטרוניקה, חשמל, אותות ותכנות. מתאים בעיקר למי שחזק ורוצה לעסוק בפתרון בעיות טכנולוגיות מורכבות; תנאי הקבלה לרוב גבוהים והעומס במהלך התואר משמעותי.',
};

const verifiedAboutFallback =
  'אין לנו עדיין תיאור קצר ומאומת לתואר הזה. אפשר לבחור אותו עכשיו, ונוסיף כאן תקציר מדויק אחרי שנאמת את הנתונים.';

const enrichmentByNormalizedName = new Map(
  Object.values(FIELD_ENRICHMENT).map((field) => [normalize(field.name), field.aboutText]),
);

function normalize(value: string) {
  return value.toLowerCase().replace(/[֑-ׇ]/g, '');
}

function degreeCountLabel(count: number) {
  return `${count} ${count === 1 ? 'תואר' : 'תארים'}`;
}

function getCategoryMeta(category: string) {
  return categoryMeta[category] ?? fallbackMeta;
}

function sortCategories(left: string, right: string) {
  const leftIndex = getCategoryOrder(left);
  const rightIndex = getCategoryOrder(right);

  if (leftIndex !== 999 || rightIndex !== 999) {
    return leftIndex - rightIndex;
  }

  return left.localeCompare(right, 'he');
}

function getCategoryOrder(category: string) {
  const index = preferredCategoryOrder.indexOf(category);
  return index === -1 ? 999 : index;
}

function getDegreeAboutText(name: string, programIds: string[]) {
  const override = degreeAboutOverrides[name];
  if (override) {
    return override;
  }

  for (const programId of programIds) {
    const fieldId = PROGRAM_FIELD_MAP[programId];
    const aboutText = fieldId ? FIELD_ENRICHMENT[fieldId]?.aboutText : undefined;
    if (aboutText) {
      return aboutText;
    }
  }

  return enrichmentByNormalizedName.get(normalize(name)) ?? verifiedAboutFallback;
}

function buildDegreeChoices(programs: CatalogueProgram[]) {
  const choices = new Map<string, Omit<DegreeChoice, 'aboutText'>>();

  for (const program of programs) {
    const category = program.category.trim() || 'אחר';
    const name = program.name.trim();
    const key = name;
    const existing = choices.get(key);

    if (existing) {
      existing.programIds.push(program.id);
      if (getCategoryOrder(category) < getCategoryOrder(existing.category)) {
        existing.category = category;
      }
    } else {
      choices.set(key, {
        key,
        category,
        name,
        programIds: [program.id],
      });
    }
  }

  return Array.from(choices.values())
    .map((choice) => ({
      ...choice,
      aboutText: getDegreeAboutText(choice.name, choice.programIds),
    }))
    .sort((left, right) => {
      const categorySort = sortCategories(left.category, right.category);
      return categorySort === 0 ? left.name.localeCompare(right.name, 'he') : categorySort;
    });
}

export default function DegreePicker({
  programs,
  savedProgramIds,
  onToggleProgramGroup,
  onDone,
}: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<(typeof filterOptions)[number]['id']>('all');
  const [showAllPrograms, setShowAllPrograms] = useState(false);

  const degreeChoices = useMemo(() => buildDegreeChoices(programs), [programs]);

  const choicesByCategory = useMemo(() => {
    const categories = new Map<string, DegreeChoice[]>();

    for (const choice of degreeChoices) {
      if (!categories.has(choice.category)) {
        categories.set(choice.category, []);
      }
      categories.get(choice.category)?.push(choice);
    }

    return categories;
  }, [degreeChoices]);

  const categoryNames = useMemo(
    () => Array.from(choicesByCategory.keys()).sort(sortCategories),
    [choicesByCategory],
  );

  const visibleCategoryNames = useMemo(() => {
    if (activeFilter === 'all') {
      return categoryNames;
    }

    return categoryNames.filter((category) => getCategoryMeta(category).tags.includes(activeFilter));
  }, [activeFilter, categoryNames]);

  const selectedCategory =
    activeCategory && visibleCategoryNames.includes(activeCategory)
      ? activeCategory
      : visibleCategoryNames.includes('הנדסה')
        ? 'הנדסה'
        : (visibleCategoryNames[0] ?? categoryNames[0] ?? null);
  const selectedChoices = selectedCategory ? (choicesByCategory.get(selectedCategory) ?? []) : [];
  const selectedMeta = selectedCategory ? getCategoryMeta(selectedCategory) : fallbackMeta;
  const SelectedIcon = selectedMeta.icon;
  const choicesInPanel = showAllPrograms ? selectedChoices : selectedChoices.slice(0, 5);

  const searchActive = query.trim().length > 0;
  const filteredChoices = useMemo(() => {
    if (!searchActive) {
      return [] as DegreeChoice[];
    }

    const normalizedQuery = normalize(query.trim());
    return degreeChoices.filter((choice) => {
      return (
        normalize(choice.name).includes(normalizedQuery) ||
        normalize(choice.category).includes(normalizedQuery)
      );
    });
  }, [degreeChoices, query, searchActive]);

  const savedSet = useMemo(() => new Set(savedProgramIds), [savedProgramIds]);
  const savedDegreeCount = useMemo(
    () => degreeChoices.filter((choice) => choice.programIds.some((id) => savedSet.has(id))).length,
    [degreeChoices, savedSet],
  );

  function chooseCategory(category: string) {
    setActiveCategory(category);
    setShowAllPrograms(false);
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="mx-auto max-w-7xl px-5 pb-32 pt-20 sm:px-8 sm:pt-0 lg:px-10">
        <div className="mx-auto mb-7 max-w-4xl text-center">
          <h1 className="mb-2 mt-0 text-[1.7rem] font-semibold leading-tight text-[#0c1d45] md:text-[2.2rem]">
            בחר את התחום שמעניין אותך
          </h1>
          <p className="text-sm font-medium text-[#7280a3] md:text-base">
            חפש שם של תואר, או דפדף בין הקטגוריות. אפשר לבחור כמה שתרצה.
          </p>
        </div>

        <div className="mx-auto mb-7 max-w-[860px]">
          <div className="relative">
            <Search
              size={23}
              strokeWidth={2.1}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#7f8bad]"
            />
            <input
              id="degree-picker-search"
              name="degree-picker-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חפש תואר או תחום…"
              className="h-[62px] w-full rounded-[1.35rem] border border-[#d8e2f5] bg-white/72 px-14 text-base font-semibold text-[#4b5578] shadow-[0_18px_54px_rgba(105,133,190,0.12)] outline-none backdrop-blur-xl transition placeholder:font-semibold placeholder:text-[#98a4bf] focus:border-[#9eb8f4] focus:bg-white/92 focus:shadow-[0_20px_58px_rgba(105,133,190,0.18)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="נקה חיפוש"
                className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#8793b1] transition hover:bg-white/80 hover:text-[#4b5578]"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </div>

        {searchActive ? (
          <div className="mx-auto max-w-4xl">
            <SearchResults
              choices={filteredChoices}
              savedSet={savedSet}
              onToggleChoice={onToggleProgramGroup}
              onClear={() => setQuery('')}
            />
          </div>
        ) : (
          <>
            <div className="mx-auto mb-7 flex max-w-5xl flex-wrap justify-center gap-3">
              {filterOptions.map(({ id, label, icon: FilterIcon }) => {
                const isActive = activeFilter === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveFilter(id);
                      setShowAllPrograms(false);
                    }}
                    className={[
                      'inline-flex h-12 items-center gap-2 rounded-full border px-5 text-sm font-bold shadow-[0_12px_34px_rgba(105,133,190,0.09)] backdrop-blur-xl transition',
                      isActive
                        ? 'border-[#9fb5f7] bg-[#eef4ff] text-[#5062ce]'
                        : 'border-[#dce6f6] bg-white/72 text-[#4f5b7e] hover:border-[#c7d6ee] hover:bg-white/88',
                    ].join(' ')}
                  >
                    <FilterIcon size={18} strokeWidth={2.1} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div
              dir="ltr"
              className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]"
            >
              <div
                dir="rtl"
                className="order-2 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:order-none xl:grid-cols-4"
              >
                {visibleCategoryNames.map((category) => {
                  const categoryChoices = choicesByCategory.get(category) ?? [];
                  const meta = getCategoryMeta(category);
                  const Icon = meta.icon;
                  const isActive = selectedCategory === category;
                  const savedInCategory = categoryChoices.filter((choice) =>
                    choice.programIds.some((id) => savedSet.has(id)),
                  ).length;

                  return (
                    <motion.button
                      key={category}
                      type="button"
                      layout
                      onClick={() => chooseCategory(category)}
                      onMouseEnter={() => chooseCategory(category)}
                      onFocus={() => chooseCategory(category)}
                      className={[
                        'group relative min-h-[188px] overflow-hidden rounded-[1.45rem] border bg-gradient-to-b p-5 text-center shadow-[0_20px_60px_rgba(105,133,190,0.13)] backdrop-blur-xl transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fd8ff] md:min-h-[214px]',
                        meta.tone.panel,
                        isActive
                          ? `border-[#9a85ff] ring-2 ${meta.tone.ring}`
                          : 'border-white/82 hover:-translate-y-1 hover:border-white hover:shadow-[0_24px_70px_rgba(105,133,190,0.18)]',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br shadow-[0_16px_38px_rgba(85,106,190,0.2)] transition duration-200 md:h-24 md:w-24',
                          meta.tone.aura,
                          isActive ? 'scale-105' : 'group-hover:scale-105',
                        ].join(' ')}
                      >
                        <Icon size={42} strokeWidth={2.2} className={meta.tone.icon} />
                      </span>

                      <span className="block text-lg font-bold leading-tight text-[#445274] md:text-xl">
                        {category}
                      </span>
                      <span className="mt-2 block text-sm font-bold text-[#7a86a6]">
                        {degreeCountLabel(categoryChoices.length)}
                      </span>

                      {savedInCategory > 0 ? (
                        <span className="absolute right-4 top-4 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white/88 px-2 text-xs font-bold text-[#5062ce] shadow-[0_10px_24px_rgba(85,106,190,0.16)]">
                          {savedInCategory}
                        </span>
                      ) : null}

                      {isActive ? (
                        <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#7458e9] text-white shadow-[0_12px_28px_rgba(116,88,233,0.28)]">
                          <Check size={19} strokeWidth={2.5} />
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>

              <aside
                dir="rtl"
                className="order-1 rounded-[1.5rem] border border-white/82 bg-white/82 p-5 shadow-[0_24px_72px_rgba(105,133,190,0.16)] backdrop-blur-xl lg:sticky lg:top-5 lg:order-none"
              >
                {selectedCategory ? (
                  <>
                    <div className="mb-7 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-[0_14px_32px_rgba(85,106,190,0.18)]',
                            selectedMeta.tone.aura,
                          ].join(' ')}
                        >
                          <SelectedIcon size={27} strokeWidth={2.25} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-semibold text-[#445274]">{selectedCategory}</h2>
                          <p className="mt-1 text-sm font-bold text-[#765cf0]">
                            {degreeCountLabel(selectedChoices.length)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(null)}
                        aria-label="סגור פרטי תחום"
                        className="rounded-full p-2 text-[#7a86a6] transition hover:bg-[#f1f5ff] hover:text-[#4f5ec2]"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <p className="mb-4 text-base font-bold text-[#485174]">תארים לבחירה</p>
                    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                      {choicesInPanel.map((choice) => (
                        <DegreeChoiceRow
                          key={choice.key}
                          choice={choice}
                          isSaved={choice.programIds.some((id) => savedSet.has(id))}
                          onToggle={() => onToggleProgramGroup(choice.programIds)}
                          compact
                        />
                      ))}
                    </div>

                    {selectedChoices.length > 5 ? (
                      <button
                        type="button"
                        onClick={() => setShowAllPrograms((value) => !value)}
                        className="mt-5 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[1rem] bg-[#785df2] px-5 text-sm font-bold text-white shadow-[0_18px_42px_rgba(116,88,233,0.28)] transition hover:bg-[#684ee1]"
                      >
                        <span>
                          {showAllPrograms
                            ? 'הצג פחות'
                            : `צפה בכל ${selectedChoices.length} התארים`}
                        </span>
                        <ChevronLeft size={18} />
                      </button>
                    ) : null}
                  </>
                ) : null}
              </aside>
            </div>

            <div className="mt-8 grid overflow-hidden rounded-[1.25rem] border border-white/82 bg-white/72 shadow-[0_18px_54px_rgba(105,133,190,0.11)] backdrop-blur-xl md:grid-cols-3">
              <InsightTile
                icon={Scale}
                title="השווה בין תארים"
                text="בחר עד 3 תארים להשוואה"
              />
              <InsightTile
                icon={Bookmark}
                title="שמור תארים שאהבת"
                text="צור רשימה אישית של תארים"
              />
              <InsightTile
                icon={Compass}
                title="לא בטוח? התחל בסקר"
                text="ענה על כמה שאלות ונמקד לך כיוון"
              />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {savedDegreeCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[390px] -translate-x-1/2 sm:w-auto"
          >
            <button
              type="button"
              onClick={onDone}
              aria-label={`סיימתי, המשך לבחירת מקום לימודים עבור ${savedDegreeCount} תארים`}
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full border border-white/80 bg-[#50d6ee] px-7 text-base font-bold text-[#1e4962] shadow-[0_18px_48px_rgba(48,167,205,0.32)] transition hover:bg-[#6ce8fb] hover:shadow-[0_20px_54px_rgba(48,167,205,0.38)] sm:w-auto"
            >
              <span>המשך לבחור איפה ללמוד</span>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/88 px-1.5 text-xs font-bold tabular-nums text-[#38607a] shadow-[inset_0_0_0_1px_rgba(83,168,201,0.26)]">
                {savedDegreeCount}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InsightTile({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#e4ebf8] px-5 py-4 last:border-b-0 md:border-b-0 md:border-l md:last:border-l-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8f8ff] text-[#5262d9]">
        <Icon size={22} strokeWidth={2.1} />
      </span>
      <span>
        <span className="block text-sm font-bold text-[#445274]">{title}</span>
        <span className="mt-1 block text-xs font-medium text-[#7a86a6]">{text}</span>
      </span>
    </div>
  );
}

function DegreeChoiceRow({
  choice,
  isSaved,
  onToggle,
  compact = false,
}: {
  choice: DegreeChoice;
  isSaved: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        'group flex items-start justify-between gap-3 rounded-[1rem] border border-[#e1e9f6] bg-white/74 shadow-[0_10px_28px_rgba(105,133,190,0.08)]',
        compact ? 'px-3 py-3' : 'px-4 py-3.5',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#354161]">{choice.name}</p>
        <div className="mt-2 rounded-[0.85rem] bg-[#f7faff]/86 px-3 py-2 ring-1 ring-[#e9eef9]">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-bold text-[#6574dc]">
            <Info size={13} strokeWidth={2.2} />
            <span>קצת על התואר</span>
          </div>
          <p
            className={[
              'mt-1 overflow-hidden text-xs font-medium leading-5 text-[#6f7a99] transition-[max-height] duration-300',
              compact
                ? 'max-h-10 group-hover:max-h-24 group-focus-within:max-h-24'
                : 'max-h-[3.75rem] group-hover:max-h-28 group-focus-within:max-h-28',
            ].join(' ')}
          >
            {choice.aboutText}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isSaved ? 'הסר מהבחירה' : 'הוסף לבחירה'}
        className={[
          'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition',
          isSaved
            ? 'border-[#99ddec] bg-[#dffbff] text-[#38607a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.76)] hover:bg-[#c9f7ff]'
            : 'border-[#dce6f6] bg-white/74 text-[#5f6c8f] hover:border-[#b9d3f2] hover:bg-white',
        ].join(' ')}
      >
        {isSaved ? (
          <>
            <Check size={13} />
            <span>נוסף</span>
          </>
        ) : (
          <>
            <Star size={13} />
            <span>שמור</span>
          </>
        )}
      </button>
    </div>
  );
}

function SearchResults({
  choices,
  savedSet,
  onToggleChoice,
  onClear,
}: {
  choices: DegreeChoice[];
  savedSet: Set<string>;
  onToggleChoice: (programIds: string[]) => void;
  onClear: () => void;
}) {
  if (choices.length === 0) {
    return (
      <div className="rounded-[15px] border border-dashed border-[#cfdbef] bg-white/74 px-6 py-12 text-center shadow-[0_16px_42px_rgba(105,133,190,0.1)] backdrop-blur-xl">
        <p className="mb-2 text-base font-bold text-[#485174]">לא נמצאו תארים תואמים</p>
        <p className="mb-4 text-sm font-medium text-[#7a86a6]">
          נסה חיפוש אחר או דפדף לפי קטגוריה.
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-bold text-[#6574dc] underline transition hover:text-[#4f5ec2]"
        >
          נקה חיפוש
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[15px] border border-[#dce6f6] bg-white/78 shadow-[0_16px_42px_rgba(105,133,190,0.12)] backdrop-blur-xl">
      <div className="border-b border-[#e5ecf8] px-5 py-3 text-sm font-medium text-[#7a86a6]">
        נמצאו <span className="font-bold text-[#485174]">{degreeCountLabel(choices.length)}</span>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        {choices.map((choice) => (
          <DegreeChoiceRow
            key={choice.key}
            choice={choice}
            isSaved={choice.programIds.some((id) => savedSet.has(id))}
            onToggle={() => onToggleChoice(choice.programIds)}
          />
        ))}
      </div>
    </div>
  );
}

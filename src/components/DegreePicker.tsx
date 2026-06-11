'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, Check, Plus, X } from 'lucide-react';
import type { Program } from '@/data/degrees/types';
import NeoButton from './NeoButton';

interface Props {
  allPrograms: Program[];
  savedProgramIds: string[];
  onToggleSave: (programId: string) => void;
  onDone: () => void;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[֑-ׇ]/g, '');
}

export default function DegreePicker({
  allPrograms,
  savedProgramIds,
  onToggleSave,
  onDone,
}: Props) {
  const [query, setQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const programsByCategory = useMemo(() => {
    const map = new Map<string, Program[]>();
    for (const p of allPrograms) {
      const cat = p.category?.trim() || 'אחר';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [allPrograms]);

  const categories = useMemo(
    () => Array.from(programsByCategory.keys()).sort((a, b) => a.localeCompare(b, 'he')),
    [programsByCategory],
  );

  const searchActive = query.trim().length > 0;
  const filtered = useMemo(() => {
    if (!searchActive) return [] as Program[];
    const q = normalize(query.trim());
    return allPrograms.filter((p) => {
      return (
        normalize(p.name).includes(q) ||
        normalize(p.institution).includes(q) ||
        normalize(p.category || '').includes(q)
      );
    });
  }, [searchActive, query, allPrograms]);

  const savedSet = useMemo(() => new Set(savedProgramIds), [savedProgramIds]);
  const savedCount = savedProgramIds.length;

  return (
    <div className="min-h-screen" style={{ background: '#f5f4f0' }}>
      <div className="mx-auto max-w-3xl px-4 py-10 pb-32 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-black text-slate-900 md:text-3xl">
            בחר את התארים שמעניינים אותך
          </h1>
          <p className="text-sm text-slate-600 md:text-base">
            חפש שם של תואר, או דפדף בין הקטגוריות. אפשר לבחור כמה שתרצה.
          </p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש תואר, מוסד או תחום…"
              className="h-12 w-full rounded-full border-2 border-black bg-white px-12 pr-12 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="נקה חיפוש"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {searchActive && (
          <SearchResults
            filtered={filtered}
            savedSet={savedSet}
            onToggleSave={onToggleSave}
            onClear={() => setQuery('')}
          />
        )}

        {!searchActive && (
          <div className="flex flex-col gap-3">
            {categories.map((cat) => {
              const programs = programsByCategory.get(cat) || [];
              const isOpen = expandedCategory === cat;
              const savedInCat = programs.filter((p) => savedSet.has(p.id)).length;

              return (
                <div
                  key={cat}
                  className="overflow-hidden rounded-2xl border-2 border-black bg-white transition"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isOpen ? null : cat)}
                    className="flex w-full items-center justify-between px-5 py-4 text-right transition hover:bg-slate-50"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronUp size={20} className="text-slate-500" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-500" />
                      )}
                      <span className="text-sm text-slate-500">
                        {programs.length} תארים
                        {savedInCat > 0 && (
                          <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-[#A6FAFF] px-2 py-0.5 text-xs font-bold text-slate-900">
                            <Check size={11} />
                            {savedInCat} נבחרו
                          </span>
                        )}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{cat}</h3>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="border-t border-slate-200 px-3 py-3">
                          <div className="flex flex-col divide-y divide-slate-100">
                            {programs.map((p) => (
                              <ProgramRow
                                key={p.id}
                                program={p}
                                isSaved={savedSet.has(p.id)}
                                onToggle={() => onToggleSave(p.id)}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {savedCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <NeoButton
              variant="cyan-filled"
              onClick={onDone}
              className="h-14 px-8 text-base shadow-[2px_2px_0px_rgba(0,0,0,1)]"
              ariaLabel={`סיימתי, תן לי להשוות בין ${savedCount} תארים`}
            >
              <span>סיימתי, תן לי להשוות</span>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-black bg-white px-1.5 text-xs font-bold tabular-nums">
                {savedCount}
              </span>
            </NeoButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgramRow({
  program,
  isSaved,
  onToggle,
}: {
  program: Program;
  isSaved: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{program.name}</p>
        <p className="truncate text-xs text-slate-500">{program.institution}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isSaved ? 'הסר מהבחירה' : 'הוסף לבחירה'}
        className={[
          'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border-2 border-black px-3 text-xs font-bold transition',
          isSaved
            ? 'bg-[#00E1EF] text-slate-900 hover:bg-[#79F7FF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
            : 'bg-white text-slate-900 hover:bg-[#A6FAFF] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
        ].join(' ')}
      >
        {isSaved ? (
          <>
            <Check size={13} />
            <span>נוסף</span>
          </>
        ) : (
          <>
            <Plus size={13} />
            <span>הוסף</span>
          </>
        )}
      </button>
    </div>
  );
}

function SearchResults({
  filtered,
  savedSet,
  onToggleSave,
  onClear,
}: {
  filtered: Program[];
  savedSet: Set<string>;
  onToggleSave: (id: string) => void;
  onClear: () => void;
}) {
  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="mb-2 text-base font-semibold text-slate-900">
          לא נמצאו תארים תואמים
        </p>
        <p className="mb-4 text-sm text-slate-500">נסה חיפוש אחר או דפדף לפי קטגוריה.</p>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-bold text-slate-900 underline transition hover:text-slate-700"
        >
          נקה חיפוש
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-black bg-white">
      <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
        נמצאו <span className="font-bold text-slate-900">{filtered.length}</span> תארים
      </div>
      <div className="flex flex-col divide-y divide-slate-100 px-3 py-2">
        {filtered.map((p) => (
          <ProgramRow
            key={p.id}
            program={p}
            isSaved={savedSet.has(p.id)}
            onToggle={() => onToggleSave(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

# Synthetic Bagrut PDF fixture

All identity and score data in `synthetic-corrupt.pdf` is invented. No real transcript was used. Regenerate with `npx tsx scripts/generate-bagrut-fixture.mts`.

The fully embedded Identity-H Noto Sans Hebrew font has a deliberately corrupted ToUnicode map: 4 and 5 map to 0, and ף maps to space. The original embedded TrueType cmap stays intact. The two-page layout includes final stars offset from row baselines, component rows, units, dates, hours, and an asterisk terminator.

`NotoSansHebrew.ttf` is the original variable font from Google Fonts, commit `6157dfaa640ca5738b4d1a7070fe389c3036d7fc`, path `ofl/notosanshebrew/NotoSansHebrew[wdth,wght].ttf`. `OFL.txt` is from the same directory and commit. Both are test-only and never imported by the app.


`synthetic-nine-starred.pdf` adds nine invented final subjects, including פיזיקה and a history alias. All nine must resolve through the manual-entry map, including the catalogue elective containing ף. It uses the same broken ToUnicode mapping and Ministry layout. `synthetic-nine-simple.pdf` uses the same nine invented subjects as simple unstarred subject/units/grade lines with an intact Unicode map. The generator creates all three PDFs.

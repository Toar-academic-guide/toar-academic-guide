"""Reconstructed University of Haifa admission score (סכם) model.
Every constant below is cited in FINDINGS.md to an official Haifa page or to a
response of Haifa's own calculator (applicants.haifa.ac.il/enrollmentChances)."""
from itertools import combinations
import math

# ---- Bagrut average (calculateBagrutAvg, diploma 001) ----------------------
MANDATORY = {"1","34","24","16","11","22","23","35","10","14","20"}   # getDiplomaCourses(001).mandatory
MATH = "35"
CORE25 = {"16","36","37","43","1","22","10","20","14"}  # english, physics, chemistry, biology, bible, history, literature, arabic(arab school), hebrew(arab school)
# other bonus subjects (+10 at 4u, +20 at 5u): official list on /score-calculation/; only codes we tested are listed
OTHER_BONUS_TESTED = {"57","899"}  # geography, computer science

def subject_bonus(code, units, grade, other_bonus=OTHER_BONUS_TESTED):
    if units < 4 or grade < 60: return 0
    if code == MATH: return 20 if units == 4 else 35
    if code in CORE25: return 20 if units == 4 else 25
    if code in other_bonus: return 10 if units == 4 else 20
    return 0

def round_half_up(x, nd=0):
    q = 10 ** nd
    return math.floor(x * q + 0.5 + 1e-9) / q

def bagrut_average(subjects):
    """subjects: list of (code, units, grade). Returns Haifa optimal average (2dp)."""
    rows = [(c, u, g + subject_bonus(c, u, g)) for c, u, g in subjects]
    mand = [r for r in rows if r[0] in MANDATORY]
    opt = [r for r in rows if r[0] not in MANDATORY]
    best = None
    for k in range(len(opt) + 1):
        for combo in combinations(opt, k):
            sel = mand + list(combo)
            units = sum(r[1] for r in sel)
            if units < 20: continue
            avg = sum(r[1] * r[2] for r in sel) / units
            best = avg if best is None or avg > best else best
    return None if best is None else round_half_up(best, 2)

# ---- Psychometric components ------------------------------------------------
def pm(q, v, e):
    """Mathematical-weighted psychometric (published: 0.514554*(6Q+4V+E)-65.3)."""
    return 0.514554 * (6 * q + 4 * v + e) - 65.3

# ---- Composite --------------------------------------------------------------
def bt(avg):
    """Bagrut standard score; published form BT = 10*B - 330 (B on a 0-12.5 scale -> avg/10)."""
    return 10 * avg - 330

RATIOS = {  # (bagrut weight, psychometric weight) for full-weight (<=6 years) and 7th-10th year
    "1:3": ((1, 3), (1, 7)), "3:7": ((3, 7), (3, 17)), "1:2": ((1, 2), (1, 5)), "1:1": ((1, 1), (1, 3)),
}

def composite(avg, psy, ratio, age_band="full"):
    """psy = PC (general) or PM (math-weighted) depending on programme."""
    (wb, wp) = RATIOS[ratio][0 if age_band == "full" else 1]
    if age_band == "expired":
        return psy
    return (wb * bt(avg) + wp * psy) / (wb + wp)

# ---- Observed calculator behaviour (2026-10-29, year=2026 / תשפ"ז) ------------
import math
def pm_int(q, v, e):
    """Calculator integerises PM by CEILING (22/22 bagrut-ignored probes; e.g. 714.25->715, 444.11->445)."""
    return math.ceil(pm(q, v, e) - 1e-9)

GROUP = {  # programme -> (psychometric kind, ratio)
    **{p: ("PM", "1:3") for p in ["accounting", "biology", "cs", "economics", "infosystems", "math", "statistics"]},
    **{p: ("PC", "1:3") for p in ["communication", "nursing", "occupational_therapy", "physiotherapy",
                                  "political_science", "psychology", "social_work", "sociology"]},
    "law": ("PC", "3:7"),
}

def age_band(bag_year, exam_year=2026):
    """Observed: bag_year >= exam_year-6 full; exam_year-10..exam_year-7 half; older ignored (2015 ignored for 2026)."""
    age = exam_year - int(bag_year)
    return "full" if age <= 6 else ("half" if age <= 10 else "expired")

def haifa_score(programme, bag_avg, bag_year, pc=None, q=None, v=None, e=None, exam_year=2026):
    """pc = NITE general score (what our users enter). PM needs domain scores."""
    kind, ratio = GROUP[programme]
    psy = pm_int(q, v, e) if kind == "PM" else pc
    return int(round_half_up(composite(bag_avg, psy, ratio, age_band(bag_year, exam_year))))

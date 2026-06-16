# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Academic Profile

### User Profile
The persistent store of a user's academic inputs (such as Bagrut weighted average, psychometric exam scores, and RIASEC assessment traits) and preferences (geographic location) used to compute admission thresholds and recommendations.
*Avoid:* Profile snapshot

### Saved Program
A relation linking a user's Profile to an Academic Program, representing their curated shortlist of interest.
*Avoid:* Selected degree, bucket list item

## Catalog

### Academic Program
A specific course of study offered by an institution (e.g., computer science, law) characterized by an admission type (sekhem-based or requirements-based), duration, and student capacity.
*Avoid:* Degree

### Institution
An academic entity (such as a university or college) that offers Programs and holds specific admission threshold guidelines and calculator configurations.
*Avoid:* University

### Admission Threshold
The minimum score (sekhem or direct psychometric) required by an Institution for admission into a Program.

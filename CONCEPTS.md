# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

## Academic Profile

### User Profile

The persistent store of a user's academic inputs (such as Bagrut weighted average, psychometric exam scores, and RIASEC assessment traits) and preferences (geographic location) used to compute admission thresholds and recommendations.
_Avoid:_ Profile snapshot

### Saved Program

A relation linking a user's Profile to an Academic Program, representing their curated shortlist of interest.
_Avoid:_ Selected degree, bucket list item

### Bucket List

The comparative queue showing all the user's Saved Programs, allowing them to track and compare their admission chances across different institutions in parallel.

## Catalog

### Academic Program

A specific course of study offered by an institution (e.g., computer science, law) characterized by an admission type (sekhem-based or requirements-based), duration, and student capacity.
_Avoid:_ Degree

### Institution

An academic entity (such as a university or college) that offers Programs and holds specific admission threshold guidelines and calculator configurations.
_Avoid:_ University

### Admission Threshold

The minimum score (sekhem or direct psychometric) required by an Institution for admission into a Program.

### Admission Requirement

An alternative admission path for programs that do not use a numeric Sekhem threshold, but require specific matriculation components, courses, or certificates.

### Admissions Source Candidate

A candidate URL or source reference for an Institution or Academic Program admission decision. The source keeps provenance such as board column, item update, catalogue URL, or manual entry, plus specificity and confidence.
_Avoid:_ Source URL when provenance matters

### Admission Fact

A concise reviewed admission datum that can affect a user-facing decision, such as a psychometric minimum, Bagrut average, required interview, open admission, explicit absence, or unknown requirement.
_Avoid:_ Scraped paragraph

### Admission Alternative Path

A non-primary path shown as a next action when direct admission is uncertain or blocked, such as a prep program, transfer path, prior-study admission, exceptions committee, special-population track, similar program, or lower-threshold institution.
_Avoid:_ Backup note

### Admissions Decision

The normalized product result for a user and program/institution pair. It always contains status, explanation, missing gap, and best next action, with confidence and source context attached.
_Avoid:_ Eligibility note

## Admission Metrics

### Sekhem (סכם)

A weighted composite score calculated differently by each university (combining Bagrut average and Psychometric scores) to determine a candidate's academic eligibility.

### Psychometric Exam (פסיכומטרי)

The standardized entrance exam used in Israel to evaluate quantitative, verbal, and English capabilities.

### Bagrut Matriculation (בגרות)

The Israeli matriculation certificate consisting of various subject units, which serves as a prerequisite for university admission.

## Guidance & Personal Assessment

### RIASEC

A career interest framework (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) used in the assessment screen to align user personality traits with program recommendations.

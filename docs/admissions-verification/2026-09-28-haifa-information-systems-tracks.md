# Haifa Information Systems track verification — 2026-09-28

Scope: the standard score route for six explicitly selected tracks, 2026–2027. Ordinary single-major remains unverified; no automatic replacement and no change to its completion-ledger state.

## Official identities

Both the [calculator programme list](https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet?operation=getProgramForHug&year=2026&semester=001&hug=SC0026) and [registration programme list](https://applicants.haifa.ac.il/adm/AdmissionServlet?operation=getPrograms&degreeCode=1000&degreeFilter=&disciplineCode=SC0026&acadYear=2026&semester=001) returned these six identities under SC0026. Timestamped responses and receipt hashes are in the adjacent JSON.

| Track | Official ID | Academic code | Second department confirmation |
|---|---|---|---|
| Dual-major B.A. | 52256695 | 214101-26-01 | Required |
| Statistics | 52256697 | 214101-26-04 | Required |
| Marine sciences | 52256693 | 214102-26-09 | No |
| Neuroscience | 52256692 | 214102-26-08 | No |
| Computer science | 52256696 | 214101-26-02 | Required |
| Mathematics B.Sc. | 52256699 | 214101-26-10 | Required |

The naval cohort 52328341 is outside this generic selector. Ordinary single-major code 214102-26-01 remains in the [current yearbook](https://shnaton2027.haifa.ac.il/wp-json/wp/v2/posts/1286), but configured calculator ID 52256686 is absent from both current lists. A numeric response with an empty programme name does not resolve that identity.

## Score and requirements

Twelve independently captured synthetic requests (high/low for each track) returned 806/493, acceptance 680, rejection 649. MyWay's controlled live replay reproduced all six pairs, including eligible-to-apply/below verdicts. The [programme requirements](https://admissions.haifa.ac.il/computer-information-science/program/3218/) remain required: recognized qualification, maths 4 units/80 or 5 units/70, English pre-basic or above, Hebrew 120 or recognized exemption, and actual examination years/session. Scores are checked for the Information Systems side; applicants confirm partner-department requirements separately. This does not independently calculate partner eligibility or promise final admission. Alternative admission routes are outside this approved change.

## Browser verification and activation

Local database mode used the six actual live proofs through the existing source-freshness persistence path. The browser restored the saved track, displayed 806 against 680, requested the partner answer for combined degrees, cleared that answer on track changes, and withheld ordinary single-major eligibility. Production data and settings were not changed.

To repeat: open the landing calculator, select Information Systems at Haifa, and calculate. Choose a track above the results. With a matching profile containing the official average, actual exam years/components and programme requirements, the high synthetic example (average 120, years 2026, all components 150, April exam, full Bagrut, maths 5/100 and Hebrew-school exemption) produces 806/680. Combined tracks require the partner answer. Ordinary single-major displays the unverified mapping message.

After merge, refresh the six new `haifa-infosystems-*-live` targets through the existing admissions freshness command before claiming production numeric activation. Each selected route requires its own matching reviewed fingerprint; missing freshness stays unavailable. No new PR or workflow is needed for that refresh. The broader Plan 002 remains unfinished while its outstanding required mappings remain unresolved.

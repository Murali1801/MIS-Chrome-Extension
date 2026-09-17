# Attendance Enhancer

A Chrome extension for `mis.aldel.lan` that turns the college's bare attendance
tables into something you can plan around: exact "how many more must I attend",
"how many can I skip", date-range recalculation, a planner and an absence log.
It also keeps the auto-login and credential manager that were already there.

## Install

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** and pick this folder.
3. Open the MIS attendance page. Settings live in the toolbar popup.

## What it adds to the attendance page

Everything lives on the attendance page itself. The toolbar popup keeps only
what it always had: the credential manager, the start-date field and the three
feature switches.

| Panel | What it gives you |
|---|---|
| Native tables | Three extra columns — need for target, can skip, status — plus a corrected percentage and a Total row for practicals (the page ships without one) |
| Attendance settings | The target percentage, the date window and which panels appear. Changing any of them re-renders the page in place, including the extra columns on the college's own tables. Remembered between visits. |
| Overview | Combined / theory / practical standing and a list of subjects that need attention |
| Subject breakdown | Every subject in one sortable table |
| Calculator | Step the conducted and attended counts up or down, or simulate attending/missing lectures, and watch the target maths update live |
| Semester planner | Enter the weeks of teaching left; per-subject estimates of how many lectures remain, how many you must attend, and best/worst final percentages |
| Selected date range | Recomputes everything from the detailed itinerary between two dates |
| Absence log | Every missed slot, grouped by subject, with dates |
| Trends | Month-by-month and weekday breakdowns |
| Export | CSV of every table plus the absence log |

The attendance target defaults to 75% and every figure on the page is derived
from it, so a college on 60% or 80% needs one change in the settings panel.

## Accuracy

The counts are derived from the itinerary the same way the college computes
them, which was verified against the captured pages in this repo: parsing
`itenary_attendance.html` reproduces every theory figure on `attendance.html`
exactly (TCS 36/35, SC 39/36, AIML 43/42, CSS 36/34, BMM 36/31), and the SC and
TCS practical figures too.

Two caveats that are properties of the MIS data, not of the extension:

- The itinerary contains subjects the summary table omits (MDS in the sample),
  so range totals can include subjects the official page does not count.
- A practical session whose marks a teacher has not posted yet shows in the
  itinerary but not in the summary, so the two can differ by a session.

### Fixes over the previous version

- **Threshold maths is exact.** The old code hardcoded
  `Math.ceil((0.75 * total - attended) / 0.25)`. That works only for 75%, where
  the constants happen to be exact binary fractions; at 60%, 80% or 72.5% the
  float quotient can land on `12.000000000000002` and cost a whole lecture. All
  arithmetic is now integer-only over a fixed scale, so any target with up to
  two decimals is exact.
- **Threshold comparison is exact.** A true 74.999% used to be rounded to
  "75.00" and shown as a pass. The pass/fail test now cross-multiplies.
- **Year inference across a semester boundary.** The old code took the first
  four-digit number in the report title and stamped it on every row, so a
  semester running Dec 2025 → Apr 2026 dated every January row a year early.
  Years now advance on month rollover and are cross-checked against the weekday
  the report prints beside each date.
- **Explicit date parsing.** `new Date('16-Jun-2025')` is not a format any
  engine is required to accept; month names are now mapped directly.
- **Table selection by content.** The summary tables were picked by index
  (`tables[1]`, `tables[2]`) and the itinerary grid by `table:last-of-type`,
  which returns the first element that is last-of-type among its own siblings —
  not necessarily the grid. Both are now found by their headers.
- **Wider absence detection.** Only a case-sensitive inline
  `style` containing `#FFB2B2` counted; `bgcolor`, lowercase and class markers
  are recognised now.
- **Graceful failure.** A missing itinerary, a missing report header or a page
  with no tables previously threw; each is now handled and reported in place.
- **Separate weekly rates.** Theory and practical rates no longer collide on
  subject name, which had the planner applying the practical rate to lectures.
- **Host CSS bleed.** The injected form controls are scoped under `#ae-root`
  and set their properties explicitly, because the MIS loads Bootstrap 3 and
  AdminLTE, whose `label` and `input` rules otherwise won on specificity and
  stretched the panel checkboxes to the width of a text field.

## Layout

| File | Role |
|---|---|
| `attendance-math.js` | Exact integer attendance arithmetic. No DOM. |
| `attendance-parse.js` | Itinerary parsing and aggregation. One thin DOM helper; the rest is pure. |
| `content.js` | Everything rendered onto the attendance page, including its settings panel. |
| `popup.html` / `popup.js` | Credential manager, start date and the three feature switches. |
| `background.js` | Storage, defaults and credential messaging. |
| `enhancer.css` | Styles for the injected UI, all `.ae-` prefixed. |

`view_stud_attendance.php`, `attendance.html`, `itenary_attendance.html` and
`itinenary_attendance_report.php` are captured MIS pages kept as test fixtures.

## Tests

```bash
node tests/attendance-math.test.js
```

Checks the closed-form required/bunk formulas against an exhaustive brute-force
search over every `(total, attended)` pair for fourteen thresholds — roughly
350,000 assertions — and confirms each answer is minimal or maximal, that the
percentages match the captured pages digit for digit, and that malformed input
is absorbed.

```bash
node tests/attendance-parse.test.js
```

Parses the real captures and checks they reproduce the official summary, covers
the year-rollover cases, date-range filtering, absence detection and malformed
documents.

### Browser harnesses

For the parts that need a DOM:

```bash
python -m http.server 8777
```

- `http://localhost:8777/tests/harness.html` runs the real `content.js` against
  the captured attendance page with the extension APIs stubbed. It also
  replicates the Bootstrap rules the MIS loads, so host-CSS bleed shows up here
  rather than in production. The target and date range are driven from the
  page's own settings panel; query parameters seed the starting state
  (`?threshold=90`, `?start=2025-07-01&end=2025-07-31`) or force the failure
  paths (`?itinerary=none`, `?summary=missing`).
- `http://localhost:8777/tests/popup-harness.html` renders the popup with
  storage stubbed, and fails loudly if a page-only control has leaked back into
  it.

Both print what they rendered and flag uncaught errors.

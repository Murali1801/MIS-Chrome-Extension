/**
 * Verification of attendance-parse.js against the real MIS captures in this
 * repo, plus targeted cases for the year-rollover bug.
 *
 * Run with:  node tests/attendance-parse.test.js
 *
 * The itinerary HTML is reduced to plain rows with a small regex reader so the
 * test needs no DOM library; the pure logic under test (date resolution, slot
 * parsing, aggregation) is exactly what runs in the browser.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const P = require('../attendance-parse.js');
const M = require('../attendance-math.js');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) passed++;
    else { failed++; console.error('  FAIL  ' + name + (detail ? '  ->  ' + detail : '')); }
}

function eq(name, actual, expected) {
    check(name, actual === expected, 'got ' + JSON.stringify(actual) + ' expected ' + JSON.stringify(expected));
}

/** Minimal stand-in for extractItineraryRows, reading the grid out of raw HTML. */
function readItinerary(file) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

    const tableChunks = html.split(/<table[^>]*>/i).slice(1);
    let grid = null;
    let title = '';
    for (const chunk of tableChunks) {
        const body = chunk.split(/<\/table>/i)[0];
        if (/<th[^>]*>\s*Date\s*<\/th>/i.test(body) && /Slot/i.test(body)) grid = body;
        else if (/Report\s*From/i.test(body)) title = body.replace(/<[^>]*>/g, ' ');
    }
    if (!grid) throw new Error('no grid found in ' + file);

    const rows = [];
    for (const rowMatch of grid.split(/<tr[^>]*>/i)) {
        const cells = [...rowMatch.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)].map((m) => ({
            attrs: m[1],
            text: m[2].replace(/<[^>]*>/g, '').trim()
        }));
        if (cells.length < 2 || !cells[0].text) continue;
        rows.push({
            dateText: cells[0].text,
            slots: cells.slice(1).map((c) => ({
                text: c.text,
                absent: P.isAbsentMarkup(
                    (/style="([^"]*)"/i.exec(c.attrs) || [])[1],
                    (/bgcolor="([^"]*)"/i.exec(c.attrs) || [])[1],
                    (/class="([^"]*)"/i.exec(c.attrs) || [])[1]
                )
            }))
        });
    }
    return { rows, title };
}

// ---------------------------------------------------------------------------
console.log('\n1. Slot parsing');
// ---------------------------------------------------------------------------
eq('theory subject', P.parseSlot('Vidya :TCS :T ').subject, 'TCS');
eq('theory type', P.parseSlot('Vidya :TCS :T ').type, 'T');
eq('theory is not practical', P.parseSlot('Vidya :TCS :T ').isPractical, false);
eq('practical detected', P.parseSlot('Deepika :AIML :P1 ').isPractical, true);
eq('practical subject', P.parseSlot('Deepika :AIML :P1 ').subject, 'AIML');
eq('bare P detected', P.parseSlot('X :SUB :P').isPractical, true);
eq('PR detected', P.parseSlot('X :SUB :PR2').isPractical, true);
check('empty slot rejected', P.parseSlot('::') === null);
check('blank rejected', P.parseSlot('   ') === null);
check('undefined rejected', P.parseSlot(undefined) === null);
check('single colon rejected', P.parseSlot('only:one') === null);
// A colon in a teacher name must not shift subject/type.
eq('colon-safe subject', P.parseSlot('Dr :CSS :T').subject, 'CSS');

// ---------------------------------------------------------------------------
console.log('\n2. Absence marker detection');
// ---------------------------------------------------------------------------
check('canonical pink', P.isAbsentMarkup('background-color:#FFB2B2;', null, null) === true);
check('lowercase pink', P.isAbsentMarkup('background-color:#ffb2b2;', null, null) === true);
check('spaced pink', P.isAbsentMarkup('background-color: #FFB2B2', null, null) === true);
check('bgcolor attribute', P.isAbsentMarkup(null, '#FFB2B2', null) === true);
check('bgcolor without hash', P.isAbsentMarkup(null, 'FFB2B2', null) === true);
check('class marker', P.isAbsentMarkup(null, null, 'cell absent') === true);
check('present cell', P.isAbsentMarkup('text-align:center;', null, null) === false);
check('no attributes', P.isAbsentMarkup(null, null, null) === false);
check('unrelated colour', P.isAbsentMarkup('background-color:#00FF00;', null, null) === false);

// ---------------------------------------------------------------------------
console.log('\n3. Report range parsing');
// ---------------------------------------------------------------------------
const range = P.parseReportRange('Report From 16-Jun-2025 To 20-Sep-2025');
check('range found', range !== null);
eq('range start year', range.start.getFullYear(), 2025);
eq('range start month', range.start.getMonth(), 5);
eq('range start day', range.start.getDate(), 16);
eq('range end month', range.end.getMonth(), 8);
eq('range end day', range.end.getDate(), 20);
check('missing range returns null', P.parseReportRange('No dates here') === null);
check('empty input returns null', P.parseReportRange('') === null);
check('undefined input returns null', P.parseReportRange(undefined) === null);

// ---------------------------------------------------------------------------
console.log('\n4. Year rollover - the bug the old code had');
// ---------------------------------------------------------------------------
// An even-semester report running Dec 2025 -> Apr 2026. The old code stamped
// every row with the first year in the title (2025), so January onwards was
// dated a full year early.
const crossYear = P.resolveDates([
    { dateText: '15-Dec Mon', slots: [] },
    { dateText: '29-Dec Mon', slots: [] },
    { dateText: '05-Jan Mon', slots: [] },
    { dateText: '12-Feb Thu', slots: [] },
    { dateText: '10-Apr Fri', slots: [] }
], 2025);
eq('rows kept across rollover', crossYear.length, 5);
eq('Dec stays 2025', crossYear[0].date.getFullYear(), 2025);
eq('Dec 29 stays 2025', crossYear[1].date.getFullYear(), 2025);
eq('Jan rolls to 2026', crossYear[2].date.getFullYear(), 2026);
eq('Feb stays 2026', crossYear[3].date.getFullYear(), 2026);
eq('Apr stays 2026', crossYear[4].date.getFullYear(), 2026);
check('dates strictly ascending',
    crossYear.every((r, i) => i === 0 || r.date >= crossYear[i - 1].date));

// The printed weekday corrects a wrong seed year.
const weekdayFix = P.resolveDates([{ dateText: '16-Jun Mon', slots: [] }], 2024);
eq('weekday pins the year', weekdayFix[0].date.getFullYear(), 2025);
eq('weekday matches label', weekdayFix[0].date.getDay(), 1);

// An explicit year in the cell wins outright.
const explicit = P.resolveDates([{ dateText: '01-Mar-2027 Mon', slots: [] }], 2025);
eq('explicit year honoured', explicit[0].date.getFullYear(), 2027);

// Garbage rows are dropped, not turned into Invalid Date.
const junk = P.resolveDates([
    { dateText: '', slots: [] },
    { dateText: 'Total', slots: [] },
    { dateText: '99-Zzz Xyz', slots: [] },
    { dateText: '16-Jun Mon', slots: [] }
], 2025);
eq('only the valid row survives', junk.length, 1);

// ---------------------------------------------------------------------------
console.log('\n5. Real itinerary reproduces the official summary');
// ---------------------------------------------------------------------------
// itenary_attendance.html is the capture that carries absence shading, and
// attendance.html is the matching official summary for the same student.
const itinerary = readItinerary('itenary_attendance.html');
check('grid rows found', itinerary.rows.length > 50, String(itinerary.rows.length));
check('report title found', /Report\s*From/i.test(itinerary.title));

const seedYear = P.parseReportRange(itinerary.title).start.getFullYear();
eq('seed year from header', seedYear, 2025);

const built = P.buildFromItinerary(itinerary.rows, { seedYear });
eq('every grid row resolved', built.meta.unresolvedRows, 0);

// Theory figures printed on attendance.html, keyed by the itinerary's
// abbreviations. MDS appears in the timetable but not in the official table.
const officialTheory = { TCS: [36, 35], SC: [39, 36], AIML: [43, 42], CSS: [36, 34], BMM: [36, 31] };
for (const subject of Object.keys(officialTheory)) {
    const [total, attended] = officialTheory[subject];
    const got = built.theory[subject];
    check('theory ' + subject + ' present', !!got);
    if (got) {
        eq('theory ' + subject + ' total', got.total, total);
        eq('theory ' + subject + ' attended', got.attended, attended);
    }
}
// Practicals: SC and TCS match the official page exactly. AIML and CSS each
// carry one extra two-slot session that the summary page had not yet posted,
// so the parser is checked against the timetable itself rather than the summary.
const officialPractical = { SC: [20, 16], TCS: [9, 9] };
for (const subject of Object.keys(officialPractical)) {
    const [total, attended] = officialPractical[subject];
    eq('practical ' + subject + ' total', built.practical[subject].total, total);
    eq('practical ' + subject + ' attended', built.practical[subject].attended, attended);
}
eq('practical AIML total (timetable)', built.practical.AIML.total, 22);
eq('practical CSS total (timetable)', built.practical.CSS.total, 12);

// Percentages must match the page to the digit.
eq('TCS theory pct', M.formatPct(M.percentage(35, 36)), '97.22');
eq('BMM theory pct', M.formatPct(M.percentage(31, 36)), '86.11');

// Absences were actually detected - a parser that saw none would silently
// report 100% everywhere.
check('absences detected', built.absences.length > 0, String(built.absences.length));
eq('absences equal missed slots',
    built.absences.length,
    P.totals(built.theory).total - P.totals(built.theory).attended +
    P.totals(built.practical).total - P.totals(built.practical).attended);

// Every absence must name a real subject and carry a usable date.
check('absences well formed', built.absences.every((a) =>
    a.subject && a.iso && /^\d{4}-\d{2}-\d{2}$/.test(a.iso) && a.date instanceof Date));

// ---------------------------------------------------------------------------
console.log('\n6. Date-range filtering');
// ---------------------------------------------------------------------------
const all = P.buildFromItinerary(itinerary.rows, { seedYear });
const fromJuly = P.buildFromItinerary(itinerary.rows, { seedYear, startDate: '2025-07-01' });
const julyOnly = P.buildFromItinerary(itinerary.rows, {
    seedYear, startDate: '2025-07-01', endDate: '2025-07-31'
});

check('start filter reduces the count',
    fromJuly.meta.sessionsInRange < all.meta.sessionsInRange,
    fromJuly.meta.sessionsInRange + ' vs ' + all.meta.sessionsInRange);
check('end filter reduces it further',
    julyOnly.meta.sessionsInRange < fromJuly.meta.sessionsInRange,
    julyOnly.meta.sessionsInRange + ' vs ' + fromJuly.meta.sessionsInRange);
check('july window starts in july',
    julyOnly.meta.firstDate.getMonth() === 6 && julyOnly.meta.firstDate.getFullYear() === 2025,
    String(julyOnly.meta.firstDate));
check('july window ends in july',
    julyOnly.meta.lastDate.getMonth() === 6,
    String(julyOnly.meta.lastDate));
check('all monthly keys inside july',
    Object.keys(julyOnly.monthly).every((k) => k === '2025-07'),
    Object.keys(julyOnly.monthly).join(','));

// Boundary dates are inclusive on both ends.
const singleDay = P.buildFromItinerary(itinerary.rows, {
    seedYear, startDate: '2025-06-16', endDate: '2025-06-16'
});
check('single-day window is inclusive', singleDay.meta.sessionsInRange > 0,
    String(singleDay.meta.sessionsInRange));
eq('single-day window has one date',
    P.toISODate(singleDay.meta.firstDate), '2025-06-16');
eq('single-day first equals last',
    P.toISODate(singleDay.meta.firstDate), P.toISODate(singleDay.meta.lastDate));

// A window before the semester yields nothing rather than throwing.
const empty = P.buildFromItinerary(itinerary.rows, {
    seedYear, startDate: '2024-01-01', endDate: '2024-02-01'
});
eq('empty window has no sessions', empty.meta.sessionsInRange, 0);
eq('empty window has no subjects', Object.keys(empty.theory).length, 0);
check('empty window has no dates', empty.meta.firstDate === null);

// Filtered slices must never exceed the unfiltered whole.
for (const subject of Object.keys(fromJuly.theory)) {
    check('slice <= whole for ' + subject,
        fromJuly.theory[subject].total <= all.theory[subject].total);
}

// ---------------------------------------------------------------------------
console.log('\n7. Monthly and weekday breakdowns are internally consistent');
// ---------------------------------------------------------------------------
const monthlySum = Object.values(all.monthly)
    .reduce((a, m) => ({ total: a.total + m.total, attended: a.attended + m.attended }),
            { total: 0, attended: 0 });
const bucketSum = {
    total: P.totals(all.theory).total + P.totals(all.practical).total,
    attended: P.totals(all.theory).attended + P.totals(all.practical).attended
};
eq('monthly totals reconcile', monthlySum.total, bucketSum.total);
eq('monthly attended reconcile', monthlySum.attended, bucketSum.attended);
eq('sessions counted once', all.meta.sessionsInRange, bucketSum.total);

const weekdaySum = Object.values(all.weekday)
    .reduce((a, d) => ({ total: a.total + d.total, attended: a.attended + d.attended }),
            { total: 0, attended: 0 });
eq('weekday totals reconcile', weekdaySum.total, bucketSum.total);
eq('weekday attended reconcile', weekdaySum.attended, bucketSum.attended);
check('no sunday lectures', !(0 in all.weekday) || all.weekday[0].total === 0);
check('attended never exceeds total per month',
    Object.values(all.monthly).every((m) => m.attended <= m.total));

// ---------------------------------------------------------------------------
console.log('\n8. The second capture parses too');
// ---------------------------------------------------------------------------
// itinenary_attendance_report.php is a different snapshot with no absence
// shading at all - a good check that "no absences" is handled as 100% rather
// than as a parse failure.
const alt = readItinerary('itinenary_attendance_report.php');
const altBuilt = P.buildFromItinerary(alt.rows, {
    seedYear: P.parseReportRange(alt.title).start.getFullYear()
});
check('alt capture resolved cleanly', altBuilt.meta.unresolvedRows === 0,
    String(altBuilt.meta.unresolvedRows));
check('alt capture has subjects', Object.keys(altBuilt.theory).length >= 5,
    Object.keys(altBuilt.theory).join(','));
eq('alt capture has no absences', altBuilt.absences.length, 0);
check('alt capture is fully attended',
    Object.values(altBuilt.theory).every((s) => s.attended === s.total));

// ---------------------------------------------------------------------------
console.log('\n9. Abbreviation to full-name matching');
// ---------------------------------------------------------------------------
const fullNames = [
    'Theoretical Computer Science',
    'Soft Computing',
    'AI and Machine  Learning',
    'Cryptography and System Security',
    'Basics of Marketing Management'
];
const nameMap = P.matchSubjectNames(['TCS', 'SC', 'AIML', 'CSS', 'BMM', 'MDS'], fullNames);
eq('TCS maps', nameMap.TCS, 'Theoretical Computer Science');
eq('SC maps', nameMap.SC, 'Soft Computing');
eq('AIML maps', nameMap.AIML, 'AI and Machine  Learning');
eq('CSS maps', nameMap.CSS, 'Cryptography and System Security');
eq('BMM maps', nameMap.BMM, 'Basics of Marketing Management');
check('unknown abbreviation is left alone', !('MDS' in nameMap));
check('no full name is claimed twice',
    new Set(Object.values(nameMap)).size === Object.values(nameMap).length);
check('empty inputs are safe', Object.keys(P.matchSubjectNames([], [])).length === 0);

// Weekly rates should be plausible for the real capture.
const rates = P.weeklyRates(all.theory, all.meta.firstDate, all.meta.lastDate);
check('rate computed for every theory subject',
    Object.keys(all.theory).every((s) => typeof rates[s] === 'number' && rates[s] > 0));
check('rates are in a sane range',
    Object.values(rates).every((r) => r > 0 && r < 15),
    JSON.stringify(rates));
check('no dates -> no rates', Object.keys(P.weeklyRates(all.theory, null, null)).length === 0);

// ---------------------------------------------------------------------------
console.log('\n10. Malformed documents degrade gracefully');
// ---------------------------------------------------------------------------
const none = P.buildFromItinerary([], {});
eq('no rows -> no sessions', none.meta.sessionsInRange, 0);
check('no rows -> empty buckets',
    Object.keys(none.theory).length === 0 && Object.keys(none.practical).length === 0);
const ragged = P.buildFromItinerary([
    { dateText: '16-Jun Mon', slots: [{ text: '::' }, { text: 'A :X :T', absent: false }] },
    { dateText: 'junk', slots: [{ text: 'A :Y :T', absent: false }] },
    { dateText: '17-Jun Tue', slots: [] }
], { seedYear: 2025 });
eq('ragged input counts only valid slots', ragged.meta.sessionsInRange, 1);
eq('ragged input keeps the good subject', ragged.theory.X.total, 1);
check('ragged input drops the junk row', !('Y' in ragged.theory));

// ---------------------------------------------------------------------------
console.log('\n' + (failed === 0 ? 'ALL PASSED' : 'FAILURES PRESENT'));
console.log('  passed: ' + passed.toLocaleString());
console.log('  failed: ' + failed.toLocaleString() + '\n');
process.exit(failed === 0 ? 0 : 1);

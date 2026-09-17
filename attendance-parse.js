/**
 * attendance-parse.js
 * -------------------
 * Turns the MIS itinerary report into per-subject attendance figures.
 *
 * The DOM-touching part is deliberately tiny (`extractItineraryRows`) so that
 * everything with actual logic in it - date resolution, filtering, aggregation -
 * is a pure function that can be exercised by the test suite.
 *
 * FIXES OVER THE PREVIOUS INLINE IMPLEMENTATION
 *  1. Year inference. The old code took the first 4-digit number in the report
 *     title and stamped it on every row, so a semester running Dec 2025 -> Apr
 *     2026 dated every January row to 2025 and silently dropped or mis-ordered
 *     it. Years are now advanced on month rollover and cross-checked against the
 *     weekday the report itself prints next to each date.
 *  2. Date parsing. `new Date('16-Jun-2025')` is not a format the spec requires
 *     any engine to accept; month names are now mapped explicitly.
 *  3. Table selection. `table:last-of-type` returns the first element that is
 *     last-of-type among its own siblings, which is not necessarily the grid.
 *     The grid is now found by looking for a Date header.
 *  4. Absence detection. Only a case-sensitive inline `style` containing
 *     #FFB2B2 counted before; `bgcolor`, shorthand hex and class markers are
 *     now recognised too.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AttendanceParse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const MONTHS = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const WEEKDAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

    /**
     * Cell shadings the MIS uses to mark an absence. #FFB2B2 is the pink the
     * report ships today; the others are kept so a palette tweak upstream does
     * not silently turn every absence into a present.
     */
    const ABSENT_MARKERS = ['ffb2b2', 'ffb2b2', 'fbb', 'ff9999', 'ffcccc', 'ffcccb'];

    function parseMonth(token) {
        if (!token) return -1;
        const key = String(token).trim().slice(0, 3).toLowerCase();
        return key in MONTHS ? MONTHS[key] : -1;
    }

    /** 'YYYY-MM-DD' -> local-midnight Date. Returns null for anything else. */
    function parseISODate(value) {
        if (!value) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
        if (!m) return null;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    function toISODate(date) {
        if (!date) return '';
        const p = (n) => String(n).padStart(2, '0');
        return date.getFullYear() + '-' + p(date.getMonth() + 1) + '-' + p(date.getDate());
    }

    function formatDayMonth(date) {
        return String(date.getDate()).padStart(2, '0') + '-' + MONTH_NAMES[date.getMonth()];
    }

    /**
     * Pulls the reporting window out of a title such as
     *   "Report From 16-Jun-2025 To 20-Sep-2025"
     * Returns null rather than throwing when the header is missing or reworded,
     * which the previous code did not survive.
     */
    function parseReportRange(titleText) {
        if (!titleText) return null;
        const re = /(\d{1,2})\s*[-\/\s]\s*([A-Za-z]{3,9})\s*[-\/\s]\s*(\d{4})/g;
        const found = [];
        let m;
        while ((m = re.exec(titleText)) !== null) {
            const month = parseMonth(m[2]);
            if (month < 0) continue;
            found.push(new Date(Number(m[3]), month, Number(m[1])));
        }
        if (!found.length) return null;
        return { start: found[0], end: found.length > 1 ? found[found.length - 1] : null };
    }

    /**
     * Resolves the bare "16-Jun Mon" labels in the grid to real dates.
     *
     * Two independent signals are combined:
     *   - chronological order (the grid is printed oldest first, so a month
     *     number going backwards means the year rolled over), and
     *   - the weekday the report prints itself, which pins the year down.
     *
     * `seedYear` comes from the report header when available.
     */
    function resolveDates(rows, seedYear) {
        let year = Number(seedYear);
        if (!isFinite(year)) year = new Date().getFullYear();

        let prevMonth = -1;
        let prevTime = -Infinity;
        const out = [];

        for (const row of rows) {
            const parsed = /^\s*(\d{1,2})\s*[-\/\s]\s*([A-Za-z]{3,9})\s*(?:[-\/\s]\s*(\d{4}))?\s*,?\s*([A-Za-z]{3,9})?/
                .exec(row.dateText || '');
            if (!parsed) continue;

            const day = Number(parsed[1]);
            const month = parseMonth(parsed[2]);
            if (month < 0 || !(day >= 1 && day <= 31)) continue;

            const explicitYear = parsed[3] ? Number(parsed[3]) : null;
            const weekdayLabel = parsed[4] ? WEEKDAYS[parsed[4].slice(0, 3).toLowerCase()] : undefined;

            let resolvedYear;
            if (explicitYear) {
                resolvedYear = explicitYear;
            } else {
                // Month going backwards means we crossed into the next year.
                if (prevMonth >= 0 && month < prevMonth) year++;
                resolvedYear = year;

                // The printed weekday is the authority. If it disagrees, try the
                // neighbouring years and take the first that both matches the
                // weekday and does not travel backwards in time.
                if (weekdayLabel !== undefined &&
                    new Date(resolvedYear, month, day).getDay() !== weekdayLabel) {
                    for (const candidate of [resolvedYear + 1, resolvedYear - 1,
                                             resolvedYear + 2, resolvedYear - 2]) {
                        const probe = new Date(candidate, month, day);
                        if (probe.getDay() === weekdayLabel && probe.getTime() >= prevTime) {
                            resolvedYear = candidate;
                            break;
                        }
                    }
                }
            }

            const date = new Date(resolvedYear, month, day);
            if (isNaN(date.getTime())) continue;
            // Guard against a stray label sending the walk backwards.
            if (date.getTime() < prevTime) continue;

            year = resolvedYear;
            prevMonth = month;
            prevTime = date.getTime();
            out.push(Object.assign({}, row, { date }));
        }
        return out;
    }

    /**
     * Splits a timetable cell such as "Deepika :AIML :P1" into its parts.
     * A regex is used instead of split(':') so a colon inside a teacher name
     * cannot shift the subject and type by one field.
     */
    function parseSlot(text) {
        if (!text) return null;
        const raw = String(text).trim();
        if (!raw || raw === '::' || /^:+$/.test(raw)) return null;

        const m = /^([^:]*):([^:]*):(.*)$/.exec(raw);
        if (!m) return null;

        const subject = m[2].trim();
        const type = m[3].trim();
        if (!subject || !type) return null;

        return {
            teacher: m[1].trim(),
            subject,
            type,
            // P, P1, P2, PR ... are practicals; everything else is theory.
            isPractical: /^p/i.test(type)
        };
    }

    /** True when a cell's markup carries one of the known absence shadings. */
    function isAbsentMarkup(styleAttr, bgcolorAttr, classAttr) {
        const hay = ((styleAttr || '') + ' ' + (bgcolorAttr || '') + ' ' + (classAttr || ''))
            .toLowerCase().replace(/\s+/g, '');
        if (/absent/.test(hay)) return true;
        return ABSENT_MARKERS.some((marker) => hay.includes(marker));
    }

    // -----------------------------------------------------------------------
    // DOM extraction - the only browser-dependent part.
    // -----------------------------------------------------------------------

    /**
     * Finds the timetable grid in a parsed itinerary document and returns plain
     * rows. The grid is identified by its header rather than by position.
     */
    function extractItineraryRows(doc) {
        const tables = Array.from(doc.querySelectorAll('table'));
        let grid = null;

        for (const table of tables) {
            const headerText = (table.querySelector('tr') || { textContent: '' })
                .textContent.toLowerCase();
            if (/date/.test(headerText) && /slot/.test(headerText)) { grid = table; break; }
        }
        // Fall back to the widest table, which is the grid in every sample seen.
        if (!grid && tables.length) {
            grid = tables.reduce((best, t) => {
                const cols = t.querySelectorAll('tr') .length
                    ? (t.querySelector('tr').children || []).length : 0;
                const bestCols = best && best.querySelector('tr')
                    ? (best.querySelector('tr').children || []).length : -1;
                return cols > bestCols ? t : best;
            }, null);
        }
        if (!grid) return { rows: [], title: '' };

        const rows = [];
        const trs = Array.from(grid.querySelectorAll('tr'));
        for (let i = 0; i < trs.length; i++) {
            const cells = Array.from(trs[i].querySelectorAll('td'));
            if (cells.length < 2) continue;

            const dateText = cells[0].textContent.trim();
            if (!dateText) continue;   // spacer row between days

            rows.push({
                dateText,
                slots: cells.slice(1).map((cell) => ({
                    text: cell.textContent.trim(),
                    absent: isAbsentMarkup(
                        cell.getAttribute('style'),
                        cell.getAttribute('bgcolor'),
                        cell.getAttribute('class')
                    )
                }))
            });
        }

        // The reporting window lives in one of the header tables.
        let title = '';
        for (const table of tables) {
            if (table === grid) continue;
            const text = table.textContent || '';
            if (/report\s*from/i.test(text) || /\d{1,2}[-\/\s][A-Za-z]{3,9}[-\/\s]\d{4}/.test(text)) {
                title = text;
                break;
            }
        }
        return { rows, title };
    }

    // -----------------------------------------------------------------------
    // Aggregation - pure.
    // -----------------------------------------------------------------------

    /**
     * Aggregates resolved rows into per-subject theory/practical tallies plus
     * the extras the UI shows: an absence log, a monthly trend and weekday
     * stats.
     *
     * @param {Array}  rows      output of extractItineraryRows
     * @param {Object} options   { startDate, endDate, seedYear }
     */
    function buildFromItinerary(rows, options) {
        const opts = options || {};
        const from = opts.startDate instanceof Date ? opts.startDate : parseISODate(opts.startDate);
        const to = opts.endDate instanceof Date ? opts.endDate : parseISODate(opts.endDate);

        const dated = resolveDates(rows, opts.seedYear);

        const theory = {};
        const practical = {};
        const absences = [];        // { date, subject, type, isPractical }
        const monthly = {};         // 'YYYY-MM' -> { total, attended }
        const weekday = {};         // 0..6      -> { total, attended }
        let firstDate = null;
        let lastDate = null;
        let sessionsInRange = 0;

        for (const row of dated) {
            if (from && row.date < from) continue;
            if (to && row.date > to) continue;

            if (!firstDate || row.date < firstDate) firstDate = row.date;
            if (!lastDate || row.date > lastDate) lastDate = row.date;

            const monthKey = row.date.getFullYear() + '-' +
                String(row.date.getMonth() + 1).padStart(2, '0');
            const dayKey = row.date.getDay();

            for (const slot of row.slots) {
                const lecture = parseSlot(slot.text);
                if (!lecture) continue;

                sessionsInRange++;
                const bucket = lecture.isPractical ? practical : theory;
                if (!bucket[lecture.subject]) bucket[lecture.subject] = { total: 0, attended: 0 };
                bucket[lecture.subject].total++;

                if (!monthly[monthKey]) monthly[monthKey] = { total: 0, attended: 0 };
                monthly[monthKey].total++;

                if (!weekday[dayKey]) weekday[dayKey] = { total: 0, attended: 0 };
                weekday[dayKey].total++;

                if (slot.absent) {
                    absences.push({
                        date: row.date,
                        label: formatDayMonth(row.date),
                        iso: toISODate(row.date),
                        subject: lecture.subject,
                        type: lecture.type,
                        isPractical: lecture.isPractical
                    });
                } else {
                    bucket[lecture.subject].attended++;
                    monthly[monthKey].attended++;
                    weekday[dayKey].attended++;
                }
            }
        }

        return {
            theory,
            practical,
            absences,
            monthly,
            weekday,
            meta: {
                rowsParsed: dated.length,
                rowsTotal: rows.length,
                sessionsInRange,
                firstDate,
                lastDate,
                // Surfaced so the UI can warn instead of silently showing zeros.
                unresolvedRows: rows.length - dated.length
            }
        };
    }

    /**
     * The timetable grid abbreviates subjects ("AIML") while the summary table
     * spells them out ("AI and Machine Learning"). Matching the abbreviation
     * against the capital letters of the full name recovers the pairing, so the
     * date-range tables can show readable names.
     *
     *   Theoretical Computer Science  -> TCS
     *   AI and Machine Learning       -> AIML
     *   Basics of Marketing Management-> BMM
     *
     * Anything that does not match keeps its abbreviation rather than being
     * guessed at - the timetable legitimately contains subjects the summary
     * table omits.
     */
    function matchSubjectNames(abbreviations, fullNames) {
        const initialsOf = (name) => (String(name).match(/[A-Z]/g) || []).join('');
        const wordInitials = (name) => String(name).trim().split(/\s+/)
            .filter((w) => !/^(and|of|the|for|in|to|a|an)$/i.test(w))
            .map((w) => w[0] ? w[0].toUpperCase() : '')
            .join('');

        const map = {};
        const taken = new Set();

        for (const abbr of abbreviations) {
            const key = String(abbr).trim().toUpperCase();
            let hit = null;
            for (const name of fullNames) {
                if (taken.has(name)) continue;
                if (initialsOf(name).toUpperCase() === key || wordInitials(name) === key) {
                    hit = name;
                    break;
                }
            }
            if (hit) { map[abbr] = hit; taken.add(hit); }
        }
        return map;
    }

    /**
     * Average sessions per week observed for each subject, used to estimate how
     * many lectures remain in the semester. Returns 0 for a subject when the
     * window is too short to infer a rate.
     */
    function weeklyRates(bucket, firstDate, lastDate) {
        const rates = {};
        if (!firstDate || !lastDate) return rates;
        const days = (lastDate - firstDate) / 86400000 + 1;
        const weeks = days / 7;
        if (!(weeks > 0)) return rates;
        for (const subject of Object.keys(bucket || {})) {
            rates[subject] = bucket[subject].total / weeks;
        }
        return rates;
    }

    /** Sums a { subject: {total, attended} } map. */
    function totals(bucket) {
        let total = 0;
        let attended = 0;
        for (const key of Object.keys(bucket || {})) {
            total += bucket[key].total;
            attended += bucket[key].attended;
        }
        return { total, attended };
    }

    return {
        MONTH_NAMES,
        ABSENT_MARKERS,
        parseMonth,
        parseISODate,
        toISODate,
        formatDayMonth,
        parseReportRange,
        resolveDates,
        parseSlot,
        isAbsentMarkup,
        extractItineraryRows,
        buildFromItinerary,
        matchSubjectNames,
        weeklyRates,
        totals
    };
});

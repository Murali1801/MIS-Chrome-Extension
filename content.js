/**
 * content.js - Attendance Enhancer
 * ================================
 * Runs on mis.aldel.lan/sjcet/view_stud_attendance.php.
 *
 * Responsibilities
 *   1. Augment the college's own summary tables with exact "need" / "can skip"
 *      / status columns and fix their percentage formatting.
 *   2. Render a dashboard below them: controls, overview tiles, a sortable
 *      subject breakdown, a manual calculator, a semester planner, a custom
 *      date-range recalculation, an absence log, trends and export.
 *
 * The attendance target and date range are set from the controls on this page,
 * not from the toolbar popup, so everything re-renders in place rather than
 * needing a reload. The popup keeps only the credential manager and the
 * original feature switches.
 *
 * All arithmetic goes through AttendanceMath (exact integer maths, any target)
 * and all itinerary parsing through AttendanceParse. Neither module touches the
 * DOM beyond one thin extraction helper, so both are unit tested in tests/.
 */
(function () {
    'use strict';

    const M = window.AttendanceMath;
    const P = window.AttendanceParse;

    const DEFAULTS = {
        threshold: 75,
        showOverview: true,
        showBreakdown: true,
        showCalculator: true,
        showPlanner: true,
        showRange: true,
        showAbsences: true,
        showTrends: true
    };

    const PANELS = [
        ['showOverview', 'Overview'],
        ['showBreakdown', 'Breakdown'],
        ['showCalculator', 'Calculator'],
        ['showPlanner', 'Planner'],
        ['showRange', 'Date range'],
        ['showAbsences', 'Absences'],
        ['showTrends', 'Trends']
    ];

    const BAND_LABEL = {
        safe: 'Safe',
        tight: 'No margin',
        below: 'Below target',
        critical: 'Critical',
        none: 'No data'
    };

    const ITINERARY_URL = 'itinenary_attendance_report.php';

    let cfg = Object.assign({}, DEFAULTS, { startDate: '', endDate: '' });
    let rawSettings = {};

    /** Everything read from the page or the itinerary, fetched once. */
    const state = {
        sections: { theory: null, practical: null },
        theory: [],
        practical: [],
        itineraryRows: null,
        seedYear: null,
        itineraryError: null,
        whole: null,
        nameMap: {},
        rates: { theory: {}, practical: {} }
    };

    /**
     * Scratch values that should survive a re-render. Changing the target
     * rebuilds every card, and losing what you had typed into the calculator or
     * the planner each time would make them unusable.
     */
    const memory = { calc: null, planner: null };

    let panelsHost = null;

    // =======================================================================
    // Small DOM helpers
    // =======================================================================

    /** el('div', {class: 'x'}, ['text', childNode]) */
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) {
            for (const key of Object.keys(attrs)) {
                const value = attrs[key];
                if (value === null || value === undefined || value === false) continue;
                if (key === 'text') node.textContent = value;
                else if (key === 'dataset') Object.assign(node.dataset, value);
                else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2), value);
                else node.setAttribute(key, value);
            }
        }
        for (const child of [].concat(children || [])) {
            if (child === null || child === undefined || child === false) continue;
            node.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
        }
        return node;
    }

    function card(title, subtitle, body, options) {
        const opts = options || {};
        const heading = el('h4', null, [
            el('span', { text: title }),
            subtitle ? el('span', { class: 'ae-sub', text: subtitle }) : null
        ]);
        const node = el('section', {
            class: 'ae-card' + (opts.collapsible ? ' ae-collapsible' : '') +
                   (opts.collapsed ? ' ae-collapsed' : '')
        }, [heading, el('div', { class: 'ae-body' }, body)]);

        if (opts.collapsible) {
            heading.addEventListener('click', () => node.classList.toggle('ae-collapsed'));
        }
        return node;
    }

    function tile(label, value, note, band) {
        return el('div', { class: 'ae-tile' + (band ? ' ae-' + band : '') }, [
            el('div', { class: 'ae-tile-label', text: label }),
            el('div', { class: 'ae-tile-value', text: value }),
            note ? el('div', { class: 'ae-tile-note', text: note }) : null
        ]);
    }

    function pill(band) {
        return el('span', { class: 'ae-pill ae-' + band, text: BAND_LABEL[band] || band });
    }

    function bar(pct, band) {
        return el('div', { class: 'ae-bar ae-' + band, title: M.formatPct(pct) + '%' },
            [el('span', { style: 'width:' + M.clamp(pct, 0, 100).toFixed(2) + '%' })]);
    }

    function field(label, input) {
        return el('div', { class: 'ae-field' }, [el('label', { text: label }), input]);
    }

    function numberInput(value, min, max, onInput, extraClass) {
        return el('input', {
            type: 'number',
            value: String(value),
            min: String(min),
            max: max === null || max === undefined ? null : String(max),
            step: '1',
            class: 'ae-narrow' + (extraClass ? ' ' + extraClass : ''),
            oninput: onInput
        });
    }

    function chip(label, onClick) {
        return el('button', { class: 'ae-chip', type: 'button', text: label, onclick: onClick });
    }

    /** Percentage cell content shared by every rendered table. */
    function pctWithBar(d) {
        return el('div', { class: 'ae-pct-cell' }, [
            el('span', { text: M.formatPct(d.pct) + '%' }),
            bar(d.pct, d.band)
        ]);
    }

    // =======================================================================
    // Configuration
    // =======================================================================

    function loadConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['settings', 'startDate', 'endDate'], (data) => {
                rawSettings = (data && data.settings) || {};
                cfg = Object.assign({}, DEFAULTS, rawSettings, {
                    threshold: normaliseThreshold(rawSettings.threshold),
                    startDate: (data && data.startDate) || '',
                    endDate: (data && data.endDate) || ''
                });
                resolve(cfg);
            });
        });
    }

    /** Writes the page's own settings back without disturbing the popup's. */
    function persist() {
        const settings = Object.assign({}, rawSettings, { threshold: cfg.threshold });
        for (const [key] of PANELS) settings[key] = cfg[key];
        rawSettings = settings;
        chrome.storage.local.set({
            settings,
            startDate: cfg.startDate,
            endDate: cfg.endDate
        });
    }

    function normaliseThreshold(value) {
        const n = Number(value);
        if (!isFinite(n) || n <= 0 || n > 100) return DEFAULTS.threshold;
        return n;
    }

    /** "75" / "72.5" without a trailing ".00" */
    function thresholdLabel() {
        return String(Number(cfg.threshold.toFixed(2)));
    }

    function isoToday() {
        return P.toISODate(new Date());
    }

    // =======================================================================
    // Reading the college's own summary tables
    // =======================================================================

    /**
     * Locates the theory and practical summary tables by their header text
     * rather than by index. The previous implementation hardcoded tables[1] and
     * tables[2]; any extra table on the page, or a missing one when a section
     * has no data, silently shifted the calculations onto the wrong grid.
     */
    function readSummaryTables() {
        const result = { theory: null, practical: null };

        for (const table of Array.from(document.querySelectorAll('table'))) {
            const headerRow = table.querySelector('tr');
            if (!headerRow) continue;
            const header = headerRow.textContent.toLowerCase();
            if (!/subject/.test(header)) continue;

            let kind = null;
            if (/practical/.test(header)) kind = 'practical';
            else if (/lecture/.test(header)) kind = 'theory';
            if (!kind || result[kind]) continue;

            result[kind] = { table, subjects: readSubjectRows(table) };
        }
        return result;
    }

    function readSubjectRows(table) {
        const subjects = [];
        const rows = Array.from(table.querySelectorAll('tr'));

        for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td'));
            if (cells.length < 3) continue;                       // spacer row

            const name = cells[0].textContent.trim();
            const total = parseInt(cells[1].textContent.trim(), 10);
            const attended = parseInt(cells[2].textContent.trim(), 10);

            // The Total row wraps its label in <b> and has no percentage cell.
            if (!name || cells[0].querySelector('b')) continue;
            if (!isFinite(total) || !isFinite(attended)) continue;

            subjects.push({ name, total, attended, row: rows[i], cells });
        }
        return subjects;
    }

    // =======================================================================
    // Augmenting those tables in place
    // =======================================================================
    //
    // Split into a one-off prepare pass that creates the extra cells and a
    // refresh pass that writes values into them. The target can be changed from
    // the controls on this page, so every derived figure has to be re-writable
    // without appending a second set of columns.

    function prepareSummaryTable(section) {
        if (!section || !section.table) return;
        const table = section.table;
        if (table.dataset.aePrepared === '1') return;
        table.dataset.aePrepared = '1';

        const headerRow = table.querySelector('tr');
        if (headerRow) {
            section.needHeader = el('th', { class: 'ae-added' });
            headerRow.appendChild(section.needHeader);
            headerRow.appendChild(el('th', { class: 'ae-added', text: 'Can skip' }));
            headerRow.appendChild(el('th', { class: 'ae-added', text: 'Status' }));
        }

        for (const subject of section.subjects) {
            subject.needCell = el('td', { class: 'ae-added' });
            subject.skipCell = el('td', { class: 'ae-added' });
            subject.statusCell = el('td', { class: 'ae-added' });
            subject.row.appendChild(subject.needCell);
            subject.row.appendChild(subject.skipCell);
            subject.row.appendChild(subject.statusCell);
        }

        prepareTotalRow(section);
    }

    /**
     * The theory table ships a Total row with no percentage; the practical table
     * has no Total row at all. Both end up with the same shape.
     */
    function prepareTotalRow(section) {
        const table = section.table;
        const sum = sumSubjects(section.subjects);

        const existing = Array.from(table.querySelectorAll('tr')).find((row) => {
            const first = row.querySelector('td');
            return first && /^total$/i.test(first.textContent.trim());
        });

        const cells = {
            pct: el('td', { class: 'ae-added' }),
            need: el('td', { class: 'ae-added' }),
            skip: el('td', { class: 'ae-added' }),
            status: el('td', { class: 'ae-added' })
        };
        const ordered = [cells.pct, cells.need, cells.skip, cells.status];

        if (existing) {
            // Total, conducted and attended are already there; add the rest.
            for (const cell of ordered) existing.appendChild(cell);
            section.totalCells = cells;
        } else if (sum.total > 0) {
            const row = el('tr', { class: 'ae-total-row' }, [
                el('td', { style: 'text-align:right' }, [el('b', { text: 'Total' })]),
                el('td', { style: 'text-align:center' }, [el('b', { text: String(sum.total) })]),
                el('td', { style: 'text-align:center' }, [el('b', { text: String(sum.attended) })])
            ]);
            for (const cell of ordered) row.appendChild(cell);
            (table.querySelector('tbody') || table).appendChild(row);
            section.totalCells = cells;
        } else {
            section.totalCells = null;
        }
    }

    function sumSubjects(subjects) {
        return subjects.reduce(
            (acc, s) => ({ total: acc.total + s.total, attended: acc.attended + s.attended }),
            { total: 0, attended: 0 }
        );
    }

    /** Writes every derived figure for the current target. Safe to re-run. */
    function refreshSummaryTable(section, kind) {
        if (!section || !section.table) return;

        if (section.needHeader) {
            section.needHeader.textContent = 'Need for ' + thresholdLabel() + '%';
        }

        for (const subject of section.subjects) {
            const d = M.describe(subject.total, subject.attended, cfg.threshold);
            subject.stats = d;

            // Rewrite the percentage cell so it agrees with the figures beside
            // it, flagged using the exact comparison rather than a rounded
            // float: a true 74.999% used to display as "75.00" unflagged.
            const pctCell = subject.cells[3];
            if (pctCell) {
                pctCell.textContent = '';
                const text = M.formatPct(d.pct);
                pctCell.appendChild(d.meets
                    ? document.createTextNode(text)
                    : el('b', { style: 'color:#b91c1c;text-decoration:underline', text }));
            }

            subject.needCell.textContent = M.formatCount(d.required);
            subject.skipCell.textContent = M.formatCount(d.bunks);
            subject.statusCell.textContent = '';
            subject.statusCell.appendChild(pill(d.band));

            subject.row.classList.remove('ae-row-below', 'ae-row-critical', 'ae-row-tight');
            if (d.band !== 'safe' && d.band !== 'none') subject.row.classList.add('ae-row-' + d.band);
        }

        const sum = sumSubjects(section.subjects);
        if (section.totalCells) {
            const d = M.describe(sum.total, sum.attended, cfg.threshold);
            section.totalCells.pct.textContent = M.formatPct(d.pct);
            section.totalCells.need.textContent = M.formatCount(d.required);
            section.totalCells.skip.textContent = M.formatCount(d.bunks);
            section.totalCells.status.textContent = '';
            section.totalCells.status.appendChild(pill(d.band));
        }

        refreshOverallLabel(sum, kind);
    }

    /**
     * Recomputes the "Overall Theory Attendance: 93.68%" labels the page prints
     * and appends the margin. The original wording is stashed on first touch so
     * repeated refreshes rewrite it instead of appending over and over.
     */
    function refreshOverallLabel(sum, kind) {
        if (!sum.total) return;
        const d = M.describe(sum.total, sum.attended, cfg.threshold);

        for (const label of Array.from(document.querySelectorAll('label'))) {
            const original = label.dataset.aeOriginal !== undefined
                ? label.dataset.aeOriginal
                : label.textContent;
            if (!/overall\s+(theory|practical)\s+attendance/i.test(original)) continue;
            // Only touch the label belonging to the section being refreshed.
            if (/practical/i.test(original) !== (kind === 'practical')) continue;
            if (label.dataset.aeOriginal === undefined) label.dataset.aeOriginal = original;

            const margin = d.required > 0
                ? ' — need ' + M.formatCount(d.required) + ' more in a row for ' + thresholdLabel() + '%'
                : ' — ' + M.formatCount(d.bunks) + ' can be skipped at ' + thresholdLabel() + '%';
            label.textContent = original.replace(/[\d.]+\s*%/, M.formatPct(d.pct) + '%') + margin;
        }
    }

    // =======================================================================
    // Sortable tables
    // =======================================================================

    /**
     * Cells carry data-sort with the value to compare, so the infinity glyph and
     * "97.22" sort numerically rather than as text.
     */
    function makeSortable(table) {
        const headers = Array.from(table.querySelectorAll('th'));
        headers.forEach((th, index) => {
            if (th.dataset.noSort === '1') return;
            th.classList.add('ae-sortable');
            th.addEventListener('click', () => {
                const body = table.querySelector('tbody');
                if (!body) return;
                const descending = th.classList.contains('ae-sort-asc');

                const rows = Array.from(body.querySelectorAll('tr'));
                rows.sort((a, b) => {
                    const av = sortValue(a.children[index]);
                    const bv = sortValue(b.children[index]);
                    if (typeof av === 'number' && typeof bv === 'number') {
                        return descending ? bv - av : av - bv;
                    }
                    return descending
                        ? String(bv).localeCompare(String(av))
                        : String(av).localeCompare(String(bv));
                });
                for (const row of rows) body.appendChild(row);

                headers.forEach((h) => h.classList.remove('ae-sort-asc', 'ae-sort-desc'));
                th.classList.add(descending ? 'ae-sort-desc' : 'ae-sort-asc');
            });
        });
        return table;
    }

    function sortValue(cell) {
        if (!cell) return '';
        const raw = cell.dataset && cell.dataset.sort !== undefined
            ? cell.dataset.sort
            : cell.textContent.trim();
        if (raw === '∞') return Infinity;
        const n = Number(raw);
        return raw !== '' && isFinite(n) ? n : raw.toLowerCase();
    }

    function dataTable(headers, rows, footer) {
        const head = el('tr', null, headers.map((h) =>
            el('th', { 'data-no-sort': h.sortable === false ? '1' : null, text: h.label || h })));
        const table = el('table', { class: 'ae-table' }, [
            el('thead', null, [head]),
            el('tbody', null, rows),
            footer ? el('tfoot', null, [footer]) : null
        ]);
        return makeSortable(table);
    }

    function numCell(value, sortKey) {
        return el('td', {
            class: 'ae-num',
            dataset: { sort: String(sortKey === undefined ? value : sortKey) },
            text: String(value)
        });
    }

    // =======================================================================
    // Card: controls
    // =======================================================================

    /**
     * The attendance target, the date window and which panels appear. Built once
     * and left alone by re-renders so typing here does not lose focus.
     */
    function buildControls() {
        let renderTimer = null;
        const later = () => {
            clearTimeout(renderTimer);
            renderTimer = setTimeout(() => { persist(); render(); }, 200);
        };
        const now = () => { persist(); render(); };

        const targetInput = el('input', {
            type: 'number', min: '1', max: '100', step: '0.5',
            value: thresholdLabel(), class: 'ae-narrow',
            oninput: () => { cfg.threshold = normaliseThreshold(targetInput.value); later(); }
        });
        const setTarget = (value) => {
            cfg.threshold = value;
            targetInput.value = String(value);
            now();
        };

        const fromInput = el('input', {
            type: 'date', value: cfg.startDate,
            onchange: () => { cfg.startDate = fromInput.value; fixOrder(); now(); }
        });
        const toInput = el('input', {
            type: 'date', value: cfg.endDate,
            onchange: () => { cfg.endDate = toInput.value; fixOrder(); now(); }
        });

        /** A backwards window silently matches nothing, so swap it instead. */
        function fixOrder() {
            if (cfg.startDate && cfg.endDate && cfg.startDate > cfg.endDate) {
                const swap = cfg.startDate;
                cfg.startDate = cfg.endDate;
                cfg.endDate = swap;
                fromInput.value = cfg.startDate;
                toInput.value = cfg.endDate;
            }
        }

        const setRange = (start, end) => {
            cfg.startDate = start;
            cfg.endDate = end;
            fromInput.value = start;
            toInput.value = end;
            now();
        };

        const today = new Date();
        const monthStart = P.toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
        const daysAgo = (n) => P.toISODate(new Date(today.getTime() - n * 86400000));

        const panelBoxes = PANELS.map(([key, label]) => {
            const box = el('input', {
                type: 'checkbox', checked: cfg[key] !== false,
                onchange: () => { cfg[key] = box.checked; now(); }
            });
            return el('label', { class: 'ae-check' }, [box, el('span', { text: label })]);
        });

        return card('Attendance settings', null, [
            el('div', { class: 'ae-controls' }, [
                field('Target (%)', targetInput),
                el('div', { class: 'ae-field' }, [
                    el('label', { text: 'Common targets' }),
                    el('div', { class: 'ae-chip-row' },
                        [50, 60, 75, 80, 85].map((v) => chip(v + '%', () => setTarget(v))))
                ]),
                field('Count from', fromInput),
                field('Count until', toInput),
                el('div', { class: 'ae-field' }, [
                    el('label', { text: 'Quick ranges' }),
                    el('div', { class: 'ae-chip-row' }, [
                        chip('Whole semester', () => setRange('', '')),
                        chip('This month', () => setRange(monthStart, isoToday())),
                        chip('Last 30 days', () => setRange(daysAgo(30), isoToday()))
                    ])
                ])
            ]),
            el('div', { class: 'ae-field', style: 'margin-top:12px' }, [
                el('label', { text: 'Panels' }),
                el('div', { class: 'ae-check-row' }, panelBoxes)
            ]),
            el('div', { class: 'ae-note',
                text: 'Everything below, and the extra columns on the tables above, is ' +
                      'recalculated for this target and window. Settings are remembered.' })
        ]);
    }

    // =======================================================================
    // Card: overview
    // =======================================================================

    function buildOverview(theory, practical) {
        const t = sumSubjects(theory);
        const p = sumSubjects(practical);
        const combined = { total: t.total + p.total, attended: t.attended + p.attended };

        const dc = M.describe(combined.total, combined.attended, cfg.threshold);
        const dt = M.describe(t.total, t.attended, cfg.threshold);
        const dp = M.describe(p.total, p.attended, cfg.threshold);

        const marginNote = (d) => d.required > 0
            ? 'attend ' + M.formatCount(d.required) + ' in a row to recover'
            : M.formatCount(d.bunks) + ' can still be skipped';

        // A section with nothing conducted reads as "no data", not as 0%.
        const sectionTile = (label, d, counts) => d.total === 0
            ? tile(label, '—', 'nothing conducted yet', 'none')
            : tile(label, M.formatPct(d.pct) + '%',
                counts.attended + ' of ' + counts.total + ' · ' + marginNote(d), d.band);

        const tiles = el('div', { class: 'ae-tiles' }, [
            sectionTile('Combined (theory + practical)', dc, combined),
            sectionTile('Theory', dt, t),
            sectionTile('Practical', dp, p),
            tile('Lectures missed', String(dc.missed),
                'across ' + (theory.length + practical.length) + ' subject entries', 'none')
        ]);

        // Subjects that need attention, worst first.
        const attention = theory.map((s) => ({ s: s, kind: 'Theory' }))
            .concat(practical.map((s) => ({ s: s, kind: 'Practical' })))
            .map((x) => ({
                s: x.s, kind: x.kind,
                d: M.describe(x.s.total, x.s.attended, cfg.threshold)
            }))
            .filter((x) => x.d.band !== 'safe' && x.s.total > 0)
            .sort((a, b) => a.d.pct - b.d.pct);

        const body = [tiles];
        if (attention.length) {
            body.push(el('div', { class: 'ae-warn' }, [
                el('b', { text: attention.length + ' subject' +
                    (attention.length > 1 ? 's need' : ' needs') + ' attention' }),
                el('ul', { class: 'ae-alert-list' }, attention.map((x) => el('li', null, [
                    x.s.name + ' (' + x.kind + '): ' + M.formatPct(x.d.pct) + '% — ' +
                    (x.d.required > 0
                        ? 'attend ' + M.formatCount(x.d.required) + ' consecutively for ' + thresholdLabel() + '%'
                        : 'at the limit, no lectures to spare')
                ])))
            ]));
        } else {
            body.push(el('div', { class: 'ae-note',
                text: 'Every subject is above ' + thresholdLabel() + '% with margin to spare.' }));
        }

        return card('Overview', 'target ' + thresholdLabel() + '%', body);
    }

    // =======================================================================
    // Card: subject breakdown
    // =======================================================================

    function buildBreakdown(theory, practical) {
        const rows = [];
        const push = (subject, kind) => {
            const d = M.describe(subject.total, subject.attended, cfg.threshold);
            rows.push(el('tr', null, [
                el('td', { dataset: { sort: subject.name.toLowerCase() }, text: subject.name }),
                el('td', { dataset: { sort: kind }, text: kind }),
                numCell(subject.total),
                numCell(subject.attended),
                numCell(d.missed),
                el('td', { class: 'ae-num', dataset: { sort: d.pct } }, [pctWithBar(d)]),
                numCell(M.formatCount(d.required), d.required),
                numCell(M.formatCount(d.bunks), d.bunks),
                el('td', { dataset: { sort: d.pct } }, [pill(d.band)])
            ]));
        };
        theory.forEach((s) => push(s, 'Theory'));
        practical.forEach((s) => push(s, 'Practical'));
        if (!rows.length) return null;

        const table = dataTable(
            ['Subject', 'Type', 'Conducted', 'Attended', 'Missed', '%',
             'Need for ' + thresholdLabel() + '%', 'Can skip', 'Status'],
            rows
        );
        return card('Subject breakdown', 'click any heading to sort',
            [el('div', { class: 'ae-table-wrap' }, [table])]);
    }

    // =======================================================================
    // Card: calculator
    // =======================================================================

    /**
     * An interactive scratchpad. Pick a subject to seed the figures, then step
     * the conducted and attended counts up or down and watch the percentage,
     * the lectures still needed for the target and the spare margin update live.
     * "Attended one" and "Missed one" move both counters the way a real lecture
     * would.
     */
    function buildCalculator(theory, practical) {
        const options = [];
        const seeds = {};

        const t = sumSubjects(theory);
        const p = sumSubjects(practical);

        const register = (key, label, total, attended) => {
            if (!(total > 0)) return;
            seeds[key] = { total: total, attended: attended, label: label };
            options.push(el('option', { value: key, text: label }));
        };

        register('__combined', 'Combined (theory + practical)',
            t.total + p.total, t.attended + p.attended);
        register('__theory', 'All theory', t.total, t.attended);
        register('__practical', 'All practical', p.total, p.attended);
        theory.forEach((s, i) => register('t' + i, 'Theory — ' + s.name, s.total, s.attended));
        practical.forEach((s, i) => register('p' + i, 'Practical — ' + s.name, s.total, s.attended));
        seeds.__blank = { total: 0, attended: 0, label: 'Start from zero' };
        options.push(el('option', { value: '__blank', text: 'Start from zero' }));

        // Restore whatever was on screen before the last re-render.
        let current = options[0].value;
        const stash = memory.calc;
        if (stash && seeds[stash.seed]) current = stash.seed;

        const values = (stash && seeds[stash.seed])
            ? { total: stash.total, attended: stash.attended }
            : { total: seeds[current].total, attended: seeds[current].attended };

        const pctOut = el('div', { class: 'ae-tile-value' });
        const pctNote = el('div', { class: 'ae-tile-note' });
        const statusOut = el('div', { class: 'ae-tile-value', style: 'font-size:15px' });
        const needOut = el('div', { class: 'ae-tile-value' });
        const needNote = el('div', { class: 'ae-tile-note' });
        const skipOut = el('div', { class: 'ae-tile-value' });
        const skipNote = el('div', { class: 'ae-tile-note' });
        const deltaNote = el('div', { class: 'ae-note' });

        const pctTile = el('div', { class: 'ae-tile' }, [
            el('div', { class: 'ae-tile-label', text: 'Percentage' }), pctOut, pctNote]);
        const statusTile = el('div', { class: 'ae-tile' }, [
            el('div', { class: 'ae-tile-label', text: 'Status' }), statusOut]);
        const needTile = el('div', { class: 'ae-tile' }, [
            el('div', { class: 'ae-tile-label', text: 'Must attend in a row' }), needOut, needNote]);
        const skipTile = el('div', { class: 'ae-tile' }, [
            el('div', { class: 'ae-tile-label', text: 'Can still skip' }), skipOut, skipNote]);

        const totalInput = numberInput(values.total, 0, 9999, () => {
            values.total = clampInt(totalInput.value, 0, 9999);
            if (values.attended > values.total) values.attended = values.total;
            sync();
        });
        const attendedInput = numberInput(values.attended, 0, 9999, () => {
            values.attended = clampInt(attendedInput.value, 0, values.total);
            sync();
        });

        function clampInt(value, min, max) {
            const n = Math.trunc(Number(value));
            if (!isFinite(n)) return min;
            return M.clamp(n, min, max);
        }

        /** Steppers keep attended <= conducted at all times. */
        function step(which, delta) {
            if (which === 'total') {
                values.total = Math.max(0, values.total + delta);
                if (values.attended > values.total) values.attended = values.total;
            } else {
                values.attended = M.clamp(values.attended + delta, 0, values.total);
            }
            sync();
        }

        /** One real lecture: attending raises both counters, missing only one. */
        function lecture(attendedIt, count) {
            values.total += count;
            if (attendedIt) values.attended += count;
            values.attended = M.clamp(values.attended, 0, values.total);
            sync();
        }

        function stepper(label, which, input) {
            return el('div', { class: 'ae-field' }, [
                el('label', { text: label }),
                el('div', { class: 'ae-stepper' }, [
                    el('button', { class: 'ae-btn ae-btn-ghost ae-step', type: 'button',
                        title: 'Decrease', text: '−', onclick: () => step(which, -1) }),
                    input,
                    el('button', { class: 'ae-btn ae-btn-ghost ae-step', type: 'button',
                        title: 'Increase', text: '+', onclick: () => step(which, 1) })
                ])
            ]);
        }

        const picker = el('select', {
            onchange: () => {
                current = picker.value;
                values.total = seeds[current].total;
                values.attended = seeds[current].attended;
                sync();
            }
        }, options);
        picker.value = current;

        function sync() {
            totalInput.value = String(values.total);
            attendedInput.value = String(values.attended);
            memory.calc = { seed: current, total: values.total, attended: values.attended };

            const d = M.describe(values.total, values.attended, cfg.threshold);
            const band = values.total === 0 ? 'none' : d.band;

            pctOut.textContent = values.total === 0 ? '—' : M.formatPct(d.pct) + '%';
            pctNote.textContent = values.attended + ' of ' + values.total + ' attended · ' +
                d.missed + ' missed';
            statusOut.textContent = '';
            statusOut.appendChild(pill(band));

            needOut.textContent = M.formatCount(d.required);
            needNote.textContent = d.required === 0
                ? 'already at or above ' + thresholdLabel() + '%'
                : 'consecutive lectures to reach ' + thresholdLabel() + '%';

            skipOut.textContent = M.formatCount(d.bunks);
            skipNote.textContent = d.bunks === 0
                ? 'nothing to spare at ' + thresholdLabel() + '%'
                : 'and stay at or above ' + thresholdLabel() + '%';

            for (const node of [pctTile, needTile, skipTile]) node.className = 'ae-tile ae-' + band;

            const seed = seeds[current];
            const dTotal = values.total - seed.total;
            const dAttended = values.attended - seed.attended;
            if (dTotal === 0 && dAttended === 0) {
                deltaNote.textContent = 'Showing the actual figures for ' + seed.label + '.';
            } else {
                const fmt = (n) => (n >= 0 ? '+' : '') + n;
                deltaNote.textContent = 'Hypothetical: ' + fmt(dAttended) + ' attended, ' +
                    fmt(dTotal) + ' conducted versus the actual ' +
                    seed.attended + '/' + seed.total + ' for ' + seed.label + '.';
            }
        }
        sync();

        return card('Calculator', 'adjust the numbers and see what it takes', [
            el('div', { class: 'ae-controls' }, [
                field('Seed from', picker),
                stepper('Conducted', 'total', totalInput),
                stepper('Attended', 'attended', attendedInput)
            ]),
            el('div', { class: 'ae-controls', style: 'margin-top:10px' }, [
                el('div', { class: 'ae-field' }, [
                    el('label', { text: 'Simulate lectures' }),
                    el('div', { class: 'ae-chip-row' }, [
                        chip('Attended one', () => lecture(true, 1)),
                        chip('Missed one', () => lecture(false, 1)),
                        chip('Attended 5', () => lecture(true, 5)),
                        chip('Missed 5', () => lecture(false, 5)),
                        el('button', { class: 'ae-btn', type: 'button', text: 'Reset',
                            onclick: () => {
                                values.total = seeds[current].total;
                                values.attended = seeds[current].attended;
                                sync();
                            } })
                    ])
                ])
            ]),
            el('div', { class: 'ae-tiles', style: 'margin-top:14px' },
                [pctTile, statusTile, needTile, skipTile]),
            deltaNote
        ]);
    }

    // =======================================================================
    // Card: semester planner
    // =======================================================================

    /**
     * Forward-looking view: for a number of weeks still to be taught, estimate
     * how many lectures remain per subject and how many of them must be
     * attended. Per-subject estimates stay editable because the timetable
     * changes towards the end of a semester.
     */
    function buildPlanner(theory, practical, rates) {
        const entries = theory.map((s) => ({ subject: s, kind: 'Theory' }))
            .concat(practical.map((s) => ({ subject: s, kind: 'Practical' })))
            .filter((e) => e.subject.total > 0);
        if (!entries.length) return null;

        const stash = memory.planner || { weeks: 4, values: {} };
        const weeksInput = numberInput(stash.weeks, 0, 30, () => {
            stash.weeks = Math.max(0, Math.trunc(Number(weeksInput.value)) || 0);
            memory.planner = stash;
        });
        const rows = [];

        for (const entry of entries) {
            // Rates are kept per kind: a subject usually has both a theory and a
            // practical slot, and they run at very different frequencies.
            const perWeek = (rates[entry.kind === 'Theory' ? 'theory' : 'practical'] || {})[entry.subject.name] || 0;
            const key = entry.kind + '|' + entry.subject.name;
            const remembered = stash.values[key];
            const start = remembered !== undefined ? remembered : Math.round(perWeek * stash.weeks);

            const remainingInput = numberInput(start, 0, 999, () => refresh(entry));
            const cells = {
                must: el('td', { class: 'ae-num' }),
                miss: el('td', { class: 'ae-num' }),
                best: el('td', { class: 'ae-num' }),
                worst: el('td', { class: 'ae-num' }),
                verdict: el('td')
            };

            entry.perWeek = perWeek;
            entry.key = key;
            entry.input = remainingInput;
            entry.cells = cells;

            rows.push(el('tr', null, [
                el('td', { text: entry.subject.name }),
                el('td', { text: entry.kind }),
                numCell(entry.subject.attended + '/' + entry.subject.total,
                    M.percentage(entry.subject.attended, entry.subject.total)),
                el('td', null, [remainingInput]),
                cells.must, cells.miss, cells.best, cells.worst, cells.verdict
            ]));
            refresh(entry);
        }

        function refresh(entry) {
            const remaining = Math.max(0, Math.trunc(Number(entry.input.value)) || 0);
            stash.values[entry.key] = remaining;
            memory.planner = stash;

            const plan = M.planRemaining(entry.subject.total, entry.subject.attended,
                remaining, cfg.threshold);
            const c = entry.cells;

            c.must.textContent = plan.reachable ? String(plan.mustAttend) : '—';
            c.must.dataset.sort = plan.reachable ? String(plan.mustAttend) : '-1';
            c.miss.textContent = plan.reachable ? String(plan.canMiss) : '—';
            c.miss.dataset.sort = plan.reachable ? String(plan.canMiss) : '-1';
            c.best.textContent = M.formatPct(plan.bestCasePct) + '%';
            c.best.dataset.sort = String(plan.bestCasePct);
            c.worst.textContent = M.formatPct(plan.worstCasePct) + '%';
            c.worst.dataset.sort = String(plan.worstCasePct);

            c.verdict.textContent = '';
            if (!plan.reachable) {
                c.verdict.appendChild(pill('critical'));
                c.verdict.appendChild(document.createTextNode(' out of reach'));
            } else if (remaining > 0 && plan.canMiss === 0) {
                // Every single remaining lecture has to be attended.
                c.verdict.appendChild(pill('tight'));
            } else {
                // Either already guaranteed, or there is slack. With nothing
                // left this is simply the final standing.
                c.verdict.appendChild(pill('safe'));
            }
        }

        /** Re-estimate deliberately overwrites manual edits. */
        function applyWeeks() {
            const weeks = Math.max(0, Math.trunc(Number(weeksInput.value)) || 0);
            stash.weeks = weeks;
            for (const entry of entries) {
                if (entry.perWeek > 0) entry.input.value = String(Math.round(entry.perWeek * weeks));
                refresh(entry);
            }
        }

        const table = dataTable(
            ['Subject', 'Type', 'Now', 'Lectures left', 'Must attend', 'Can miss',
             'Best case', 'Worst case', 'Verdict'],
            rows
        );

        const haveRates = entries.some((entry) => entry.perWeek > 0);
        return card('Semester planner', 'target ' + thresholdLabel() + '%', [
            el('div', { class: 'ae-controls' }, [
                field('Weeks of teaching left', weeksInput),
                el('button', { class: 'ae-btn', type: 'button', text: 'Re-estimate',
                    onclick: applyWeeks })
            ]),
            el('div', { class: 'ae-table-wrap', style: 'margin-top:12px' }, [table]),
            el('div', {
                class: haveRates ? 'ae-note' : 'ae-warn',
                text: haveRates
                    ? 'Lectures left are estimated from the weekly rate observed in your timetable, ' +
                      'and each row can be edited if your schedule differs. Best case assumes you ' +
                      'attend everything left; worst case assumes you attend none of it.'
                    : 'The itinerary could not be read, so lectures left start at zero. Enter the ' +
                      'expected count per subject to use the planner.'
            })
        ]);
    }

    // =======================================================================
    // Card: custom date range
    // =======================================================================

    function buildRangeSection(data, nameMap) {
        const windowLabel = (data.meta.firstDate && data.meta.lastDate)
            ? P.formatDayMonth(data.meta.firstDate) + ' → ' + P.formatDayMonth(data.meta.lastDate)
            : 'no lectures in range';

        const sections = [];
        for (const pair of [['Theory', data.theory], ['Practical', data.practical]]) {
            const label = pair[0];
            const bucket = pair[1];
            const names = Object.keys(bucket).sort();
            if (!names.length) continue;

            const rows = names.map((abbr) => {
                const d = M.describe(bucket[abbr].total, bucket[abbr].attended, cfg.threshold);
                return el('tr', null, [
                    el('td', { dataset: { sort: (nameMap[abbr] || abbr).toLowerCase() },
                        text: nameMap[abbr] ? nameMap[abbr] + ' (' + abbr + ')' : abbr }),
                    numCell(d.total),
                    numCell(d.attended),
                    numCell(d.missed),
                    el('td', { class: 'ae-num', dataset: { sort: d.pct } }, [pctWithBar(d)]),
                    numCell(M.formatCount(d.required), d.required),
                    numCell(M.formatCount(d.bunks), d.bunks),
                    el('td', { dataset: { sort: d.pct } }, [pill(d.band)])
                ]);
            });

            const sum = P.totals(bucket);
            const d = M.describe(sum.total, sum.attended, cfg.threshold);
            const footer = el('tr', null, [
                el('td', { text: 'Total' }),
                numCell(sum.total), numCell(sum.attended), numCell(sum.total - sum.attended),
                el('td', { class: 'ae-num', text: M.formatPct(d.pct) + '%' }),
                numCell(M.formatCount(d.required), d.required),
                numCell(M.formatCount(d.bunks), d.bunks),
                el('td', null, [pill(d.band)])
            ]);

            sections.push(el('div', { style: 'margin-bottom:14px' }, [
                el('div', { style: 'font-weight:600;margin-bottom:6px', text: label }),
                el('div', { class: 'ae-table-wrap' }, [
                    dataTable(['Subject', 'Conducted', 'Attended', 'Missed', '%',
                               'Need for ' + thresholdLabel() + '%', 'Can skip', 'Status'],
                        rows, footer)
                ])
            ]));
        }

        if (!sections.length) {
            sections.push(el('div', { class: 'ae-note',
                text: 'No lectures fall inside this window.' }));
        }

        const rangeText = (cfg.startDate || 'start of semester') + '  to  ' +
            (cfg.endDate || 'latest available');

        return card('Selected date range', windowLabel, [
            el('div', { class: 'ae-note', style: 'margin:0 0 12px',
                text: 'Counting ' + data.meta.sessionsInRange + ' timetable slots from ' + rangeText +
                      '. This is taken from the detailed itinerary, so it can include subjects ' +
                      'the summary tables above leave out.' }),
            el('div', null, sections)
        ]);
    }

    // =======================================================================
    // Card: absence log
    // =======================================================================

    function buildAbsenceLog(data, nameMap) {
        if (!data.absences.length) {
            return card('Absence log', 'nothing missed in this window',
                [el('div', { class: 'ae-note',
                    text: 'No absences are marked in the itinerary for the selected range.' })],
                { collapsible: true, collapsed: true });
        }

        const grouped = {};
        for (const absence of data.absences) {
            const key = absence.subject + '|' + (absence.isPractical ? 'P' : 'T');
            if (!grouped[key]) {
                grouped[key] = { subject: absence.subject, isPractical: absence.isPractical, dates: [] };
            }
            grouped[key].dates.push(absence);
        }

        const groups = Object.keys(grouped).map((k) => grouped[k])
            .sort((a, b) => b.dates.length - a.dates.length);

        const rows = groups.map((group) => el('tr', null, [
            el('td', { dataset: { sort: group.subject.toLowerCase() },
                text: (nameMap[group.subject] || group.subject) +
                      (group.isPractical ? ' (Practical)' : ' (Theory)') }),
            numCell(group.dates.length),
            el('td', { dataset: { sort: group.dates.length } }, [
                el('div', { class: 'ae-tag-list' }, group.dates.map((a) =>
                    el('span', {
                        class: 'ae-tag' + (a.isPractical ? ' ae-prac' : ''),
                        title: a.iso + ' · slot type ' + a.type,
                        text: a.label
                    })))
            ])
        ]));

        return card('Absence log', data.absences.length + ' missed slots', [
            el('div', { class: 'ae-table-wrap' }, [
                dataTable([{ label: 'Subject' }, { label: 'Missed' },
                           { label: 'Dates', sortable: false }], rows)
            ])
        ], { collapsible: true, collapsed: true });
    }

    // =======================================================================
    // Card: trends
    // =======================================================================

    function buildTrends(data) {
        const monthKeys = Object.keys(data.monthly).sort();
        if (!monthKeys.length) return null;

        const monthRows = monthKeys.map((key) => {
            const m = data.monthly[key];
            const d = M.describe(m.total, m.attended, cfg.threshold);
            const parts = key.split('-');
            return el('tr', null, [
                el('td', { dataset: { sort: key },
                    text: P.MONTH_NAMES[Number(parts[1]) - 1] + ' ' + parts[0] }),
                numCell(m.total),
                numCell(m.attended),
                numCell(d.missed),
                el('td', { class: 'ae-num', dataset: { sort: d.pct } }, [pctWithBar(d)])
            ]);
        });

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayRows = Object.keys(data.weekday).map(Number).sort((a, b) => a - b)
            .map((day) => {
                const w = data.weekday[day];
                const d = M.describe(w.total, w.attended, cfg.threshold);
                return el('tr', null, [
                    el('td', { dataset: { sort: day }, text: dayNames[day] }),
                    numCell(w.total),
                    numCell(w.attended),
                    numCell(d.missed),
                    el('td', { class: 'ae-num', dataset: { sort: d.pct } }, [pctWithBar(d)])
                ]);
            });

        // Worst weekday is a genuinely useful nudge.
        let worst = null;
        for (const day of Object.keys(data.weekday)) {
            const w = data.weekday[day];
            if (w.total < 5) continue;                       // too little signal
            const pct = M.percentage(w.attended, w.total);
            if (!worst || pct < worst.pct) worst = { day: Number(day), pct: pct, total: w.total };
        }

        return card('Trends', 'month by month and by weekday', [
            el('div', { class: 'ae-table-wrap' }, [
                dataTable(['Month', 'Conducted', 'Attended', 'Missed', '%'], monthRows)
            ]),
            el('div', { class: 'ae-table-wrap', style: 'margin-top:14px' }, [
                dataTable(['Weekday', 'Conducted', 'Attended', 'Missed', '%'], dayRows)
            ]),
            worst ? el('div', { class: 'ae-note',
                text: 'Weakest weekday: ' + dayNames[worst.day] + ' at ' +
                      M.formatPct(worst.pct) + '% over ' + worst.total + ' slots.' }) : null
        ], { collapsible: true, collapsed: true });
    }

    // =======================================================================
    // CSV export
    // =======================================================================

    function buildExport(theory, practical, rangeData, nameMap) {
        function toCsv() {
            const lines = [];
            const esc = (v) => {
                const s = String(v === null || v === undefined ? '' : v);
                return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
            };
            const row = (values) => lines.push(values.map(esc).join(','));

            row(['Attendance Enhancer export']);
            row(['Generated', new Date().toISOString()]);
            row(['Target (%)', thresholdLabel()]);
            row([]);
            row(['Section', 'Subject', 'Conducted', 'Attended', 'Missed', 'Percentage',
                 'Need for ' + thresholdLabel() + '%', 'Can skip', 'Status']);

            const emit = (section, name, total, attended) => {
                const d = M.describe(total, attended, cfg.threshold);
                row([section, name, d.total, d.attended, d.missed, M.formatPct(d.pct),
                     M.formatCount(d.required), M.formatCount(d.bunks), BAND_LABEL[d.band]]);
            };

            theory.forEach((s) => emit('Theory', s.name, s.total, s.attended));
            practical.forEach((s) => emit('Practical', s.name, s.total, s.attended));

            const t = sumSubjects(theory);
            const p = sumSubjects(practical);
            emit('Total', 'All theory', t.total, t.attended);
            emit('Total', 'All practical', p.total, p.attended);
            emit('Total', 'Combined', t.total + p.total, t.attended + p.attended);

            if (rangeData) {
                row([]);
                row(['Selected range',
                     rangeData.meta.firstDate ? P.toISODate(rangeData.meta.firstDate) : '',
                     'to',
                     rangeData.meta.lastDate ? P.toISODate(rangeData.meta.lastDate) : '']);
                row(['Section', 'Subject', 'Conducted', 'Attended', 'Missed', 'Percentage',
                     'Need for ' + thresholdLabel() + '%', 'Can skip', 'Status']);
                for (const pair of [['Range theory', rangeData.theory],
                                    ['Range practical', rangeData.practical]]) {
                    const bucket = pair[1];
                    for (const abbr of Object.keys(bucket).sort()) {
                        emit(pair[0], nameMap[abbr] || abbr, bucket[abbr].total, bucket[abbr].attended);
                    }
                }

                if (rangeData.absences.length) {
                    row([]);
                    row(['Absences']);
                    row(['Date', 'Subject', 'Slot type', 'Kind']);
                    for (const a of rangeData.absences) {
                        row([a.iso, nameMap[a.subject] || a.subject, a.type,
                             a.isPractical ? 'Practical' : 'Theory']);
                    }
                }
            }
            return lines.join('\r\n');
        }

        function download() {
            // A BOM keeps Excel from mangling the non-ASCII characters.
            const blob = new Blob(['﻿' + toCsv()], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = el('a', { href: url, download: 'attendance-' + isoToday() + '.csv' });
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        return card('Export', null, [
            el('div', { class: 'ae-controls' }, [
                el('button', { class: 'ae-btn', type: 'button', text: 'Download CSV', onclick: download }),
                el('button', { class: 'ae-btn ae-btn-ghost', type: 'button', text: 'Print / save as PDF',
                    onclick: () => window.print() })
            ]),
            el('div', { class: 'ae-note',
                text: 'The CSV carries every subject, the selected range and the absence log.' })
        ]);
    }

    // =======================================================================
    // Itinerary
    // =======================================================================

    async function fetchItinerary() {
        const response = await fetch(ITINERARY_URL, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('itinerary request failed with ' + response.status);

        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const extracted = P.extractItineraryRows(doc);
        if (!extracted.rows.length) throw new Error('no timetable rows found in the itinerary');

        const range = P.parseReportRange(extracted.title);
        return {
            rows: extracted.rows,
            seedYear: range ? range.start.getFullYear() : new Date().getFullYear()
        };
    }

    async function loadItinerary() {
        try {
            const itinerary = await fetchItinerary();
            state.itineraryRows = itinerary.rows;
            state.seedYear = itinerary.seedYear;

            const whole = P.buildFromItinerary(itinerary.rows, { seedYear: itinerary.seedYear });
            state.whole = whole;

            const fullNames = state.theory.concat(state.practical).map((s) => s.name);
            state.nameMap = P.matchSubjectNames(
                Object.keys(whole.theory).concat(Object.keys(whole.practical)), fullNames);

            // Weekly rates are re-keyed by full subject name so the planner,
            // which is built from the summary table, can look them up. Theory
            // and practical are kept apart: the same subject typically has one
            // practical a week but three or four lectures.
            for (const kind of ['theory', 'practical']) {
                const perAbbr = P.weeklyRates(whole[kind], whole.meta.firstDate, whole.meta.lastDate);
                for (const abbr of Object.keys(perAbbr)) {
                    state.rates[kind][state.nameMap[abbr] || abbr] = perAbbr[abbr];
                }
            }
        } catch (error) {
            console.error('Attendance Enhancer: itinerary unavailable.', error);
            state.itineraryError = error;
        }
    }

    /** Recomputes the range slice for the current window. */
    function currentRange() {
        if (!state.itineraryRows) return null;
        if (!cfg.startDate && !cfg.endDate) return state.whole;
        return P.buildFromItinerary(state.itineraryRows, {
            seedYear: state.seedYear,
            startDate: cfg.startDate,
            endDate: cfg.endDate
        });
    }

    // =======================================================================
    // Rendering
    // =======================================================================

    function render() {
        refreshSummaryTable(state.sections.theory, 'theory');
        refreshSummaryTable(state.sections.practical, 'practical');

        const theory = state.theory;
        const practical = state.practical;
        const rangeData = currentRange();

        panelsHost.textContent = '';
        const add = (node) => { if (node) panelsHost.appendChild(node); };

        if (cfg.showOverview !== false) add(buildOverview(theory, practical));
        if (cfg.showBreakdown !== false) add(buildBreakdown(theory, practical));
        if (cfg.showCalculator !== false) add(buildCalculator(theory, practical));
        if (cfg.showPlanner !== false) add(buildPlanner(theory, practical, state.rates));

        if (state.itineraryError) {
            add(card('Itinerary unavailable', null, [
                el('div', { class: 'ae-error',
                    text: 'The detailed itinerary could not be read, so date-range figures, the ' +
                          'absence log and trends are unavailable. The tables above, the ' +
                          'calculator and the planner are unaffected.' }),
                el('div', { class: 'ae-note',
                    text: String(state.itineraryError.message || state.itineraryError) })
            ]));
        } else if (rangeData) {
            if (cfg.showRange !== false) add(buildRangeSection(rangeData, state.nameMap));
            if (cfg.showAbsences !== false) add(buildAbsenceLog(rangeData, state.nameMap));
            if (cfg.showTrends !== false) add(buildTrends(rangeData));
            if (rangeData.meta.unresolvedRows > 0) {
                add(el('div', { class: 'ae-warn',
                    text: rangeData.meta.unresolvedRows + ' timetable row(s) could not be dated ' +
                          'and were left out of the range figures.' }));
            }
        } else {
            add(el('div', { class: 'ae-note', text: 'Loading the detailed itinerary…' }));
        }

        add(buildExport(theory, practical, rangeData, state.nameMap));
    }

    // =======================================================================
    // Entry point
    // =======================================================================

    async function run() {
        if (!M || !P) {
            console.error('Attendance Enhancer: helper modules failed to load.');
            return;
        }

        const summary = readSummaryTables();
        state.sections = summary;
        state.theory = summary.theory ? summary.theory.subjects : [];
        state.practical = summary.practical ? summary.practical.subjects : [];

        if (!state.theory.length && !state.practical.length) {
            console.warn('Attendance Enhancer: no attendance tables on this page.');
            return;
        }

        prepareSummaryTable(summary.theory);
        prepareSummaryTable(summary.practical);

        const host = document.querySelector('.col-sm-9.text-left') || document.body;
        const root = el('div', { id: 'ae-root' });
        host.appendChild(root);

        root.appendChild(buildControls());
        panelsHost = el('div');
        root.appendChild(panelsHost);

        render();                       // paint immediately from the page itself
        await loadItinerary();
        render();                       // repaint once the itinerary is in
    }

    // Gate on the toggle in the popup, exactly as before.
    chrome.storage.local.get('settings', async (data) => {
        if (!data || !data.settings || data.settings.attendanceCalculatorEnabled === false) return;
        await loadConfig();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    });
})();

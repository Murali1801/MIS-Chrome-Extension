/**
 * Brute-force verification of attendance-math.js.
 *
 * Rather than asserting hand-picked expected values, the required / bunk
 * functions are checked against an exhaustive search over every (total,
 * attended) pair for a range of thresholds. If the closed-form integer maths
 * ever disagrees with the brute-force answer by even one lecture, this fails.
 *
 * Run with:  node tests/attendance-math.test.js
 */
'use strict';

const M = require('../attendance-math.js');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.error('  FAIL  ' + name + (detail ? '  ->  ' + detail : ''));
    }
}

/** Reference implementation: exact rational comparison, no closed form. */
function meetsRef(attended, total, thresholdPct) {
    if (total === 0) return true;
    // attended/total >= pct/100  <=>  attended*10000 >= round(pct*100)*total
    return attended * 10000 >= Math.round(thresholdPct * 100) * total;
}

/** Smallest x >= 0 such that (attended+x)/(total+x) meets the threshold. */
function requiredBrute(total, attended, thresholdPct, cap) {
    for (let x = 0; x <= cap; x++) {
        if (meetsRef(attended + x, total + x, thresholdPct)) return x;
    }
    return Infinity;
}

/** Largest y >= 0 such that attended/(total+y) still meets the threshold. */
function bunksBrute(total, attended, thresholdPct, cap) {
    let best = -1;
    for (let y = 0; y <= cap; y++) {
        if (meetsRef(attended, total + y, thresholdPct)) best = y;
        else break;
    }
    return best < 0 ? 0 : best;
}

// ---------------------------------------------------------------------------
console.log('\n1. requiredLectures / bunksAvailable vs brute force');
// ---------------------------------------------------------------------------
// The brute-force search needs a cap large enough that a legitimate answer is
// never mistaken for "unreachable". Required lectures grow as
// threshold/(100-threshold), so extreme thresholds are swept over a smaller
// grid with a much larger cap rather than inflating the cap everywhere.
const sweeps = [
    { thresholds: [0, 25, 40, 50, 60, 66.67, 70, 72.5, 75, 80, 85, 90], maxTotal: 120, cap: 4000 },
    { thresholds: [95, 99.5, 100], maxTotal: 20, cap: 60000 }
];
const CAP = 60000;
let combos = 0;

for (const sweep of sweeps) {
  for (const t of sweep.thresholds) {
    for (let total = 0; total <= sweep.maxTotal; total++) {
        for (let attended = 0; attended <= total; attended++) {
            const CAP = sweep.cap;
            combos++;

            const req = M.requiredLectures(total, attended, t);
            const reqExpected = requiredBrute(total, attended, t, CAP);
            check(
                'required(' + total + ',' + attended + ',' + t + ')',
                req === reqExpected,
                'got ' + req + ' expected ' + reqExpected
            );

            // A non-zero requirement must be minimal: one fewer must still fail.
            if (isFinite(req) && req > 0) {
                check(
                    'required minimal(' + total + ',' + attended + ',' + t + ')',
                    meetsRef(attended + req, total + req, t) &&
                        !meetsRef(attended + req - 1, total + req - 1, t),
                    'req=' + req
                );
            }

            const bunks = M.bunksAvailable(total, attended, t);
            if (t > 0) {
                const bunksExpected = bunksBrute(total, attended, t, CAP);
                check(
                    'bunks(' + total + ',' + attended + ',' + t + ')',
                    bunks === bunksExpected,
                    'got ' + bunks + ' expected ' + bunksExpected
                );
                // A non-zero allowance must be maximal: one more must break it.
                if (bunks > 0) {
                    check(
                        'bunks maximal(' + total + ',' + attended + ',' + t + ')',
                        meetsRef(attended, total + bunks, t) &&
                            !meetsRef(attended, total + bunks + 1, t),
                        'bunks=' + bunks
                    );
                }
            } else {
                check('bunks at 0% is infinite', bunks === Infinity, String(bunks));
            }

            // required and bunks are mutually exclusive: you are either short or
            // you have slack, never both.
            check(
                'not both required and bunks(' + total + ',' + attended + ',' + t + ')',
                !(isFinite(req) && req > 0 && isFinite(bunks) && bunks > 0)
            );
        }
    }
  }
}
console.log('   checked ' + combos.toLocaleString() + ' (total, attended, threshold) combinations');

// ---------------------------------------------------------------------------
console.log('\n2. Floating-point traps the old formula fell into');
// ---------------------------------------------------------------------------
// The old code was hardcoded to 0.75. These cases exercise thresholds whose
// binary representation is inexact, where Math.ceil/Math.floor on a float
// quotient can be off by one.
const fpCases = [
    // [total, attended, threshold]
    [30, 18, 60], [50, 30, 60], [7, 4, 60], [3, 2, 66.67],
    [40, 32, 80], [13, 9, 72.5], [100, 72, 72.5], [17, 12, 70],
    [9, 3, 33.33], [1000, 749, 75], [1000, 750, 75]
];
for (const [total, attended, t] of fpCases) {
    const req = M.requiredLectures(total, attended, t);
    const bun = M.bunksAvailable(total, attended, t);
    check(
        'fp required(' + total + ',' + attended + ',' + t + ')',
        req === requiredBrute(total, attended, t, CAP),
        'got ' + req
    );
    check(
        'fp bunks(' + total + ',' + attended + ',' + t + ')',
        bun === bunksBrute(total, attended, t, CAP),
        'got ' + bun
    );
}

// ---------------------------------------------------------------------------
console.log('\n3. Exact boundary behaviour at the threshold');
// ---------------------------------------------------------------------------
// 3/4 is exactly 75%: it must pass, and must not be flagged as short.
check('3/4 meets 75%', M.meetsThreshold(3, 4, 75) === true);
check('3/4 requires 0', M.requiredLectures(4, 3, 75) === 0);
check('2/3 does not meet 75%', M.meetsThreshold(2, 3, 75) === false);
check('750/1000 meets 75%', M.meetsThreshold(750, 1000, 75) === true);
check('749/1000 does not meet 75%', M.meetsThreshold(749, 1000, 75) === false);
check('0/0 meets (nothing conducted)', M.meetsThreshold(0, 0, 75) === true);
check('0/0 requires 0', M.requiredLectures(0, 0, 75) === 0);
// A percentage that displays as "75.00" but is actually below must not be
// reported as meeting the threshold.
check('7499/10000 displays 74.99 and fails', M.meetsThreshold(7499, 10000, 75) === false);

// ---------------------------------------------------------------------------
console.log('\n4. Degenerate thresholds');
// ---------------------------------------------------------------------------
check('100% with a perfect record requires 0', M.requiredLectures(10, 10, 100) === 0);
check('100% after one miss is unreachable', M.requiredLectures(10, 9, 100) === Infinity);
check('100% allows no bunks', M.bunksAvailable(10, 10, 100) === 0);
check('0% allows infinite bunks', M.bunksAvailable(10, 0, 0) === Infinity);
check('0% never requires anything', M.requiredLectures(10, 0, 0) === 0);

// ---------------------------------------------------------------------------
console.log('\n5. Malformed input is absorbed, not propagated');
// ---------------------------------------------------------------------------
check('NaN total -> 0', M.describe(NaN, 5, 75).total === 0);
check('negative total -> 0', M.describe(-5, 3, 75).total === 0);
check('attended clamped to total', M.describe(10, 99, 75).attended === 10);
check('undefined input survives', M.describe(undefined, undefined, 75).pct === 0);
check('string counts are parsed', M.describe('36', '35', 75).attended === 35);
check('percentage of 0 total is 0', M.percentage(5, 0) === 0);
check('out-of-range threshold clamps', M.scaleThreshold(150) === 10000);
check('negative threshold clamps', M.scaleThreshold(-10) === 0);

// ---------------------------------------------------------------------------
console.log('\n6. planRemaining consistency');
// ---------------------------------------------------------------------------
for (const t of [50, 75, 80]) {
    for (let total = 0; total <= 40; total += 3) {
        for (let attended = 0; attended <= total; attended += 2) {
            for (let rem = 0; rem <= 30; rem += 5) {
                const p = M.planRemaining(total, attended, rem, t);
                if (p.reachable) {
                    check(
                        'plan sufficient(' + total + ',' + attended + ',' + rem + ',' + t + ')',
                        meetsRef(attended + p.mustAttend, total + rem, t),
                        'mustAttend=' + p.mustAttend
                    );
                    if (p.mustAttend > 0) {
                        check(
                            'plan minimal(' + total + ',' + attended + ',' + rem + ',' + t + ')',
                            !meetsRef(attended + p.mustAttend - 1, total + rem, t),
                            'mustAttend=' + p.mustAttend
                        );
                    }
                    check(
                        'plan canMiss complements mustAttend',
                        p.mustAttend + p.canMiss === rem,
                        p.mustAttend + '+' + p.canMiss + ' != ' + rem
                    );
                } else {
                    check(
                        'plan unreachable is truly unreachable',
                        !meetsRef(attended + rem, total + rem, t),
                        String(total) + '/' + attended + ' +' + rem
                    );
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
console.log('\n7. project() agrees with describe()');
// ---------------------------------------------------------------------------
for (let a = 0; a <= 10; a++) {
    for (let m = 0; m <= 10; m++) {
        const p = M.project(36, 30, a, m, 75);
        const d = M.describe(36 + a + m, 30 + a, 75);
        check('project matches describe(' + a + ',' + m + ')',
            p.total === d.total && p.attended === d.attended && p.safe === d.meets);
    }
}

// ---------------------------------------------------------------------------
console.log('\n8. Real MIS data reproduces the official page numbers');
// ---------------------------------------------------------------------------
// Taken from view_stud_attendance.php / attendance.html in this repo.
const realTheory = [
    ['Theoretical Computer Science', 36, 35, '97.22'],
    ['Soft Computing', 39, 36, '92.31'],
    ['AI and Machine Learning', 43, 42, '97.67'],
    ['Cryptography and System Security', 36, 34, '94.44'],
    ['Basics of Marketing Management', 36, 31, '86.11']
];
let sumTotal = 0;
let sumAttended = 0;
for (const [name, total, attended, officialPct] of realTheory) {
    const d = M.describe(total, attended, 75);
    check('official pct ' + name, M.formatPct(d.pct) === officialPct,
        'computed ' + M.formatPct(d.pct) + ' vs page ' + officialPct);
    sumTotal += total;
    sumAttended += attended;
}
check('theory totals 190/178', sumTotal === 190 && sumAttended === 178,
    sumTotal + '/' + sumAttended);
check('overall theory 93.68%', M.formatPct(M.percentage(sumAttended, sumTotal)) === '93.68',
    M.formatPct(M.percentage(sumAttended, sumTotal)));
// Practical, from the same pages.
check('overall practical 89.83%', M.formatPct(M.percentage(53, 59)) === '89.83',
    M.formatPct(M.percentage(53, 59)));

// ---------------------------------------------------------------------------
console.log('\n' + (failed === 0 ? 'ALL PASSED' : 'FAILURES PRESENT'));
console.log('  passed: ' + passed.toLocaleString());
console.log('  failed: ' + failed.toLocaleString() + '\n');
process.exit(failed === 0 ? 0 : 1);

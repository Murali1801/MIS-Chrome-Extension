/**
 * attendance-math.js
 * ------------------
 * Exact, integer-only attendance arithmetic shared by the content script,
 * the popup and the test suite.
 *
 * WHY INTEGER MATH?
 * The earlier implementation used expressions like
 *     Math.ceil((0.75 * total - attended) / 0.25)
 * which bakes in a 75% threshold and relies on binary floating point landing
 * exactly on integer boundaries. That happens to hold for 0.75 (an exact binary
 * fraction) but breaks for thresholds such as 60%, 80% or 72.5%, where Math.ceil
 * can jump a whole lecture because the quotient came out as 12.000000000000002
 * instead of 12.
 *
 * Everything below works in hundredths of a percent: the threshold is held as
 * an integer `tp = round(thresholdPct * 100)` over a fixed SCALE of 10000. All
 * comparisons and divisions are then pure integer operations, so results are
 * exact for any threshold with up to two decimal places.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api; // node / tests
    root.AttendanceMath = api;                                             // browser
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const SCALE = 10000;          // 100% expressed in hundredths of a percent
    const DEFAULT_THRESHOLD = 75;

    function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

    /** Threshold percentage -> exact integer on the SCALE grid. */
    function scaleThreshold(thresholdPct) {
        const pct = Number(thresholdPct);
        if (!isFinite(pct)) return DEFAULT_THRESHOLD * 100;
        return Math.round(clamp(pct, 0, 100) * 100);
    }

    /** Exact floor division for integer operands. */
    function floorDiv(n, d) {
        const q = Math.trunc(n / d);
        return (n % d !== 0 && (n < 0) !== (d < 0)) ? q - 1 : q;
    }

    /** Exact ceiling division for integer operands. */
    function ceilDiv(n, d) {
        const q = Math.trunc(n / d);
        return (n % d !== 0 && (n < 0) === (d < 0)) ? q + 1 : q;
    }

    /** Coerce to a non-negative integer; anything unusable becomes 0. */
    function toCount(v) {
        const n = Math.trunc(Number(v));
        return isFinite(n) && n > 0 ? n : 0;
    }

    /**
     * Attendance percentage as an unrounded float, for display only.
     * Never use this to decide whether the threshold is met - use
     * meetsThreshold so the decision stays exact.
     */
    function percentage(attended, total) {
        total = toCount(total);
        if (total === 0) return 0;
        return (toCount(attended) / total) * 100;
    }

    /**
     * Exact threshold test: attended/total >= thresholdPct/100.
     * Cross-multiplied so 3/4 at a 75% threshold is a clean pass rather than a
     * coin flip on whether 74.99999999999999 rounds up.
     */
    function meetsThreshold(attended, total, thresholdPct) {
        const tp = scaleThreshold(thresholdPct);
        total = toCount(total);
        attended = toCount(attended);
        if (total === 0) return true;               // nothing conducted yet, nothing to fail
        return attended * SCALE >= tp * total;
    }

    /**
     * Consecutive lectures that must be attended from now on to reach the
     * threshold.
     *
     *   (attended + x) / (total + x) >= tp / SCALE
     *   => x * (SCALE - tp) >= tp * total - SCALE * attended
     *
     * Returns Infinity when the threshold is unreachable, which can only happen
     * at a 100% threshold once a lecture has already been missed.
     */
    function requiredLectures(total, attended, thresholdPct) {
        const tp = scaleThreshold(thresholdPct);
        total = toCount(total);
        attended = Math.min(toCount(attended), total);

        const deficit = tp * total - SCALE * attended;
        if (deficit <= 0) return 0;                 // already at or above threshold
        if (tp >= SCALE) return Infinity;           // 100% demanded but a lecture is already lost
        return Math.max(0, ceilDiv(deficit, SCALE - tp));
    }

    /**
     * Lectures that can still be missed while staying at or above threshold.
     *
     *   attended / (total + y) >= tp / SCALE
     *   => y * tp <= SCALE * attended - tp * total
     *
     * Returns Infinity at a 0% threshold, where nothing can drop you below.
     */
    function bunksAvailable(total, attended, thresholdPct) {
        const tp = scaleThreshold(thresholdPct);
        total = toCount(total);
        attended = Math.min(toCount(attended), total);

        if (tp <= 0) return Infinity;
        const surplus = SCALE * attended - tp * total;
        if (surplus < 0) return 0;                  // below threshold: nothing to spare
        return Math.max(0, floorDiv(surplus, tp));
    }

    /**
     * Semester planner. Given `remaining` lectures still to be conducted, how
     * many of them must be attended to finish at or above threshold?
     *
     *   (attended + k) / (total + remaining) >= tp / SCALE
     *
     * `reachable` is false when even a perfect record from here is not enough.
     */
    function planRemaining(total, attended, remaining, thresholdPct) {
        const tp = scaleThreshold(thresholdPct);
        total = toCount(total);
        attended = Math.min(toCount(attended), total);
        remaining = toCount(remaining);

        const finalTotal = total + remaining;
        const need = ceilDiv(tp * finalTotal - SCALE * attended, SCALE);

        return {
            remaining,
            finalTotal,
            mustAttend: clamp(need, 0, remaining),
            canMiss: Math.max(0, remaining - Math.max(0, need)),
            reachable: need <= remaining,
            bestCasePct: percentage(attended + remaining, finalTotal),
            worstCasePct: percentage(attended, finalTotal)
        };
    }

    /** "What if I attend A more and skip B more?" - the projected standing. */
    function project(total, attended, willAttend, willMiss, thresholdPct) {
        total = toCount(total);
        attended = Math.min(toCount(attended), total);
        willAttend = toCount(willAttend);
        willMiss = toCount(willMiss);

        const newTotal = total + willAttend + willMiss;
        const newAttended = attended + willAttend;
        return {
            total: newTotal,
            attended: newAttended,
            pct: percentage(newAttended, newTotal),
            safe: meetsThreshold(newAttended, newTotal, thresholdPct)
        };
    }

    /** Risk band for colour coding, relative to the configured threshold. */
    function riskBand(attended, total, thresholdPct) {
        total = toCount(total);
        if (total === 0) return 'none';
        if (!meetsThreshold(attended, total, thresholdPct)) {
            // More than 10 points under is genuinely hard to recover from.
            return percentage(attended, total) < Number(thresholdPct) - 10 ? 'critical' : 'below';
        }
        // Above threshold, but with no slack left a single absence breaks it.
        return bunksAvailable(total, attended, thresholdPct) === 0 ? 'tight' : 'safe';
    }

    /** Full per-subject record used by every table the extension renders. */
    function describe(total, attended, thresholdPct) {
        total = toCount(total);
        attended = Math.min(toCount(attended), total);
        return {
            total,
            attended,
            missed: total - attended,
            pct: percentage(attended, total),
            meets: meetsThreshold(attended, total, thresholdPct),
            required: requiredLectures(total, attended, thresholdPct),
            bunks: bunksAvailable(total, attended, thresholdPct),
            band: riskBand(attended, total, thresholdPct)
        };
    }

    /** Percentage rendered for display. Kept in one place so it never drifts. */
    function formatPct(value, digits) {
        if (!isFinite(value)) return '-';
        return value.toFixed(digits === undefined ? 2 : digits);
    }

    /** Infinity-aware integer rendering for the Required / Can-skip columns. */
    function formatCount(value) {
        if (value === Infinity) return '∞';
        if (!isFinite(value)) return '-';
        return String(value);
    }

    return {
        SCALE,
        DEFAULT_THRESHOLD,
        clamp,
        scaleThreshold,
        floorDiv,
        ceilDiv,
        percentage,
        meetsThreshold,
        requiredLectures,
        bunksAvailable,
        planRemaining,
        project,
        riskBand,
        describe,
        formatPct,
        formatCount
    };
});

// Date range presets. Every figure in the module is scoped by one of these.

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n) {
  return ymd(new Date(Date.now() - n * 86_400_000));
}

// Ranges end yesterday, not today: Meta's same-day figures are partial and keep moving, so
// including today makes every trend look like it fell off a cliff at the right edge.
export const RANGE_PRESETS = [
  { id: "last_7d", label: "Last 7 days", resolve: () => ({ since: daysAgo(7), until: daysAgo(1) }) },
  { id: "last_14d", label: "Last 14 days", resolve: () => ({ since: daysAgo(14), until: daysAgo(1) }) },
  { id: "last_30d", label: "Last 30 days", resolve: () => ({ since: daysAgo(30), until: daysAgo(1) }) },
  { id: "last_90d", label: "Last 90 days", resolve: () => ({ since: daysAgo(90), until: daysAgo(1) }) },
  {
    id: "this_month",
    label: "This month",
    resolve: () => {
      const now = new Date();
      return { since: ymd(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), until: daysAgo(1) };
    },
  },
  {
    id: "last_month",
    label: "Last month",
    resolve: () => {
      const now = new Date();
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      return { since: ymd(first), until: ymd(last) };
    },
  },
];

export const DEFAULT_PRESET = "last_30d";

export function resolveRange(presetId, custom) {
  if (presetId === "custom" && custom?.since && custom?.until) {
    // Guards against a hand-edited URL with the dates the wrong way round, which would
    // otherwise return an empty dashboard with no explanation.
    return custom.since <= custom.until
      ? { ...custom, id: "custom", label: "Custom" }
      : { since: custom.until, until: custom.since, id: "custom", label: "Custom" };
  }
  const preset = RANGE_PRESETS.find((p) => p.id === presetId) ?? RANGE_PRESETS.find((p) => p.id === DEFAULT_PRESET);
  return { ...preset.resolve(), id: preset.id, label: preset.label };
}

export function rangeLength(range) {
  return Math.round((Date.parse(range.until) - Date.parse(range.since)) / 86_400_000) + 1;
}

/**
 * The equally-long window immediately before `range`, which is what every delta on the
 * dashboard compares against. Comparing against a different-length window is the classic
 * way to make a "+40%" that only means "this period is longer".
 */
export function previousRange(range) {
  const length = rangeLength(range);
  const untilMs = Date.parse(range.since) - 86_400_000;
  return {
    since: ymd(new Date(untilMs - (length - 1) * 86_400_000)),
    until: ymd(new Date(untilMs)),
    label: `previous ${length} days`,
  };
}

/** Every date in the range, so charts show gaps as zero instead of closing over them. */
export function eachDay(range) {
  const out = [];
  for (let t = Date.parse(range.since); t <= Date.parse(range.until); t += 86_400_000) {
    out.push(ymd(new Date(t)));
  }
  return out;
}

"use client";

// Charts for the ERP, drawn as plain SVG.
//
// No charting library: the whole module needs a line chart, a horizontal bar list and a
// sparkline, and the smallest capable library is larger than this file and still needs this
// much wrapping to match the design. Marks follow the house data-viz spec — 2px lines, area
// wash at 10%, 4px rounded bar data-ends, hairline recessive grid, crosshair on hover and
// keyboard, and a table view under every figure so no value is hover-gated.

import { useEffect, useRef, useState } from "react";

export const SERIES_COLORS = ["var(--viz-series-1)", "var(--viz-series-2)", "var(--viz-series-3)"];

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // The ERP sidebar collapses at tablet width and tables expand on click, so the chart's
    // box changes without a window resize — an observer on the element is the only
    // measurement that keeps up.
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/**
 * An axis that ends on a round number AND divides into four round steps.
 *
 * Rounding only the maximum is not enough: a maximum of 10 split four ways gives ticks at
 * 2.5 and 7.5, which render as 3 and 8 once a count formatter rounds them — an axis that
 * reads 0, 3, 5, 8, 10. Snapping the *step* first and deriving the top from it keeps every
 * tick clean whatever the formatter does.
 */
function niceScale(value, intervals = 4) {
  if (!Number.isFinite(value) || value <= 0) return { top: 1, ticks: [0, 0.25, 0.5, 0.75, 1] };
  const rough = value / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10) * magnitude;
  const top = step * intervals;
  return { top, ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step) };
}

function DataTable({ columns, rows, caption }) {
  return (
    <details className="mt-3 border-t border-pine/10 pt-2">
      <summary className="cursor-pointer font-body text-xs text-pine-soft hover:text-pine">
        Show data table
      </summary>
      <div className="mt-2 max-h-64 overflow-auto">
        <table className="w-full border-collapse text-left font-body text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-pine/12">
              {columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="px-2 py-1.5 font-semibold tracking-[0.08em] text-pine-soft uppercase first:pl-0"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-pine/8 last:border-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-2 py-1.5 first:pl-0 ${j === 0 ? "text-pine-soft" : "text-pine [font-variant-numeric:tabular-nums]"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * A date-indexed line chart, one to three series.
 *
 * Three is a hard cap, not a soft one: the categorical palette is validated to three slots
 * against this surface, and a fourth would break the colourblind separation floor. It also
 * only ever plots series that share a unit — a second y-axis is never the answer, so spend
 * and lead count get two charts rather than one with two scales.
 */
export function TimeSeriesChart({
  series,
  formatValue = (v) => v,
  formatTick,
  height = 260,
  xLabel = "Date",
  emptyMessage = "No data in this range yet.",
}) {
  const [wrapperRef, width] = useElementWidth();
  const [active, setActive] = useState(null);
  const plotted = series.slice(0, SERIES_COLORS.length);

  const dates = plotted[0]?.points.map((p) => p.date) ?? [];
  const hasData = plotted.some((s) => s.points.some((p) => Number(p.value) > 0));

  // Left padding scales with the longest tick label so a 6-figure axis doesn't clip.
  const tickFormatter = formatTick ?? formatValue;
  const maxValue = Math.max(...plotted.flatMap((s) => s.points.map((p) => Number(p.value) || 0)), 0);
  const { top, ticks } = niceScale(maxValue);
  const padding = {
    top: 12,
    right: 16,
    bottom: 26,
    left: Math.min(88, 34 + String(tickFormatter(top)).length * 5.6),
  };

  const innerWidth = Math.max(width - padding.left - padding.right, 10);
  const innerHeight = height - padding.top - padding.bottom;

  // Plain functions and plain computation: the data behind one of these charts is at most a
  // few hundred points, and hand-written useMemo/useCallback here only blocked the React
  // Compiler from memoizing the component at all.
  const x = (index) =>
    padding.left + (dates.length <= 1 ? innerWidth / 2 : (index / (dates.length - 1)) * innerWidth);
  const y = (value) => padding.top + innerHeight - ((Number(value) || 0) / top) * innerHeight;

  const paths = plotted.map((s) => {
    const line = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
    const area = `${line} L${x(s.points.length - 1)},${padding.top + innerHeight} L${x(0)},${padding.top + innerHeight} Z`;
    return { line, area };
  });

  const onPointerMove = (event) => {
    if (!dates.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - rect.left - padding.left;
    // Snap to the nearest date rather than requiring the pointer to hit a 2px line.
    const index = Math.round((offset / innerWidth) * (dates.length - 1));
    setActive(Math.min(Math.max(index, 0), dates.length - 1));
  };

  const onKeyDown = (event) => {
    if (!dates.length) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((current) => {
        const base = current ?? (event.key === "ArrowRight" ? -1 : dates.length);
        return Math.min(Math.max(base + (event.key === "ArrowRight" ? 1 : -1), 0), dates.length - 1);
      });
    }
    if (event.key === "Escape") setActive(null);
  };

  const tickCount = Math.min(6, dates.length);
  const xTickIndexes =
    dates.length <= 1
      ? [0]
      : Array.from({ length: tickCount }, (_, i) => Math.round((i / (tickCount - 1)) * (dates.length - 1)));

  const tableRows = dates.map((date, i) => [date, ...plotted.map((s) => formatValue(s.points[i]?.value ?? 0))]);

  return (
    <div className="viz-root">
      {plotted.length > 1 && (
        // Legend for two or more series: identity must never rest on colour alone.
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {plotted.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5 font-body text-xs text-pine-soft">
              <span
                aria-hidden
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ background: s.color ?? SERIES_COLORS[i] }}
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div ref={wrapperRef} className="relative">
        {!hasData && (
          <p className="absolute inset-0 flex items-center justify-center font-body text-sm text-pine-soft">
            {emptyMessage}
          </p>
        )}
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${plotted.map((s) => s.label).join(", ")} by ${xLabel.toLowerCase()}. Values are listed in the data table below.`}
            tabIndex={0}
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={onKeyDown}
            className="touch-none outline-none focus-visible:ring-2 focus-visible:ring-moss"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                {/* Hairline, solid, one step off the surface — present but never competing. */}
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="var(--viz-grid)"
                  strokeWidth="1"
                />
                <text x={padding.left - 8} y={y(tick) + 3.5} textAnchor="end" className="fill-pine-soft text-[10px] [font-variant-numeric:tabular-nums]">
                  {tickFormatter(tick)}
                </text>
              </g>
            ))}

            {xTickIndexes.map((index) => (
              <text
                key={index}
                x={x(index)}
                y={height - 8}
                textAnchor={index === 0 ? "start" : index === dates.length - 1 ? "end" : "middle"}
                className="fill-pine-soft text-[10px]"
              >
                {dates[index]?.slice(5)}
              </text>
            ))}

            {hasData &&
              plotted.map((s, i) => (
                <g key={s.id}>
                  <path d={paths[i].area} fill={s.color ?? SERIES_COLORS[i]} fillOpacity="0.1" />
                  <path
                    d={paths[i].line}
                    fill="none"
                    stroke={s.color ?? SERIES_COLORS[i]}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* End marker, ringed in the surface colour so it stays legible where
                      series converge. */}
                  <circle
                    cx={x(s.points.length - 1)}
                    cy={y(s.points.at(-1)?.value ?? 0)}
                    r="4"
                    fill={s.color ?? SERIES_COLORS[i]}
                    stroke="var(--viz-surface)"
                    strokeWidth="2"
                  />
                </g>
              ))}

            {active !== null && hasData && (
              <g>
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={padding.top}
                  y2={padding.top + innerHeight}
                  stroke="var(--viz-ink-soft)"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
                {plotted.map((s, i) => (
                  <circle
                    key={s.id}
                    cx={x(active)}
                    cy={y(s.points[active]?.value ?? 0)}
                    r="4.5"
                    fill={s.color ?? SERIES_COLORS[i]}
                    stroke="var(--viz-surface)"
                    strokeWidth="2"
                  />
                ))}
              </g>
            )}
          </svg>
        )}

        {active !== null && hasData && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-sm border border-pine/15 bg-bone px-2.5 py-2 shadow-sm"
            style={{
              // Flips to the left of the crosshair past the midpoint so the readout never
              // hangs off the card.
              left: x(active) > width / 2 ? undefined : x(active) + 12,
              right: x(active) > width / 2 ? width - x(active) + 12 : undefined,
            }}
          >
            <p className="mb-1 font-body text-[11px] text-pine-soft">{dates[active]}</p>
            {plotted.map((s, i) => (
              <p key={s.id} className="flex items-baseline gap-2 font-body">
                <span aria-hidden className="inline-block h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color ?? SERIES_COLORS[i] }} />
                {/* Value leads, label follows: the reader already knows the series. */}
                <span className="text-sm font-semibold text-pine">{formatValue(s.points[active]?.value ?? 0)}</span>
                {plotted.length > 1 && <span className="text-[11px] text-pine-soft">{s.label}</span>}
              </p>
            ))}
          </div>
        )}
      </div>

      <DataTable
        columns={[xLabel, ...plotted.map((s) => s.label)]}
        rows={tableRows}
        caption={`${plotted.map((s) => s.label).join(", ")} by ${xLabel.toLowerCase()}`}
      />
    </div>
  );
}

/**
 * Ranked horizontal bars — the right form for "which campaigns cost the most", where the
 * category labels are long and the comparison is magnitude.
 */
export function BarList({ items, formatValue = (v) => v, label = "Value", emptyMessage = "Nothing to rank yet." }) {
  const { top } = niceScale(Math.max(...items.map((i) => Number(i.value) || 0), 0));

  if (!items.length) {
    return <p className="py-8 text-center font-body text-sm text-pine-soft">{emptyMessage}</p>;
  }

  return (
    <div className="viz-root">
      <ul className="space-y-2.5">
        {items.map((item) => {
          const share = top > 0 ? (Number(item.value) || 0) / top : 0;
          return (
            <li key={item.id ?? item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate font-body text-xs text-pine" title={item.label}>
                  {item.label}
                </span>
                {/* Direct label at the tip; this is also the relief that keeps the value
                    readable when the bar colour is below 3:1 against the surface. */}
                <span className="shrink-0 font-body text-xs font-semibold text-pine [font-variant-numeric:tabular-nums]">
                  {formatValue(item.value)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-sm bg-pine/6">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${Math.max(share * 100, share > 0 ? 1.5 : 0)}%`, background: SERIES_COLORS[0] }}
                />
              </div>
              {item.secondary && <p className="mt-0.5 font-body text-[11px] text-pine-soft">{item.secondary}</p>}
            </li>
          );
        })}
      </ul>
      <DataTable
        columns={["Name", label]}
        rows={items.map((i) => [i.label, formatValue(i.value)])}
        caption={`${label} by name`}
      />
    </div>
  );
}

/** 12-point trend for a stat tile. Decorative by contract — the tile's value carries the number. */
export function Sparkline({ points, width = 84, height = 24, color = SERIES_COLORS[0] }) {
  const values = points.map((p) => Number(p.value) || 0);
  const max = Math.max(...values, 0);
  if (!values.length || max === 0) return <div style={{ width, height }} aria-hidden />;

  const step = values.length > 1 ? width / (values.length - 1) : width;
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${i * step},${height - 2 - (v / max) * (height - 4)}`)
    .join(" ");

  return (
    <svg width={width} height={height} aria-hidden className="viz-root overflow-visible">
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} fillOpacity="0.08" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

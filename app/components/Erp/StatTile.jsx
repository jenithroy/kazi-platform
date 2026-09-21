"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Sparkline } from "./Charts";

const DELTA_TONES = {
  good: "text-moss-deep",
  bad: "text-red-700",
  neutral: "text-pine-soft",
};

/**
 * One headline figure: label, value, change against the comparison window, trend.
 *
 * The change carries an arrow and a signed number as well as its colour, so "down 12%" is
 * still readable when the colour isn't — and the colour means *better or worse*, not up or
 * down, because a falling cost per lead is good news and should not be red.
 */
export function StatTile({ label, value, delta, comparisonLabel, spark, note, onClick, selected }) {
  const Wrapper = onClick ? "button" : "div";
  const tone = DELTA_TONES[delta?.tone ?? "neutral"];
  const Arrow = delta?.direction === "down" ? ArrowDown : ArrowUp;

  return (
    <Wrapper
      {...(onClick
        ? { type: "button", onClick, "aria-pressed": selected }
        : {})}
      className={`flex w-full flex-col gap-2 rounded-sm border px-4 py-3.5 text-left transition-colors ${
        selected ? "border-moss bg-moss/8" : "border-pine/12 bg-bone"
      } ${onClick ? "hover:border-pine/30" : ""}`}
    >
      <span className="font-body text-[11px] tracking-[0.1em] text-pine-soft uppercase">{label}</span>

      <div className="flex items-end justify-between gap-3">
        {/* Proportional figures on purpose: tabular digits look loose at this size and are
            only needed where numbers stack in a column. */}
        <span className="font-body text-2xl leading-none font-semibold text-pine">{value}</span>
        {spark?.length ? <Sparkline points={spark} /> : null}
      </div>

      <div className="flex min-h-4 items-center gap-1.5 font-body text-[11px]">
        {delta?.isNew ? (
          <span className="text-pine-soft">New this period</span>
        ) : delta ? (
          <>
            <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
              <Arrow size={11} aria-hidden />
              {delta.change >= 0 ? "+" : "−"}
              {Math.abs(delta.change).toFixed(1)}%
            </span>
            <span className="text-pine-soft">vs {comparisonLabel}</span>
          </>
        ) : (
          <span className="text-pine-soft">{note ?? "No comparison"}</span>
        )}
      </div>
    </Wrapper>
  );
}

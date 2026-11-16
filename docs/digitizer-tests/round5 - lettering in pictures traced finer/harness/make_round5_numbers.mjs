// Writes the round-5 "numbers" files from the two final bench logs (final3.log: reader, final4.log: shapes, census, timing), so nothing is retyped by hand.
// usage: node make_round5_numbers.mjs
import fs from "node:fs";
import path from "node:path";
const SP = "<SESSION>/scratchpad";
const R = "<RESULTS>/round5 - lettering in pictures traced finer/numbers";
const read = (f) => fs.readFileSync(path.join(SP, "rough", f), "utf8").replace(/\r/g, "");
const log3 = read("final3.log"), log4 = read("final4.log");

// the lines of the section whose "##### " header starts with `title`
const section = (log, title) => {
  const lines = log.split("\n");
  const i = lines.findIndex((l) => l.startsWith("##### " + title));
  if (i < 0) throw new Error("no section: " + title);
  const out = [];
  for (let k = i + 1; k < lines.length && !lines[k].startsWith("##### "); k++) out.push(lines[k]);
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
};
const put = (name, parts) => {
  fs.writeFileSync(path.join(R, name), parts.flat().join("\n") + "\n", "utf8");
  console.log("wrote", name);
};

// ---- 1. the 143 drawn pictures
const t1 = section(log3, "lettering pictures (143)").map((l) =>
  l.replace("picture       now      dade       fin        r8", "picture       old      DADE    before       now"));
put("1_reader_drawn_pictures_picture_old_DADE_before_now.txt", [
  ["Characters the reader gets wrong, lower is better. 143 drawn pictures of lettering (134 of them are read: the rest are patterns)."],
  ["Columns: 'picture' = the drawing itself read by the reader (the ceiling), 'old' = the old rules (before round 4), 'DADE' = DADE's own stitches,",
   "'before' = the page as it was at the end of round 4, 'now' = the page with the second, finer tracing of lettering and short words (round 5, final code)."],
  [""], t1,
]);

// ---- 2. shape accuracy by stage
put("2_shape_accuracy_by_stage_before_and_now.txt", [
  ["Shape accuracy by stage on the 108 one-line drawn pictures (10 px to the mm; true ink from the drawing). recall = share of the true ink covered, precision = share of the covered that is true ink,",
   "weight = area against the true ink, edge = mean distance the edge is out by (mm), pieces = ink pieces found against the true count.",
   "'trace' = the tracer's shapes, 'stitch' = the stitched render (a 0.45 mm thread; its floor is about 0.07 mm). (The 'objects' columns of the script are not meaningful and are left out.)"],
  [""], section(log4, "shape accuracy by stage, before and now"),
]);

// ---- 3. weights
const t3 = section(log3, "weights, pictures").map((l) => l.replace("now             fin              r8", "old          before             now"));
put("3_stitched_weight_of_lettering_in_pictures_old_before_now.txt", [
  ["Weights of the stitched lettering: old rules, before, now. 108 one-line pictures."], [""], t3,
]);

// ---- 4. three margins
const t4 = section(log3, "badge and outline pictures, three margins").map((l) =>
  l.replace(/^now /, "old rules ").replace(/^fin /, "before    ").replace(/^r8 /, "now       "));
put("4_badge_and_outline_three_margins_old_before_now.txt", [
  ["The reader's mean error on badge and outline pictures, read with three different margins around the lettering (the reader is sensitive to what surrounds the text). Lower is better."], [""], t4,
]);

// ---- 5. messy pictures
const t5 = section(log3, "messy copies").map((l) =>
  l.startsWith("character error") ? "character error (lower is better)     picture  JPEG50_before  JPEG50_now  half_before  half_now" : l);
put("5_messy_pictures_reader_JPEG50_and_half_size.txt", [
  ["The same drawn pictures spoiled the way a web logo is. Columns: the picture itself (clean, the ceiling); JPEG quality 50 with the first tracing alone (before) and with the second tracing (now);",
   "half size + JPEG 65, enlarged again, with the first tracing alone (before) and with the second tracing (now). Characters the reader gets wrong, lower is better."],
  [""], t5,
]);

// ---- 7. census
put("7_how_often_the_second_tracing_is_used.txt", [
  ["How often the second tracing is used, refused, or not tried, counted on the 134 drawn pictures of one line, a badge or outlined letters (the rest of the 143 are patterns). Final code."],
  ["  'used'    = the letters were found again and the second tracing replaced the first for the lettering's colour"],
  ["  'refused' = the letters were not found again, or the lettering's colour turned into a crowd of pieces: the picture keeps the first tracing"],
  ["  'none'    = the first tracing finds no lettering to look at again (lettering over 8 mm, patterns, ...)"],
  [""], section(log4, "how often the second tracing is used"),
  [""], ["Where lettering is found in the other benches (first tracing against the final code; refined = found and used, refused, none):"],
  section(log4, "where lettering is found"),
]);

// ---- 8. timing
put("8_time_the_second_tracing_costs.txt", [
  ["Tracing time on a quiet machine, the first tracing alone ('off') against the first plus the second ('on'); stats.refine of the 'on' run on the right. 'found' says which tracing the lettering blocks were found on."],
  [""], section(log4, "timing on the quiet machine"),
]);

// ---- 9. 18 other fonts
const t9 = section(log3, "18 fonts as pictures").map((l) =>
  l.startsWith("character error") ? "character error (lower is better)      picture       before          now  DADE(typed2)" : l);
put("9_other_18_fonts_as_pictures_before_now_DADE.txt", [
  ["18 other open-licence fonts (not the 9 the engine was tuned on) drawn as pictures of lettering (navy on white, 10 px to the mm), 3-6 mm capitals, two texts, 144 pictures; DADE was run on the same glyphs (140 read)."],
  ["Characters the reader gets wrong, lower is better. 'before' = the page at the end of round 4, 'now' = round 5."],
  [""], t9,
]);

// ---- 10. short words
put("10_short_words_before_now_DADE.txt", [
  ["Short words (BMW, KAZI, OPEN, SALE) in 9 fonts, 3, 4 and 6 mm capitals, 108 pictures. Characters the reader gets wrong, lower is better. 'before' = the page at the end of round 4, 'now' = round 5."],
  [""], section(log3, "short words (108)").map((l) => l.replace("      picture        s_off           s4", "      picture       before          now")),
  [""], ["The 48 of these that the reader could also read on DADE's stitches (3 and 4 mm only):"],
  section(log3, "short words on the 48 DADE read").map((l) => l.replace("ours_befor   ours_now", "ours_before  ours_now")),
  [""], ["Still weak (said plainly): the heavy condensed font's short words (0.667 -> 0.549: most of them are still not found as lettering), the script font's (0.215 -> 0.208; on the 8 script pictures both could be read, DADE gets 0.156 and we get 0.281) and the word 'Open' (0.146 against DADE's 0.083)."],
]);

// ---- 11. mixed backgrounds
put("11_mixed_backgrounds_before_now.txt", [
  ["The 36 line pictures (6 fonts, 3/4/6 mm, two texts) with the ground spoiled the way a real logo's is: a colour gradient, a drop shadow, a paper texture (noise, a little blur, JPEG). 108 pictures. Lower is better."],
  ["'before' = the page at the end of round 4, 'now' = round 5."],
  [""], section(log3, "mixed backgrounds (108)").map((l) => l.replace("      picture        m_off        m_on2", "      picture       before          now")),
  [""], ["By kind of mess (mean character error, 36 pictures each):"],
  section(log4, "mixed backgrounds by kind of mess"),
]);

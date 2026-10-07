export type RollOption = { meters: number; sku: string };
export type RollPick = { sku: string; meters: number; count: number };

// Same candidate set as the legacy Excel (greedy mix + one option per roll size),
// picking least waste and then fewest rolls. Unlike the Excel, every candidate covers the full length.
export function pickRolls(required: number, options: RollOption[]): RollPick[] {
  if (required <= 0 || options.length === 0) return [];
  const sizes = [...options].sort((a, b) => b.meters - a.meters);

  const candidates: RollPick[][] = [];

  const greedy: RollPick[] = [];
  let rem = required;
  sizes.forEach((opt, i) => {
    const next = sizes[i + 1];
    let n: number;
    if (next) n = rem > next.meters ? Math.max(1, Math.floor(rem / opt.meters)) : 0;
    else n = Math.ceil(rem / opt.meters);
    if (n > 0) greedy.push({ sku: opt.sku, meters: opt.meters, count: n });
    rem = Math.max(0, rem - n * opt.meters);
  });
  candidates.push(greedy);

  for (const opt of sizes) candidates.push([{ sku: opt.sku, meters: opt.meters, count: Math.ceil(required / opt.meters) }]);

  const score = (c: RollPick[]) => ({
    waste: c.reduce((s, r) => s + r.count * r.meters, 0) - required,
    rolls: c.reduce((s, r) => s + r.count, 0),
  });
  let best = candidates[0];
  let bestScore = score(best);
  for (const c of candidates.slice(1)) {
    const s = score(c);
    if (s.waste < bestScore.waste || (s.waste === bestScore.waste && s.rolls < bestScore.rolls)) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

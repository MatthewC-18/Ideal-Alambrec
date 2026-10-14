export type RollOption = { meters: number; sku: string };
export type RollPick = { sku: string; meters: number; count: number };

// Same algorithm as the legacy Excel ("Calculo" sheet, columns U:AD): one greedy mix plus one
// single-size option per roll, keeping the least waste, then the fewest rolls, then the first candidate.
// The Excel then prints only one roll line (highest code, highest count); here every roll of the
// chosen combination is quoted.
export function pickRolls(required: number, options: RollOption[]): RollPick[] {
  if (required <= 0 || options.length === 0) return [];
  const sizes = [...options].sort((a, b) => b.meters - a.meters);

  // Greedy mix, formula by formula: IF(rem > next, IF(rem/size < 1, 1, FLOOR(rem/size)), 0);
  // the smallest roll is always at least 1: IF(rem/size < 1, 1, FLOOR(rem/size)).
  const greedy: RollPick[] = [];
  let rem = required;
  sizes.forEach((opt, i) => {
    const next = sizes[i + 1];
    const n = next && !(rem > next.meters) ? 0 : rem / opt.meters < 1 ? 1 : Math.floor(rem / opt.meters);
    if (n > 0) greedy.push({ sku: opt.sku, meters: opt.meters, count: n });
    rem = n * opt.meters > rem ? 0 : rem - n * opt.meters;
  });

  const candidates: RollPick[][] = [greedy, ...sizes.map((opt) => [{ sku: opt.sku, meters: opt.meters, count: Math.ceil(required / opt.meters) }])];
  const score = (c: RollPick[]) => ({
    waste: c.reduce((s, r) => s + r.count * r.meters, 0) - required,
    rolls: c.reduce((s, r) => s + r.count, 0),
  });
  let best: RollPick[] | null = null;
  let bestScore = { waste: Infinity, rolls: Infinity };
  for (const c of candidates) {
    const s = score(c);
    // Never quote less wire than needed (cannot happen with the standard 500/400/300/200 rolls).
    if (s.waste < -1e-9) continue;
    if (s.waste < bestScore.waste || (s.waste === bestScore.waste && s.rolls < bestScore.rolls)) {
      best = c;
      bestScore = s;
    }
  }
  return best ?? [];
}

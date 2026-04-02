/**
 * SCOUT Strategy Lab
 * Two explicit backtested strategies with full methodology transparency.
 *
 * Strategy 1: VIX Spike Entry — Buy SPY when fear spikes
 * Strategy 2: Gold/Silver Ratio Compression — Long SIL when ratio is stretched
 */

// ---------------------------------------------------------------------------
// VIX ENTRY STRATEGY
// ---------------------------------------------------------------------------
// Idea: Market fear (VIX) spikes create entry opportunities in equities.
//       When VIX crosses a threshold, buy SPY and hold for a fixed window.
//
// Economic rationale:
//   - VIX spikes reflect extreme risk aversion, often overshooting fundamentals
//   - Historically, sharp VIX expansions tend to mean-revert
//   - Forward equity returns after VIX > 25 have been above-average historically
//   - This is a classic counter-trend entry setup, NOT a trend-following one
//
// Rules:
//   - Entry: VIX closes >= threshold on day T
//   - No pyramiding: one active trade at a time
//   - Exit: after N trading days (fixed horizon) OR if VIX drops below normalizeLevel
//   - Re-entry: allowed after cooldown (1 day after prior exit)
//
// Return computation:
//   - Forward return = SPY price at exit / SPY price at entry - 1
//   - Compounded: each trade is sized as a % of 100 units, not compounded together
//   - No transaction cost assumption (transparent)
// ---------------------------------------------------------------------------

export function runVixStrategy({ vixSeries, spySeries, threshold = 25, horizon = 20, normalizeLevel = null }) {
  if (!vixSeries?.length || !spySeries?.length) return buildEmptyVixResult(threshold, horizon);

  // Align dates
  const spyByDate = new Map(spySeries.map((p) => [p.date, p.value]));
  const aligned = vixSeries
    .map((p) => ({ date: p.date, vix: p.value, spy: spyByDate.get(p.date) }))
    .filter((p) => Number.isFinite(p.vix) && Number.isFinite(p.spy));

  if (aligned.length < horizon + 5) return buildEmptyVixResult(threshold, horizon);

  const exitLevel = normalizeLevel ?? threshold * 0.72; // default: exit when VIX falls 28% from entry level
  const trades = [];
  let inTrade = false;
  let entryIdx = -1;
  let cooldown = 0;

  for (let i = 0; i < aligned.length - horizon; i++) {
    if (cooldown > 0) { cooldown--; continue; }
    if (inTrade) {
      const daysIn = i - entryIdx;
      const vixNormalized = aligned[i].vix < exitLevel;
      if (daysIn >= horizon || vixNormalized) {
        const entry = aligned[entryIdx];
        const exit = aligned[i];
        const ret = exit.spy / entry.spy - 1;
        const exitReason = daysIn >= horizon ? `${horizon}D horizon` : `VIX normalized (${exit.vix.toFixed(1)} < ${exitLevel.toFixed(1)})`;
        trades.push({
          entryDate: entry.date,
          exitDate: exit.date,
          entryVix: entry.vix,
          entrySpyPrice: entry.spy,
          exitSpyPrice: exit.spy,
          daysHeld: daysIn,
          returnPct: ret * 100,
          exitReason,
        });
        inTrade = false;
        cooldown = 1;
      }
      continue;
    }
    if (aligned[i].vix >= threshold) {
      inTrade = true;
      entryIdx = i;
    }
  }

  if (!trades.length) return buildEmptyVixResult(threshold, horizon);

  const returns = trades.map((t) => t.returnPct);
  const wins = trades.filter((t) => t.returnPct > 0).length;
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const maxReturn = Math.max(...returns);
  const minReturn = Math.min(...returns);
  const maxDrawdown = minReturn; // approximate: worst single trade
  const winRate = (wins / trades.length) * 100;

  // Distribution buckets
  const buckets = buildReturnDistribution(returns);

  // Cumulative return series (hypothetical $100 per trade)
  let equity = 100;
  const equityCurve = trades.map((t) => {
    equity *= 1 + t.returnPct / 100;
    return { date: t.exitDate, value: roundNum(equity) };
  });

  return {
    strategy: "vix-entry",
    params: { threshold, horizon, exitLevel: roundNum(exitLevel) },
    tradeCount: trades.length,
    winRate: roundNum(winRate),
    avgReturn: roundNum(avgReturn),
    maxReturn: roundNum(maxReturn),
    minReturn: roundNum(minReturn),
    maxDrawdown: roundNum(maxDrawdown),
    trades,
    buckets,
    equityCurve,
    dataRange: { start: aligned[0].date, end: aligned[aligned.length - 1].date },
  };
}

function buildEmptyVixResult(threshold, horizon) {
  return {
    strategy: "vix-entry",
    params: { threshold, horizon },
    tradeCount: 0,
    winRate: null,
    avgReturn: null,
    maxReturn: null,
    minReturn: null,
    maxDrawdown: null,
    trades: [],
    buckets: [],
    equityCurve: [],
    dataRange: null,
  };
}

// ---------------------------------------------------------------------------
// GOLD / SILVER RATIO STRATEGY (SIL)
// ---------------------------------------------------------------------------
// Idea: When gold/silver ratio is high, silver is historically cheap relative to gold.
//       Silver miners (SIL) tend to outperform when this ratio compresses.
//
// Economic rationale:
//   - The gold/silver ratio oscillates around 60-80 historically
//   - Extremes (>75) often signal silver is undervalued relative to gold
//   - When ratio compresses (silver outperforms gold), SIL gets leveraged upside
//   - This is a mean-reversion + relative value setup
//
// Rules:
//   - Entry: gold/silver ratio >= entryRatio (default 75)
//   - Exit: ratio <= exitRatio (default 50) OR maxDays exceeded (default 180D)
//   - SIL is the vehicle (silver miners, higher beta to silver)
//   - Re-entry: after prior exit + 1 day cooldown
//
// Return computation:
//   - Trade return = SIL price at exit / SIL price at entry - 1
//   - Ratio computed daily as: GLD price / SLV price (both normalized per oz equivalent)
// ---------------------------------------------------------------------------

export function runGoldSilverRatioStrategy({ gldSeries, slvSeries, silSeries, entryRatio = 75, exitRatio = 50, maxDays = 180 }) {
  if (!gldSeries?.length || !slvSeries?.length || !silSeries?.length) return buildEmptyGoldSilverResult(entryRatio, exitRatio);

  // Build daily ratio from GLD/SLV prices (adjust for oz-equivalent: GLD ≈ 1/10 oz, SLV ≈ 1 oz)
  // GLD tracks ~1/10th oz gold, SLV tracks ~1 oz silver. Ratio formula: (GLD * 10) / SLV
  const slvByDate = new Map(slvSeries.map((p) => [p.date, p.value]));
  const silByDate = new Map(silSeries.map((p) => [p.date, p.value]));

  const aligned = gldSeries
    .map((p) => {
      const slv = slvByDate.get(p.date);
      const sil = silByDate.get(p.date);
      if (!Number.isFinite(slv) || !Number.isFinite(sil) || slv <= 0) return null;
      const ratio = (p.value * 10) / slv; // GLD holds ~1/10 troy oz
      return { date: p.date, ratio: roundNum(ratio), gld: p.value, slv, sil };
    })
    .filter(Boolean);

  if (aligned.length < 30) return buildEmptyGoldSilverResult(entryRatio, exitRatio);

  const trades = [];
  let inTrade = false;
  let entryIdx = -1;
  let cooldown = 0;

  for (let i = 0; i < aligned.length; i++) {
    if (cooldown > 0) { cooldown--; continue; }
    if (inTrade) {
      const daysIn = i - entryIdx;
      const ratioNormalized = aligned[i].ratio <= exitRatio;
      const timeExpired = daysIn >= maxDays;
      if (ratioNormalized || timeExpired) {
        const entry = aligned[entryIdx];
        const exit = aligned[i];
        const ret = exit.sil / entry.sil - 1;
        const ratioChange = exit.ratio - entry.ratio;
        const exitReason = ratioNormalized
          ? `Ratio compressed to ${exit.ratio.toFixed(1)} (≤ ${exitRatio})`
          : `Max holding period (${maxDays}D) reached`;
        trades.push({
          entryDate: entry.date,
          exitDate: exit.date,
          entryRatio: roundNum(entry.ratio),
          exitRatio: roundNum(exit.ratio),
          ratioChange: roundNum(ratioChange),
          entrySilPrice: roundNum(entry.sil),
          exitSilPrice: roundNum(exit.sil),
          daysHeld: daysIn,
          returnPct: roundNum(ret * 100),
          exitReason,
        });
        inTrade = false;
        cooldown = 1;
      }
      continue;
    }
    if (aligned[i].ratio >= entryRatio) {
      inTrade = true;
      entryIdx = i;
    }
  }

  if (!trades.length) return buildEmptyGoldSilverResult(entryRatio, exitRatio);

  const returns = trades.map((t) => t.returnPct);
  const wins = trades.filter((t) => t.returnPct > 0).length;
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const maxReturn = Math.max(...returns);
  const minReturn = Math.min(...returns);
  const winRate = (wins / trades.length) * 100;

  // Build ratio history series (full, not just trades)
  const ratioHistory = aligned.map((p) => ({ date: p.date, value: p.ratio }));

  // Cumulative equity curve
  let equity = 100;
  const equityCurve = trades.map((t) => {
    equity *= 1 + t.returnPct / 100;
    return { date: t.exitDate, value: roundNum(equity) };
  });

  const buckets = buildReturnDistribution(returns);

  return {
    strategy: "gold-silver-ratio",
    params: { entryRatio, exitRatio, maxDays },
    tradeCount: trades.length,
    winRate: roundNum(winRate),
    avgReturn: roundNum(avgReturn),
    maxReturn: roundNum(maxReturn),
    minReturn: roundNum(minReturn),
    maxDrawdown: roundNum(minReturn),
    trades,
    buckets,
    equityCurve,
    ratioHistory,
    dataRange: { start: aligned[0].date, end: aligned[aligned.length - 1].date },
  };
}

function buildEmptyGoldSilverResult(entryRatio, exitRatio) {
  return {
    strategy: "gold-silver-ratio",
    params: { entryRatio, exitRatio },
    tradeCount: 0,
    winRate: null,
    avgReturn: null,
    maxReturn: null,
    minReturn: null,
    maxDrawdown: null,
    trades: [],
    buckets: [],
    equityCurve: [],
    ratioHistory: [],
    dataRange: null,
  };
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function buildReturnDistribution(returns) {
  const buckets = [
    { label: "< -10%", min: -Infinity, max: -10, count: 0 },
    { label: "-10% to -5%", min: -10, max: -5, count: 0 },
    { label: "-5% to 0%", min: -5, max: 0, count: 0 },
    { label: "0% to 5%", min: 0, max: 5, count: 0 },
    { label: "5% to 10%", min: 5, max: 10, count: 0 },
    { label: "> 10%", min: 10, max: Infinity, count: 0 },
  ];
  for (const r of returns) {
    const bucket = buckets.find((b) => r >= b.min && r < b.max);
    if (bucket) bucket.count++;
  }
  return buckets.map(({ label, count }) => ({ label, count }));
}

function roundNum(v) {
  return Math.round(v * 100) / 100;
}

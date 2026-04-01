export const SCOUT_BUCKETS = {
  HIGH_PRIORITY: "Bucket A",
  NEXT_WAVE: "Bucket B",
  RESEARCH: "Bucket C",
  REFERENCE: "Bucket D",
};

export const SCOUT_IMPLEMENTATION_STATUS = {
  LIVE: "live",
  PARTIALLY_LIVE: "partially-live",
  SIMULATED: "simulated",
  RESEARCH_ONLY: "research-only",
};

export const SCOUT_DATA_STATUS = {
  LIVE: "live",
  DELAYED: "delayed",
  SIMULATED: "simulated",
  RESEARCH_ONLY: "research-only",
};

export function createStrategyDefinition(definition) {
  return {
    id: definition.id,
    name: definition.name,
    family: definition.family,
    bucket: definition.bucket,
    assetClass: definition.assetClass,
    shortDescription: definition.shortDescription,
    relationship: definition.relationship,
    requiredDataInputs: [...(definition.requiredDataInputs || [])],
    implementationStatus: definition.implementationStatus,
    backtestAvailable: Boolean(definition.backtestAvailable),
    caveats: [...(definition.caveats || [])],
    pdfAnchors: [...(definition.pdfAnchors || [])],
    tags: [...(definition.tags || [])],
  };
}

export function createStrategyStatus(status) {
  return {
    strategyId: status.strategyId,
    dataStatus: status.dataStatus,
    freshnessLabel: status.freshnessLabel,
    coverageLabel: status.coverageLabel,
    notes: status.notes || "",
  };
}

export function createBacktestResult(result) {
  return {
    strategyId: result.strategyId,
    opportunityId: result.opportunityId || result.strategyId,
    title: result.title,
    testPeriod: result.testPeriod,
    universe: result.universe,
    signalDefinition: result.signalDefinition,
    entryRule: result.entryRule,
    exitRule: result.exitRule,
    holdingPeriod: result.holdingPeriod,
    transactionCostAssumption: result.transactionCostAssumption,
    slippageAssumption: result.slippageAssumption,
    grossReturn: sanitizeNumber(result.grossReturn),
    netReturn: sanitizeNumber(result.netReturn),
    sharpe: sanitizeNumber(result.sharpe),
    hitRate: sanitizeNumber(result.hitRate),
    maxDrawdown: sanitizeNumber(result.maxDrawdown),
    turnover: sanitizeNumber(result.turnover),
    sampleSize: sanitizeNumber(result.sampleSize),
    robustnessNotes: result.robustnessNotes || "",
    regimeCompatibility: result.regimeCompatibility || "",
    implementationStatus: result.implementationStatus,
  };
}

export function createScorecard(scorecard) {
  return {
    signalStrength: clampScore(scorecard.signalStrength),
    historicalEfficacy: clampScore(scorecard.historicalEfficacy),
    robustness: clampScore(scorecard.robustness),
    liquidityTradability: clampScore(scorecard.liquidityTradability),
    costSensitivity: clampScore(scorecard.costSensitivity),
    regimeFit: clampScore(scorecard.regimeFit),
    dataQuality: clampScore(scorecard.dataQuality),
    portfolioRelevance: clampScore(scorecard.portfolioRelevance),
    riskPenalty: clampPenalty(scorecard.riskPenalty),
    backtestScore: clampScore(scorecard.backtestScore),
    liveOpportunityScore: clampScore(scorecard.liveOpportunityScore),
    compositeScoutScore: clampScore(scorecard.compositeScoutScore),
  };
}

export function createOpportunity(opportunity) {
  return {
    id: opportunity.id,
    strategyId: opportunity.strategyId,
    strategyName: opportunity.strategyName,
    strategyFamily: opportunity.strategyFamily,
    instruments: [...(opportunity.instruments || [])],
    signalState: opportunity.signalState,
    signalValueLabel: opportunity.signalValueLabel,
    spreadLabel: opportunity.spreadLabel,
    confidenceLabel: opportunity.confidenceLabel,
    whyNow: opportunity.whyNow,
    riskFlag: opportunity.riskFlag,
    freshness: opportunity.freshness,
    dataStatus: opportunity.dataStatus,
    overlapSummary: opportunity.overlapSummary,
    scorecard: createScorecard(opportunity.scorecard),
    backtest: opportunity.backtest ? createBacktestResult(opportunity.backtest) : null,
    metadata: opportunity.metadata || {},
  };
}

export function createWatchlistItem(item) {
  return {
    id: item.id,
    kind: item.kind,
    targetId: item.targetId,
    label: item.label,
    createdAt: item.createdAt,
    notes: item.notes || "",
  };
}

function clampScore(value) {
  const numeric = sanitizeNumber(value);
  return Math.max(0, Math.min(100, numeric));
}

function clampPenalty(value) {
  const numeric = sanitizeNumber(value);
  return Math.max(0, Math.min(50, numeric));
}

function sanitizeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(4));
}

function shiftDateIso(dateString, dayOffset) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

export function createValuationEngine() {
  return {
    compute({
      transactions = [],
      valuationDate,
      currentPrices = {},
      historicalPrices = {},
      priceAnchors = new Map(),
    }) {
      const sortedTransactions = [...transactions]
        .filter((transaction) => transaction.date)
        .sort((left, right) => left.date.localeCompare(right.date));

      if (!sortedTransactions.length) {
        return {
          positions: [],
          cashBalance: 0,
          portfolioMarketValue: 0,
          nav: 0,
          dailySeries: [],
          missingPrices: [],
        };
      }

      const startDate = sortedTransactions[0].date;
      const endDate = valuationDate || sortedTransactions[sortedTransactions.length - 1].date;
      const holdings = new Map();
      const missingPrices = [];
      const dailySeries = [];
      const bridgeMismatches = [];
      let cashBalance = 0;
      let cumulativeExternalFlows = 0;
      let cursor = 0;

      for (let currentDate = startDate; currentDate <= endDate; currentDate = shiftDateIso(currentDate, 1)) {
        let externalFlowForDay = 0;
        let incomeForDay = 0;
        let feesForDay = 0;

        while (cursor < sortedTransactions.length && sortedTransactions[cursor].date === currentDate) {
          const transaction = sortedTransactions[cursor];
          cashBalance += Number(transaction.cashImpact || 0);

          if (transaction.type === "DEPOSIT") {
            externalFlowForDay += Math.abs(Number(transaction.amount || 0));
          }

          if (transaction.type === "WITHDRAWAL") {
            externalFlowForDay -= Math.abs(Number(transaction.amount || 0));
          }

          if (transaction.type === "DIVIDEND" || transaction.type === "INTEREST" || transaction.type === "INCOME") {
            incomeForDay += Number(transaction.cashImpact || 0);
          }

          if (transaction.type === "FEE" || transaction.type === "TAX") {
            feesForDay += Number(transaction.cashImpact || 0);
          }

          if ((transaction.type === "BUY" || transaction.type === "SELL") && transaction.ticker) {
            if (!holdings.has(transaction.ticker)) {
              holdings.set(transaction.ticker, {
                ticker: transaction.ticker,
                shares: 0,
                totalCostBasis: 0,
              });
            }

            const position = holdings.get(transaction.ticker);
            const tradeMagnitude = Math.abs(Number(transaction.cashImpact || 0));

            if (transaction.type === "BUY") {
              position.shares += Number(transaction.quantity || 0);
              position.totalCostBasis += tradeMagnitude;
            } else if (position.shares > 0) {
              const sharesToRemove = Math.min(Number(transaction.quantity || 0), position.shares);
              const averageCost = position.totalCostBasis / position.shares;
              const removedCostBasis = averageCost * sharesToRemove;
              position.shares -= sharesToRemove;
              position.totalCostBasis -= removedCostBasis;
            }
          }

          cursor += 1;
        }

        cumulativeExternalFlows += externalFlowForDay;

        let portfolioMarketValue = 0;
        const positionSnapshot = [];
        let fallbackPriceCount = 0;
        let missingPriceCount = 0;
        let cleanPriceCount = 0;

        for (const position of holdings.values()) {
          if (position.shares <= 0.0000001) continue;

          const priceResolution = resolveHistoricalPrice({
            ticker: position.ticker,
            date: currentDate,
            shares: position.shares,
            totalCostBasis: position.totalCostBasis,
            historicalPrices,
            currentPrices,
            priceAnchors,
          });

          if (priceResolution.priceQuality === "clean") {
            cleanPriceCount += 1;
          } else if (priceResolution.priceQuality === "missing") {
            missingPriceCount += 1;
            missingPrices.push({
              ticker: position.ticker,
              date: currentDate,
              fallback: priceResolution.source,
            });
          } else {
            fallbackPriceCount += 1;
            missingPrices.push({
              ticker: position.ticker,
              date: currentDate,
              fallback: priceResolution.source,
            });
          }

          const marketValue = position.shares * priceResolution.price;
          portfolioMarketValue += marketValue;
          positionSnapshot.push({
            ticker: position.ticker,
            shares: roundNumber(position.shares),
            totalCostBasis: roundNumber(position.totalCostBasis),
            price: roundNumber(priceResolution.price),
            priceSource: priceResolution.source,
            marketValue: roundNumber(marketValue),
          });
        }

        const nav = roundNumber(cashBalance + portfolioMarketValue);
        const previousPoint = dailySeries[dailySeries.length - 1] || null;
        const navChange = previousPoint ? roundNumber(nav - previousPoint.nav) : 0;
        const pnlForDay = previousPoint ? roundNumber(navChange - externalFlowForDay) : 0;
        const bridgeDifference = previousPoint
          ? roundNumber(nav - (previousPoint.nav + externalFlowForDay + pnlForDay))
          : 0;
        const pricingStatus = missingPriceCount > 0 ? "missing" : fallbackPriceCount > 0 ? "estimated" : "fully-priced";

        if (previousPoint && Math.abs(bridgeDifference) > 0.01) {
          bridgeMismatches.push({
            date: currentDate,
            bridgeDifference,
          });
        }

        dailySeries.push({
          date: currentDate,
          nav,
          cashBalance: roundNumber(cashBalance),
          portfolioMarketValue: roundNumber(portfolioMarketValue),
          externalFlowForDay: roundNumber(externalFlowForDay),
          cumulativeExternalFlows: roundNumber(cumulativeExternalFlows),
          incomeForDay: roundNumber(incomeForDay),
          feesForDay: roundNumber(feesForDay),
          navChange: roundNumber(navChange),
          pnlForDay: roundNumber(pnlForDay),
          bridgeDifference,
          pricingStatus,
          cleanPriceCount,
          fallbackPriceCount,
          missingPriceCount,
          totalPnL: roundNumber(nav - cumulativeExternalFlows),
          positions: positionSnapshot,
        });
      }

      const latest = dailySeries[dailySeries.length - 1] || {
        cashBalance: 0,
        portfolioMarketValue: 0,
        nav: 0,
        positions: [],
      };

      return {
        positions: latest.positions,
        cashBalance: latest.cashBalance,
        portfolioMarketValue: latest.portfolioMarketValue,
        nav: latest.nav,
        cumulativeExternalFlows: latest.cumulativeExternalFlows || 0,
        pricingStatus: latest.pricingStatus || "missing",
        dailySeries,
        missingPrices,
        bridgeMismatches,
      };
    },
  };
}

function resolveHistoricalPrice({ ticker, date, shares, totalCostBasis, historicalPrices, currentPrices, priceAnchors }) {
  const historicalSeries = Array.isArray(historicalPrices?.[ticker]) ? historicalPrices[ticker] : [];
  const historicalPoint =
    [...historicalSeries]
      .filter((point) => point?.date && Number(point?.price))
      .sort((left, right) => left.date.localeCompare(right.date))
      .reverse()
      .find((point) => point.date <= date) || null;
  if (historicalPoint?.price) {
    return { price: Number(historicalPoint.price), source: "historical-price", missing: false, priceQuality: "clean" };
  }

  const anchors = priceAnchors.get(ticker) || [];
  const anchor = [...anchors].reverse().find((point) => point.date <= date) || anchors[0];
  if (anchor?.price) {
    return { price: Number(anchor.price), source: "snapshot-anchor", missing: true, priceQuality: "estimated" };
  }

  const currentPrice = Number(currentPrices?.[ticker]?.price || 0);
  if (currentPrice > 0) {
    return { price: currentPrice, source: "manual-current", missing: true, priceQuality: "estimated" };
  }

  if (shares > 0 && totalCostBasis > 0) {
    return {
      price: totalCostBasis / shares,
      source: "cost-basis-fallback",
      missing: true,
      priceQuality: "estimated",
    };
  }

  return { price: 0, source: "missing", missing: true, priceQuality: "missing" };
}

function roundNumber(value) {
  return Number(Number(value || 0).toFixed(6));
}

export function createReturnEngine() {
  return {
    computeFromDailySeries(dailySeries = []) {
      if (!dailySeries.length) {
        return {
          dailyReturns: [],
          cumulativeReturn: null,
        };
      }

      const first = dailySeries[0];
      const dailyReturns = dailySeries.map((point, index) => {
        if (index === 0) {
          return {
            date: point.date,
            dailyReturn: null,
            cumulativeReturn: 0,
            netFlow: point.netExternalFlows,
          };
        }

        const previous = dailySeries[index - 1];
        const periodFlow = point.netExternalFlows - previous.netExternalFlows;
        const denominator = previous.nav + periodFlow;
        const dailyReturn = denominator !== 0 ? roundNumber((point.nav - previous.nav - periodFlow) / denominator) : null;
        const cumulativeReturn = first.netExternalFlows > 0 ? roundNumber(point.nav / first.netExternalFlows - 1) : null;

        return {
          date: point.date,
          dailyReturn,
          cumulativeReturn,
          netFlow: periodFlow,
        };
      });

      return {
        dailyReturns,
        cumulativeReturn: dailyReturns[dailyReturns.length - 1]?.cumulativeReturn ?? null,
      };
    },
  };
}

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

      let compounded = 1;
      const dailyReturns = dailySeries.map((point, index) => {
        if (index === 0) {
          return {
            date: point.date,
            dailyReturn: null,
            cumulativeReturn: 0,
            netFlow: point.externalFlowForDay ?? 0,
          };
        }

        const previous = dailySeries[index - 1];
        const periodFlow = Number(point.externalFlowForDay || 0);
        const baseNav = Number(previous.nav || 0);
        const pnlForDay = Number(point.pnlForDay || 0);
        const dailyReturn = Math.abs(baseNav) > 0.0000001 ? roundNumber(pnlForDay / baseNav) : null;

        if (dailyReturn !== null) {
          compounded *= 1 + dailyReturn;
        }

        return {
          date: point.date,
          dailyReturn,
          cumulativeReturn: dailyReturn === null ? null : roundNumber(compounded - 1),
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

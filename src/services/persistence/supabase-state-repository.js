const DEFAULT_PORTFOLIO_NAME = "Incrementum Primary Portfolio";

export function createSupabaseStateRepository({ supabase }) {
  let cachedPortfolioId = null;

  async function ensureActivePortfolio() {
    if (!supabase) return null;
    if (cachedPortfolioId) return cachedPortfolioId;

    const { data: existing, error: existingError } = await supabase
      .from("portfolios")
      .select("id, name, is_active, updated_at")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (existingError) throw existingError;

    if (existing?.length) {
      cachedPortfolioId = existing[0].id;
      return cachedPortfolioId;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("portfolios")
      .insert({
        name: DEFAULT_PORTFOLIO_NAME,
        base_currency: "USD",
        is_active: true,
        user_id: "00000000-0000-0000-0000-000000000000",
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    cachedPortfolioId = inserted.id;
    return cachedPortfolioId;
  }

  return {
    isConfigured() {
      return Boolean(supabase);
    },
    async loadAppState() {
      const portfolioId = await ensureActivePortfolio();
      if (!portfolioId) return null;

      const { data, error } = await supabase
        .from("portfolio_settings")
        .select("portfolio_id, benchmark_primary, selected_time_range, selected_currency, methodology")
        .eq("portfolio_id", portfolioId)
        .maybeSingle();

      if (error) throw error;
      return data?.methodology?.domainState || data?.methodology?.appState || null;
    },
    async saveAppState(_storageKey, state) {
      const portfolioId = await ensureActivePortfolio();
      if (!portfolioId) return;

      const now = new Date().toISOString();
      const uiContext = state.preferences
        ? {
            selectedBenchmark: state.preferences.primaryBenchmark,
            selectedCurrency: "USD",
            activeSnapshotId: state.activeSnapshotId || null,
          }
        : {};

      const { error: portfolioError } = await supabase
        .from("portfolios")
        .update({
          is_active: true,
          updated_at: now,
        })
        .eq("id", portfolioId);

      if (portfolioError) throw portfolioError;

      const { error: settingsError } = await supabase.from("portfolio_settings").upsert({
        portfolio_id: portfolioId,
        benchmark_primary: state.preferences?.primaryBenchmark || "SPX",
        selected_time_range: uiContext.selectedTimeRange || "ITD",
        selected_currency: uiContext.selectedCurrency || "USD",
        methodology: {
          domainState: state,
          uiState: uiContext,
          lastSavedAt: now,
        },
        updated_at: now,
      });

      if (settingsError) throw settingsError;

      const snapshots = (state.importedSnapshots || []).map((snapshot) => ({
        id: snapshot.id,
        portfolio_id: portfolioId,
        statement_end_date: snapshot.statementPeriodEndDate || null,
        summary: snapshot.summary || {},
        statement_payload: {
          fileName: snapshot.fileName,
          importedAt: snapshot.importedAt,
          prices: snapshot.prices || {},
          statement: snapshot.statement || {},
          transactions: snapshot.transactions || [],
        },
      }));

      if (snapshots.length) {
        const { error: snapshotError } = await supabase.from("snapshots").upsert(snapshots);
        if (snapshotError) throw snapshotError;
      }

      const importedFiles = (state.importedSnapshots || []).map((snapshot) => ({
        portfolio_id: portfolioId,
        storage_path: `supabase://statement-snapshots/${snapshot.id}`,
        file_name: snapshot.fileName || "Imported Statement",
        file_hash: `${snapshot.fileName || "statement"}:${snapshot.statementPeriodEndDate || snapshot.importedAt || snapshot.id}`,
        mime_type: "application/json",
        uploaded_at: snapshot.importedAt || now,
      }));

      let importedFileRows = [];
      if (importedFiles.length) {
        const { data, error: fileError } = await supabase
          .from("imported_files")
          .upsert(importedFiles, { onConflict: "portfolio_id,file_hash" })
          .select("id, file_hash");
        if (fileError) throw fileError;
        importedFileRows = data || [];
      }

      const importRuns = (state.importedSnapshots || []).map((snapshot) => ({
        id: snapshot.id,
        portfolio_id: portfolioId,
        imported_file_id:
          importedFileRows.find(
            (row) => row.file_hash === `${snapshot.fileName || "statement"}:${snapshot.statementPeriodEndDate || snapshot.importedAt || snapshot.id}`
          )?.id || null,
        status: "completed",
        diagnostics: {
          fileName: snapshot.fileName,
          statementEndDate: snapshot.statementPeriodEndDate,
        },
        created_at: snapshot.importedAt || now,
        completed_at: snapshot.importedAt || now,
      }));

      if (importRuns.length && importRuns.every((row) => row.imported_file_id)) {
        const { error: importRunError } = await supabase.from("import_runs").upsert(importRuns);
        if (importRunError) throw importRunError;
      }

      const manualTransactions = (state.manual?.transactions || []).map((transaction) =>
        serializeTransaction(transaction, portfolioId, null)
      );
      const snapshotTransactions = (state.importedSnapshots || []).flatMap((snapshot) =>
        (snapshot.transactions || []).map((transaction) => serializeTransaction(transaction, portfolioId, snapshot.id))
      );
      const uniqueTransactions = dedupeById([...manualTransactions, ...snapshotTransactions]);

      const { error: deleteTransactionsError } = await supabase.from("transactions").delete().eq("portfolio_id", portfolioId);
      if (deleteTransactionsError) throw deleteTransactionsError;

      if (uniqueTransactions.length) {
        const { error: transactionError } = await supabase.from("transactions").insert(uniqueTransactions);
        if (transactionError) throw transactionError;
      }
    },
    async loadUiState() {
      const portfolioId = await ensureActivePortfolio();
      if (!portfolioId) return null;

      const { data, error } = await supabase
        .from("portfolio_settings")
        .select("benchmark_primary, selected_time_range, selected_currency, methodology")
        .eq("portfolio_id", portfolioId)
        .maybeSingle();

      if (error) throw error;

      return {
        activeTab: data?.methodology?.uiState?.activeTab || data?.methodology?.uiContext?.activeTab || "dashboard-tab",
        selectedBenchmark: data?.benchmark_primary || data?.methodology?.uiState?.selectedBenchmark || data?.methodology?.uiContext?.selectedBenchmark || "SPX",
        selectedTimeRange: data?.selected_time_range || data?.methodology?.uiState?.selectedTimeRange || data?.methodology?.uiContext?.selectedTimeRange || "ITD",
        selectedCurrency: data?.selected_currency || data?.methodology?.uiState?.selectedCurrency || data?.methodology?.uiContext?.selectedCurrency || "USD",
        activeSnapshotId: data?.methodology?.uiState?.activeSnapshotId || data?.methodology?.uiContext?.activeSnapshotId || null,
      };
    },
    async saveUiState(_key, value) {
      const portfolioId = await ensureActivePortfolio();
      if (!portfolioId) return;

      const { data: existing, error: existingError } = await supabase
        .from("portfolio_settings")
        .select("methodology")
        .eq("portfolio_id", portfolioId)
        .maybeSingle();

      if (existingError) throw existingError;

      const methodology = {
        ...(existing?.methodology || {}),
        uiState: value,
      };

      const { error } = await supabase.from("portfolio_settings").upsert({
        portfolio_id: portfolioId,
        benchmark_primary: value.selectedBenchmark || "SPX",
        selected_time_range: value.selectedTimeRange || "ITD",
        selected_currency: value.selectedCurrency || "USD",
        methodology,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    getStatus() {
      return {
        portfolioId: cachedPortfolioId,
      };
    },
  };
}

function serializeTransaction(transaction, portfolioId, importRunId) {
  return {
    id: transaction.id,
    portfolio_id: portfolioId,
    import_run_id: importRunId,
    trade_date: transaction.date,
    type: transaction.type,
    ticker: transaction.ticker || null,
    asset_class: null,
    quantity: transaction.quantity ?? null,
    price: transaction.price ?? null,
    fx_rate: transaction.fxRate ?? null,
    currency: transaction.currency || "USD",
    amount: transaction.amount ?? 0,
    cash_impact: transaction.cashImpact ?? 0,
    notes: transaction.notes || null,
    source_section: transaction.sourceSection || null,
    created_at: new Date().toISOString(),
  };
}

function dedupeById(items) {
  const seen = new Map();
  items.forEach((item) => {
    seen.set(item.id, item);
  });
  return [...seen.values()];
}

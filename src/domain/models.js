/**
 * @typedef {Object} Portfolio
 * @property {string} id
 * @property {string} name
 * @property {string} baseCurrency
 */

/**
 * @typedef {Object} Asset
 * @property {string} ticker
 * @property {string} [assetClass]
 * @property {string} [currency]
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} date
 * @property {'BUY'|'SELL'|'DEPOSIT'|'WITHDRAWAL'|'DIVIDEND'|'INTEREST'|'FEE'|'TAX'|'INCOME'|'FX_CONVERSION'} type
 * @property {string} [ticker]
 * @property {number} [quantity]
 * @property {number} [price]
 * @property {number} [fxRate]
 * @property {string} [currency]
 * @property {number} amount
 * @property {number} cashImpact
 * @property {string} [notes]
 */

/**
 * @typedef {Object} CashFlow
 * @property {string} date
 * @property {string} type
 * @property {string} currency
 * @property {number} amount
 */

/**
 * @typedef {Object} PriceObservation
 * @property {string} ticker
 * @property {string} date
 * @property {number} price
 * @property {string} [source]
 */

/**
 * @typedef {Object} FxObservation
 * @property {string} baseCurrency
 * @property {string} quoteCurrency
 * @property {string} date
 * @property {number} rate
 */

/**
 * @typedef {Object} BenchmarkDefinition
 * @property {string} code
 * @property {string} name
 * @property {string} type
 */

/**
 * @typedef {Object} SaveMetadata
 * @property {string|null} lastSavedAt
 * @property {string|null} lastLoadedAt
 * @property {string|null} source
 * @property {string|null} error
 */

/**
 * @typedef {Object} SyncMetadata
 * @property {'supabase'|'local'} mode
 * @property {string} connectionLabel
 * @property {string|null} portfolioId
 * @property {string|null} lastSaveSource
 * @property {string|null} lastLoadSource
 */

export {};

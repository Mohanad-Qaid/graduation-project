import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Opens the SQLite database and ensures the transactions table exists.
 * Calling this multiple times is safe — returns the cached db instance.
 */
async function getDatabase() {
  if (db) return db;

  try {
    db = await SQLite.openDatabaseAsync('ewallet_offline.db');

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS transactions (
        id          TEXT PRIMARY KEY,
        type        TEXT NOT NULL,
        amount      REAL NOT NULL,
        counterparty TEXT,
        description TEXT,
        status      TEXT,
        createdAt   TEXT,
        synced      INTEGER DEFAULT 0
      );
    `);

    console.log('[offlineDb] Database ready.');
  } catch (err) {
    console.error('[offlineDb] Failed to initialise database:', err);
    db = null; // allow retry on next call
    throw err;
  }

  return db;
}

/**
 * Cache a list of transactions to the local SQLite database.
 * Clears and replaces all rows so the cache matches the server.
 * @param {Array} transactions
 */
export async function cacheTransactions(transactions) {
  try {
    const database = await getDatabase();

    await database.withTransactionAsync(async () => {
      await database.runAsync('DELETE FROM transactions');
      for (const tx of transactions) {
        await database.runAsync(
          `INSERT OR REPLACE INTO transactions
            (id, type, amount, counterparty, description, status, createdAt, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            tx.id,
            tx.transaction_type || tx.type,
            tx.amount,
            tx.counterparty ?? null,
            tx.description ?? null,
            tx.status ?? null,
            tx.createdAt ?? null,
          ]
        );
      }
    });
  } catch (err) {
    // Non-fatal — offline cache failure should not crash the app
    console.warn('[offlineDb] cacheTransactions failed:', err);
  }
}

/**
 * Read all locally cached transactions ordered by date descending.
 * @returns {Promise<Array>}
 */
export async function getCachedTransactions() {
  try {
    const database = await getDatabase();
    const rows = await database.getAllAsync(
      'SELECT * FROM transactions ORDER BY createdAt DESC'
    );
    return rows;
  } catch (err) {
    console.warn('[offlineDb] getCachedTransactions failed:', err);
    return [];
  }
}

/**
 * Save a single transaction locally with synced = 0 (pending sync).
 * Used for optimistic offline writes.
 * @param {object} transaction
 */
export async function saveOfflineTransaction(transaction) {
  try {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT OR REPLACE INTO transactions
        (id, type, amount, counterparty, description, status, createdAt, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        transaction.id || `offline_${Date.now()}`,
        transaction.type,
        transaction.amount,
        transaction.counterparty ?? null,
        transaction.description ?? null,
        transaction.status ?? 'PENDING',
        transaction.createdAt ?? new Date().toISOString(),
      ]
    );
  } catch (err) {
    console.warn('[offlineDb] saveOfflineTransaction failed:', err);
  }
}

/**
 * Return any transactions that haven't been confirmed by the server.
 * @returns {Promise<Array>}
 */
export async function getPendingTransactions() {
  try {
    const database = await getDatabase();
    return await database.getAllAsync(
      'SELECT * FROM transactions WHERE synced = 0 ORDER BY createdAt DESC'
    );
  } catch (err) {
    console.warn('[offlineDb] getPendingTransactions failed:', err);
    return [];
  }
}

/**
 * Clear all cached transactions (e.g. on logout).
 */
/**
 * Eagerly initialise the database at app startup.
 * Safe to call multiple times — subsequent calls return the cached instance.
 */
export async function initDatabase() {
  return getDatabase();
}

export async function clearCachedTransactions() {
  try {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM transactions');
  } catch (err) {
    console.warn('[offlineDb] clearCachedTransactions failed:', err);
  }
}

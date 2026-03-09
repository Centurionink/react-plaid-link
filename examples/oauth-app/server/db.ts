import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'transfers.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS transfers (
    id                TEXT PRIMARY KEY,
    type              TEXT NOT NULL,
    amount            REAL NOT NULL,
    currency          TEXT NOT NULL DEFAULT 'USD',
    status            TEXT NOT NULL DEFAULT 'pending',
    memo              TEXT,
    recipient_name    TEXT,
    recipient_country TEXT,
    access_token      TEXT,
    plaid_transfer_id TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  )
`);

export interface TransferRow {
  id: string;
  type: 'debit' | 'credit' | 'plaid_transfer' | 'remittance';
  amount: number;
  currency: string;
  status: 'pending' | 'posted' | 'settled' | 'failed' | 'cancelled';
  memo?: string;
  recipient_name?: string;
  recipient_country?: string;
  access_token?: string;
  plaid_transfer_id?: string;
  created_at: string;
  updated_at: string;
}

export const insertTransfer = (row: TransferRow): void => {
  db.prepare(`
    INSERT INTO transfers
      (id, type, amount, currency, status, memo, recipient_name, recipient_country,
       access_token, plaid_transfer_id, created_at, updated_at)
    VALUES
      (@id, @type, @amount, @currency, @status, @memo, @recipient_name, @recipient_country,
       @access_token, @plaid_transfer_id, @created_at, @updated_at)
  `).run(row);
};

export const getRemittanceHistory = (): TransferRow[] =>
  db.prepare(`
    SELECT * FROM transfers WHERE type = 'remittance' ORDER BY created_at DESC
  `).all() as TransferRow[];

export default db;

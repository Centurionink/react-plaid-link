export interface TransferRecord {
  id: string;
  type: 'debit' | 'credit' | 'plaid_transfer' | 'remittance';
  amount: number;
  currency: string;
  status: 'pending' | 'posted' | 'settled' | 'failed' | 'cancelled';
  memo?: string;
  recipient_name?: string;
  recipient_country?: string;
  plaid_transfer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LinkedAccount {
  access_token: string;
  institution_name: string;
  account_name: string;
  account_mask: string;
}

export interface TransferResult {
  transfer_id: string;
  plaid_transfer_id?: string;
  authorization_id?: string;
  remittance_id?: string;
  type: 'debit' | 'credit' | 'plaid_transfer' | 'remittance';
  amount: number;
  currency: string;
  status: string;
  memo?: string;
  recipient_name?: string;
  recipient_country?: string;
  created_at: string;
}

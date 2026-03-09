import React, { useState } from 'react';
import { LinkedAccount, TransferResult } from '../types';
import ReceiptPanel from '../components/ReceiptPanel';

interface TransferTabProps {
  account: LinkedAccount | null;
}

const TransferTab: React.FC<TransferTabProps> = ({ account }) => {
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState<'debit' | 'credit'>('debit');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransferResult | null>(null);

  if (!account) {
    return <p style={{ color: '#6b7280', fontSize: '14px' }}>Complete the Auth tab first to connect a bank account.</p>;
  }

  const validate = (): string | null => {
    const n = parseFloat(amount);
    if (isNaN(n) || n < 0.01) return 'Amount must be at least $0.01';
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) return 'Amount must have at most 2 decimal places';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/plaid_transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: account.access_token,
          amount: parseFloat(amount),
          type: transferType,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      setReceipt({ ...data, type: 'plaid_transfer' });
      setAmount('');
      setDescription('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    fontSize: '13px',
    cursor: 'pointer',
    background: active ? '#1d4ed8' : '#f3f4f6',
    color: active ? '#fff' : '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div>
      <p style={{ color: '#374151', fontSize: '14px', marginBottom: '16px' }}>
        Initiate a transfer via Plaid Transfer API for{' '}
        <strong>{account.institution_name}</strong> (••••{account.account_mask}).
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 500, margin: '0 0 6px' }}>Transfer type</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" style={toggleStyle(transferType === 'debit')} onClick={() => setTransferType('debit')}>Debit</button>
            <button type="button" style={toggleStyle(transferType === 'credit')} onClick={() => setTransferType('credit')}>Credit</button>
          </div>
        </div>
        <label style={{ fontSize: '13px', fontWeight: 500 }}>
          Amount (USD)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </label>
        <label style={{ fontSize: '13px', fontWeight: 500 }}>
          Description (optional)
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </label>
        {error && <p style={{ color: '#b91c1c', fontSize: '13px', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '10px', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Processing…' : 'Initiate Transfer'}
        </button>
      </form>
      {receipt && <ReceiptPanel result={receipt} onDismiss={() => setReceipt(null)} />}
    </div>
  );
};

export default TransferTab;

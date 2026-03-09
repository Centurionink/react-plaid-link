import React, { useState } from 'react';
import { LinkedAccount, TransferResult } from '../types';
import ReceiptPanel from '../components/ReceiptPanel';

interface CreditTabProps {
  account: LinkedAccount | null;
}

const CreditTab: React.FC<CreditTabProps> = ({ account }) => {
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
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
      const res = await fetch('/api/transfer/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: account.access_token, amount: parseFloat(amount), memo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer failed');
      setReceipt({ ...data, type: 'credit' });
      setAmount('');
      setMemo('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p style={{ color: '#374151', fontSize: '14px', marginBottom: '16px' }}>
        Push funds to <strong>{account.institution_name}</strong> (••••{account.account_mask}).
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px' }}>
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
          Memo (optional)
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', padding: '8px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </label>
        {error && <p style={{ color: '#b91c1c', fontSize: '13px', margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '10px', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Processing…' : 'Initiate Credit'}
        </button>
      </form>
      {receipt && <ReceiptPanel result={receipt} onDismiss={() => setReceipt(null)} />}
    </div>
  );
};

export default CreditTab;

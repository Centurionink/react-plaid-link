import React, { useState, useEffect, useCallback } from 'react';
import { LinkedAccount, TransferRecord, TransferResult } from '../types';
import ReceiptPanel from '../components/ReceiptPanel';
import HistoryTable from '../components/HistoryTable';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'PHP', 'INR', 'NGN', 'CAD', 'AUD', 'JPY'];

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'MX', name: 'Mexico' },
  { code: 'PH', name: 'Philippines' },
  { code: 'IN', name: 'India' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'CN', name: 'China' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'HN', name: 'Honduras' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'CO', name: 'Colombia' },
  { code: 'BR', name: 'Brazil' },
  { code: 'PE', name: 'Peru' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'NP', name: 'Nepal' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
];

interface RemittanceTabProps {
  account: LinkedAccount | null;
}

const RemittanceTab: React.FC<RemittanceTabProps> = ({ account }) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [recipientName, setRecipientName] = useState('');
  const [recipientCountry, setRecipientCountry] = useState('MX');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransferResult | null>(null);
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/remittance/history');
      const data = await res.json();
      setHistory(data);
    } catch {
      // non-fatal
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (!account) {
    return <p style={{ color: '#6b7280', fontSize: '14px' }}>Complete the Auth tab first to connect a bank account.</p>;
  }

  const validate = (): string | null => {
    const n = parseFloat(amount);
    if (isNaN(n) || n < 0.01) return 'Amount must be at least 0.01';
    if (!recipientName.trim()) return 'Recipient name is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/remittance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: account.access_token,
          amount: parseFloat(amount),
          currency,
          recipient_name: recipientName,
          recipient_country: recipientCountry,
          memo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remittance failed');
      setReceipt({ ...data, transfer_id: data.remittance_id, type: 'remittance' });
      setAmount('');
      setRecipientName('');
      setMemo('');
      await fetchHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Remittance failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', marginTop: '4px',
    padding: '8px', fontSize: '14px', boxSizing: 'border-box',
  };

  return (
    <div>
      <p style={{ color: '#374151', fontSize: '14px', marginBottom: '16px' }}>
        Send an international remittance from{' '}
        <strong>{account.institution_name}</strong> (••••{account.account_mask}).
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>
            Amount
            <input type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)} required style={inputStyle} />
          </label>
          <label style={{ fontSize: '13px', fontWeight: 500, width: '100px' }}>
            Currency
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <label style={{ fontSize: '13px', fontWeight: 500 }}>
          Recipient name
          <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)}
            required style={inputStyle} />
        </label>

        <label style={{ fontSize: '13px', fontWeight: 500 }}>
          Recipient country
          <select value={recipientCountry} onChange={e => setRecipientCountry(e.target.value)} style={inputStyle}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>

        <label style={{ fontSize: '13px', fontWeight: 500 }}>
          Memo / reference (optional)
          <input type="text" value={memo} onChange={e => setMemo(e.target.value)} style={inputStyle} />
        </label>

        {error && <p style={{ color: '#b91c1c', fontSize: '13px', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{
          padding: '10px', fontSize: '14px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}>
          {submitting ? 'Processing…' : 'Send Remittance'}
        </button>
      </form>

      {receipt && <ReceiptPanel result={receipt} onDismiss={() => setReceipt(null)} />}

      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <strong style={{ fontSize: '14px' }}>Remittance History</strong>
          <button onClick={fetchHistory} style={{ fontSize: '12px', padding: '2px 10px', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>
        <HistoryTable records={history} loading={historyLoading} />
      </div>
    </div>
  );
};

export default RemittanceTab;

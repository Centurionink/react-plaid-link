import React from 'react';
import { TransferRecord } from '../types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#fef3c7', text: '#92400e' },
  posted:    { bg: '#dbeafe', text: '#1e40af' },
  settled:   { bg: '#d1fae5', text: '#065f46' },
  failed:    { bg: '#fee2e2', text: '#991b1b' },
  cancelled: { bg: '#f3f4f6', text: '#374151' },
};

interface HistoryTableProps {
  records: TransferRecord[];
  loading: boolean;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.cancelled;
  return (
    <span style={{
      background: colors.bg,
      color: colors.text,
      borderRadius: '4px',
      padding: '2px 8px',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
};

const HistoryTable: React.FC<HistoryTableProps> = ({ records, loading }) => {
  if (loading) {
    return <p style={{ color: '#6b7280', fontSize: '13px' }}>Loading history…</p>;
  }

  if (records.length === 0) {
    return (
      <p style={{ color: '#9ca3af', fontSize: '13px', padding: '12px 0' }}>
        No remittances yet.
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            {['Date', 'Recipient', 'Amount', 'Currency', 'Country', 'Memo', 'Status'].map(h => (
              <th key={h} style={{ padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                {new Date(r.created_at).toLocaleDateString()}
              </td>
              <td style={{ padding: '8px 10px' }}>{r.recipient_name || '—'}</td>
              <td style={{ padding: '8px 10px', fontVariantNumeric: 'tabular-nums' }}>
                {Number(r.amount).toFixed(2)}
              </td>
              <td style={{ padding: '8px 10px' }}>{r.currency}</td>
              <td style={{ padding: '8px 10px' }}>{r.recipient_country || '—'}</td>
              <td style={{ padding: '8px 10px', color: '#6b7280' }}>{r.memo || '—'}</td>
              <td style={{ padding: '8px 10px' }}><StatusBadge status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryTable;

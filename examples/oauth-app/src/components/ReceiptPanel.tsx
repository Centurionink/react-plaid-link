import React from 'react';
import { TransferResult } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending: '#b45309',
  posted: '#1d4ed8',
  settled: '#15803d',
  failed: '#b91c1c',
  cancelled: '#6b7280',
};

const TYPE_LABELS: Record<string, string> = {
  debit: 'ACH Debit',
  credit: 'ACH Credit',
  plaid_transfer: 'Plaid Transfer',
  remittance: 'Remittance',
};

interface ReceiptPanelProps {
  result: TransferResult;
  onDismiss: () => void;
}

const row = (label: string, value: React.ReactNode) => (
  <tr key={label}>
    <td style={{ color: '#6b7280', paddingRight: '16px', paddingBottom: '6px', whiteSpace: 'nowrap' }}>
      {label}
    </td>
    <td style={{ fontWeight: 500, paddingBottom: '6px' }}>{value}</td>
  </tr>
);

const ReceiptPanel: React.FC<ReceiptPanelProps> = ({ result, onDismiss }) => {
  const statusColor = STATUS_COLORS[result.status] || '#6b7280';

  return (
    <div style={{
      border: '1px solid #d1fae5',
      borderRadius: '8px',
      background: '#f0fdf4',
      padding: '20px',
      marginTop: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <strong style={{ fontSize: '15px' }}>Transfer Receipt</strong>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <table style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
        <tbody>
          {row('Type', TYPE_LABELS[result.type] || result.type)}
          {row('Transfer ID', <code style={{ fontSize: '12px' }}>{result.transfer_id || result.remittance_id}</code>)}
          {result.plaid_transfer_id && row('Plaid ID', <code style={{ fontSize: '12px' }}>{result.plaid_transfer_id}</code>)}
          {result.authorization_id && row('Auth ID', <code style={{ fontSize: '12px' }}>{result.authorization_id}</code>)}
          {row('Amount', `${result.currency} ${Number(result.amount).toFixed(2)}`)}
          {row('Status', (
            <span style={{
              background: statusColor,
              color: '#fff',
              borderRadius: '4px',
              padding: '1px 8px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              {result.status}
            </span>
          ))}
          {result.recipient_name && row('Recipient', result.recipient_name)}
          {result.recipient_country && row('Country', result.recipient_country)}
          {result.memo && row('Memo', result.memo)}
          {row('Created', new Date(result.created_at).toLocaleString())}
        </tbody>
      </table>
    </div>
  );
};

export default ReceiptPanel;

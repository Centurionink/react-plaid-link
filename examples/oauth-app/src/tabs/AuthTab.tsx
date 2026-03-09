import React, { useCallback, useEffect } from 'react';
import { usePlaidLinkLog, PlaidLinkOnSuccess } from 'react-plaid-link';
import { LinkedAccount } from '../types';

interface AuthTabProps {
  account: LinkedAccount | null;
  onConnect: (account: LinkedAccount) => void;
  onDisconnect: () => void;
}

const AuthTab: React.FC<AuthTabProps> = ({ account, onConnect, onDisconnect }) => {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const createToken = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/create_link_token', { method: 'POST' });
        const data = await res.json();
        setToken(data.link_token);
      } catch {
        setError('Failed to create link token');
      } finally {
        setLoading(false);
      }
    };
    if (!account) createToken();
  }, [account]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      try {
        const res = await fetch('/api/exchange_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken }),
        });
        const data = await res.json();
        const institution = metadata.institution;
        const acct = metadata.accounts[0];
        const linked: LinkedAccount = {
          access_token: data.access_token,
          institution_name: institution?.name || 'Unknown',
          account_name: acct?.name || 'Account',
          account_mask: acct?.mask || '****',
        };
        sessionStorage.setItem('linked_account', JSON.stringify(linked));
        onConnect(linked);
      } catch {
        setError('Failed to exchange token');
      }
    },
    [onConnect]
  );

  const { open, ready } = usePlaidLinkLog({ token, onSuccess });

  if (account) {
    return (
      <div>
        <div style={{
          border: '1px solid #d1fae5',
          borderRadius: '8px',
          background: '#f0fdf4',
          padding: '16px 20px',
          marginBottom: '16px',
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 600 }}>✅ Bank account connected</p>
          <p style={{ margin: '0', fontSize: '13px', color: '#374151' }}>
            {account.institution_name} — {account.account_name} (••••{account.account_mask})
          </p>
        </div>
        <button
          onClick={onDisconnect}
          style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: '#374151', fontSize: '14px', marginBottom: '16px' }}>
        Connect your bank account using Plaid Instant Auth to enable ACH transfers.
      </p>
      {error && <p style={{ color: '#b91c1c', fontSize: '13px' }}>{error}</p>}
      <button
        onClick={() => open()}
        disabled={!ready || loading}
        style={{
          padding: '10px 20px',
          fontSize: '15px',
          cursor: ready && !loading ? 'pointer' : 'not-allowed',
          opacity: ready && !loading ? 1 : 0.5,
        }}
      >
        {loading ? 'Loading…' : ready ? 'Connect bank account' : 'Initializing…'}
      </button>
    </div>
  );
};

export default AuthTab;

import React, { useState, useEffect } from 'react';
import { usePlaidLinkLog } from 'react-plaid-link';
import { LinkedAccount } from './types';
import LogPanel from './components/LogPanel';
import AuthTab from './tabs/AuthTab';
import DebitTab from './tabs/DebitTab';
import CreditTab from './tabs/CreditTab';
import TransferTab from './tabs/TransferTab';
import RemittanceTab from './tabs/RemittanceTab';

// Both centurion.ink and bsia.space must be registered as allowed redirect URIs
// in the Plaid Dashboard: Team Settings → API → Allowed redirect URIs
const REDIRECT_BASE = window.location.hostname.includes('bsia.space')
  ? 'https://bsia.space'
  : 'https://centurion.ink';

const isOAuthRedirect = window.location.href.includes('?oauth_state_id=');

type Tab = 'auth' | 'debit' | 'credit' | 'transfer' | 'remittance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'auth', label: 'Auth' },
  { id: 'debit', label: 'Debit' },
  { id: 'credit', label: 'Credit' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'remittance', label: 'Remittance' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('auth');
  const [account, setAccount] = useState<LinkedAccount | null>(() => {
    const stored = sessionStorage.getItem('linked_account');
    return stored ? JSON.parse(stored) : null;
  });

  // OAuth redirect re-initialization token
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  useEffect(() => {
    if (isOAuthRedirect) setOauthToken(localStorage.getItem('link_token'));
  }, []);

  // Shared usePlaidLinkLog instance for the OAuth redirect flow only.
  // Each tab manages its own usePlaidLinkLog instance for its specific flow.
  const oauthConfig = {
    token: oauthToken,
    onSuccess: () => {},
    ...(isOAuthRedirect ? { receivedRedirectUri: window.location.href } : {}),
  };
  const { open: oauthOpen, ready: oauthReady, logs, clearLogs } = usePlaidLinkLog(oauthConfig);

  useEffect(() => {
    if (isOAuthRedirect && oauthReady) oauthOpen();
  }, [oauthReady, oauthOpen]);

  const handleDisconnect = () => {
    sessionStorage.removeItem('linked_account');
    setAccount(null);
  };

  const tabStyle = (id: Tab): React.CSSProperties => ({
    padding: '8px 18px',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: activeTab === id ? '2px solid #1d4ed8' : '2px solid transparent',
    color: activeTab === id ? '#1d4ed8' : '#374151',
    fontWeight: activeTab === id ? 600 : 400,
  });

  return (
    <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', margin: '0 0 4px' }}>ACH Payments & Remittances</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          Domain: <code>{REDIRECT_BASE}</code>
          {account && (
            <span style={{ marginLeft: '12px', color: '#15803d' }}>
              ● {account.institution_name} ••••{account.account_mask}
            </span>
          )}
        </p>
      </div>

      {isOAuthRedirect ? (
        <p style={{ color: '#6b7280' }}>Completing OAuth redirect…</p>
      ) : (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
            {TABS.map(t => (
              <button key={t.id} style={tabStyle(t.id)} onClick={() => setActiveTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ minHeight: '200px' }}>
            {activeTab === 'auth' && (
              <AuthTab account={account} onConnect={setAccount} onDisconnect={handleDisconnect} />
            )}
            {activeTab === 'debit' && <DebitTab account={account} />}
            {activeTab === 'credit' && <CreditTab account={account} />}
            {activeTab === 'transfer' && <TransferTab account={account} />}
            {activeTab === 'remittance' && <RemittanceTab account={account} />}
          </div>
        </>
      )}

      <LogPanel logs={logs} onClear={clearLogs} />
    </div>
  );
};

export default App;

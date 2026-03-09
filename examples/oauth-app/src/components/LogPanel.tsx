import React from 'react';
import { PlaidLinkLogEntry } from 'react-plaid-link';

interface LogPanelProps {
  logs: PlaidLinkLogEntry[];
  onClear: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '24px',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  title: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  clearButton: {
    padding: '2px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  empty: {
    color: '#888',
    padding: '8px 0',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  entry: {
    borderBottom: '1px solid #eee',
    padding: '6px 0',
  },
  timestamp: {
    color: '#888',
    marginRight: '8px',
  },
  eventName: {
    fontWeight: 'bold',
    marginRight: '8px',
  },
  metadata: {
    display: 'block',
    color: '#555',
    marginTop: '2px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};

const LogPanel: React.FC<LogPanelProps> = ({ logs, onClear }) => (
  <div style={styles.container}>
    <div style={styles.header}>
      <span style={styles.title}>Link Event Log ({logs.length})</span>
      <button style={styles.clearButton} onClick={onClear}>
        Clear Logs
      </button>
    </div>
    {logs.length === 0 ? (
      <div style={styles.empty}>No events yet.</div>
    ) : (
      <ul style={styles.list}>
        {logs.map((entry, i) => (
          <li key={i} style={styles.entry}>
            <span style={styles.timestamp}>{entry.timestamp}</span>
            <span style={styles.eventName}>{entry.eventName}</span>
            <code style={styles.metadata}>
              {JSON.stringify(entry.metadata, null, 2)}
            </code>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default LogPanel;

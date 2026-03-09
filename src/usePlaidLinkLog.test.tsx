import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  usePlaidLinkLog,
  PlaidLinkOptions,
  PlaidLinkOnEventMetadata,
  PlaidLinkStableEvent,
  PlaidLinkLogEntry,
} from './';

import useScript from './react-script-hook';
jest.mock('./react-script-hook');
const mockedUseScript = useScript as jest.Mock;

const ScriptLoadingState = {
  LOADING: [true, null],
  LOADED: [false, null],
};

const makeMetadata = (overrides: Partial<PlaidLinkOnEventMetadata> = {}): PlaidLinkOnEventMetadata => ({
  error_type: null,
  error_code: null,
  error_message: null,
  exit_status: null,
  institution_id: null,
  institution_name: null,
  institution_search_query: null,
  mfa_type: null,
  view_name: null,
  selection: null,
  timestamp: '2024-01-01T00:00:00.000Z',
  link_session_id: 'session-1',
  request_id: 'request-1',
  ...overrides,
});

interface HookComponentProps {
  config: PlaidLinkOptions;
  onLogSnapshot?: (logs: PlaidLinkLogEntry[]) => void;
  onClearLogs?: (clearLogs: () => void) => void;
}

const HookComponent: React.FC<HookComponentProps> = ({
  config,
  onLogSnapshot,
  onClearLogs,
}) => {
  const { open, ready, error, logs, clearLogs } = usePlaidLinkLog(config);

  if (onLogSnapshot) onLogSnapshot(logs);
  if (onClearLogs) onClearLogs(clearLogs);

  return (
    <div>
      <button onClick={() => open()}>Open</button>
      <button onClick={() => clearLogs()}>Clear</button>
      <div data-testid="ready">{ready ? 'READY' : 'NOT_READY'}</div>
      <div data-testid="error">{error ? 'ERROR' : 'NO_ERROR'}</div>
      <div data-testid="log-count">{logs.length}</div>
      {logs.map((entry, i) => (
        <div key={i} data-testid={`log-entry-${i}`}>
          {JSON.stringify(entry)}
        </div>
      ))}
    </div>
  );
};

describe('usePlaidLinkLog', () => {
  let capturedOnEvent: ((eventName: string, metadata: PlaidLinkOnEventMetadata) => void) | undefined;

  const config: PlaidLinkOptions = {
    token: 'test-token',
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    capturedOnEvent = undefined;
    mockedUseScript.mockImplementation(() => ScriptLoadingState.LOADED);
    window.Plaid = {
      create: (opts: any) => {
        capturedOnEvent = opts.onEvent;
        opts.onLoad && opts.onLoad();
        return {
          create: jest.fn(),
          open: jest.fn(),
          submit: jest.fn(),
          exit: jest.fn(),
          destroy: jest.fn(),
        };
      },
      open: jest.fn(),
      submit: jest.fn(),
      exit: jest.fn(),
      destroy: jest.fn(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns all fields from usePlaidLink plus logs and clearLogs', () => {
    const snapshots: PlaidLinkLogEntry[][] = [];
    render(
      <HookComponent
        config={config}
        onLogSnapshot={logs => snapshots.push(logs)}
      />
    );
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('Clear')).toBeTruthy();
    expect(screen.getByTestId('ready').textContent).toBe('READY');
    expect(screen.getByTestId('error').textContent).toBe('NO_ERROR');
    expect(screen.getByTestId('log-count').textContent).toBe('0');
  });

  it('logs an event entry with correct shape', () => {
    render(<HookComponent config={config} />);

    const metadata = makeMetadata({ view_name: 'CONSENT' });

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.OPEN, metadata);
    });

    const entry = JSON.parse(
      screen.getByTestId('log-entry-0').textContent || '{}'
    ) as PlaidLinkLogEntry;

    expect(entry.type).toBe('event');
    expect(entry.eventName).toBe(PlaidLinkStableEvent.OPEN);
    expect(entry.metadata).toEqual(metadata);
    expect(typeof entry.timestamp).toBe('string');
  });

  it('timestamp is a valid ISO 8601 string', () => {
    render(<HookComponent config={config} />);

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.OPEN, makeMetadata());
    });

    const entry = JSON.parse(
      screen.getByTestId('log-entry-0').textContent || '{}'
    ) as PlaidLinkLogEntry;

    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('passes through to the caller onEvent', () => {
    const callerOnEvent = jest.fn();
    const configWithEvent: PlaidLinkOptions = {
      ...config,
      onEvent: callerOnEvent,
    };

    render(<HookComponent config={configWithEvent} />);

    const metadata = makeMetadata();
    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.EXIT, metadata);
    });

    expect(callerOnEvent).toHaveBeenCalledTimes(1);
    expect(callerOnEvent).toHaveBeenCalledWith(PlaidLinkStableEvent.EXIT, metadata);
  });

  it('accumulates multiple events in order', () => {
    render(<HookComponent config={config} />);

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.OPEN, makeMetadata());
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.SELECT_INSTITUTION, makeMetadata());
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.HANDOFF, makeMetadata());
    });

    expect(screen.getByTestId('log-count').textContent).toBe('3');

    const entry0 = JSON.parse(screen.getByTestId('log-entry-0').textContent || '{}') as PlaidLinkLogEntry;
    const entry1 = JSON.parse(screen.getByTestId('log-entry-1').textContent || '{}') as PlaidLinkLogEntry;
    const entry2 = JSON.parse(screen.getByTestId('log-entry-2').textContent || '{}') as PlaidLinkLogEntry;

    expect(entry0.eventName).toBe(PlaidLinkStableEvent.OPEN);
    expect(entry1.eventName).toBe(PlaidLinkStableEvent.SELECT_INSTITUTION);
    expect(entry2.eventName).toBe(PlaidLinkStableEvent.HANDOFF);
  });

  it('clearLogs empties the log array', () => {
    render(<HookComponent config={config} />);

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.OPEN, makeMetadata());
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.HANDOFF, makeMetadata());
    });

    expect(screen.getByTestId('log-count').textContent).toBe('2');

    act(() => {
      fireEvent.click(screen.getByText('Clear'));
    });

    expect(screen.getByTestId('log-count').textContent).toBe('0');
  });

  it('works when caller does not provide onEvent', () => {
    const configNoEvent: PlaidLinkOptions = {
      token: 'test-token',
      onSuccess: jest.fn(),
    };

    render(<HookComponent config={configNoEvent} />);

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.OPEN, makeMetadata());
    });

    expect(screen.getByTestId('log-count').textContent).toBe('1');
  });

  it('logs accumulate across multiple events without resetting', () => {
    render(<HookComponent config={config} />);

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.OPEN, makeMetadata());
    });
    expect(screen.getByTestId('log-count').textContent).toBe('1');

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.EXIT, makeMetadata());
    });
    expect(screen.getByTestId('log-count').textContent).toBe('2');

    act(() => {
      capturedOnEvent && capturedOnEvent(PlaidLinkStableEvent.HANDOFF, makeMetadata());
    });
    expect(screen.getByTestId('log-count').textContent).toBe('3');
  });

  it('is not ready when script is loading', () => {
    mockedUseScript.mockImplementation(() => ScriptLoadingState.LOADING);
    render(<HookComponent config={config} />);
    expect(screen.getByTestId('ready').textContent).toBe('NOT_READY');
  });
});

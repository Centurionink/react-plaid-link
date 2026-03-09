import { useState, useCallback } from 'react';
import { usePlaidLink } from './usePlaidLink';
import {
  PlaidLinkOptions,
  PlaidLinkOnEventMetadata,
  PlaidLinkStableEvent,
  PlaidLinkLogEntry,
} from './types';

export const usePlaidLinkLog = (options: PlaidLinkOptions) => {
  const [logs, setLogs] = useState<PlaidLinkLogEntry[]>([]);

  const onEvent = useCallback(
    (eventName: PlaidLinkStableEvent | string, metadata: PlaidLinkOnEventMetadata) => {
      const entry: PlaidLinkLogEntry = {
        type: 'event',
        eventName,
        metadata,
        timestamp: new Date().toISOString(),
      };
      setLogs(prev => [...prev, entry]);
      options.onEvent && options.onEvent(eventName, metadata);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.onEvent]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const plaidLink = usePlaidLink({ ...options, onEvent });

  return {
    ...plaidLink,
    logs,
    clearLogs,
  };
};

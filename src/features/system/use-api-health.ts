import { useQuery } from '@tanstack/react-query';

import { environment } from '../../lib/environment';

type HealthResponse = {
  status: string;
  service: string;
  requestId: string;
  timestamp: string;
};

async function fetchApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${environment.apiOrigin}/health`, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as HealthResponse;

  if (payload.status !== 'ok') {
    throw new Error('API health response was not ok.');
  }

  return payload;
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: fetchApiHealth,
    refetchInterval: 30_000,
  });
}

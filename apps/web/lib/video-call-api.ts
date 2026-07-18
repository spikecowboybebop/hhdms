const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

function getAuthHeaders(): Record<string, string> {
  const session =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('hhdms.session')
      : null;
  const token = session
    ? (() => {
        try {
          return JSON.parse(session).token;
        } catch {
          return '';
        }
      })()
    : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }
  return res.json();
}

export interface VideoCallTokenResponse {
  token: string;
  appId: string;
}

export const videoCallApi = {
  fetchToken(channelName: string, uid: number): Promise<VideoCallTokenResponse> {
    return apiFetch<VideoCallTokenResponse>('/api/video-call/token', {
      method: 'POST',
      body: JSON.stringify({ channelName, uid }),
    });
  },
};

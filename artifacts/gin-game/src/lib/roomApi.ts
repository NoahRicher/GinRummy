import { SessionState } from './engine';

const API_BASE = '/api';

export async function createRoom(session: SessionState): Promise<string> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? 'Failed to create room');
  }
  const data = (await res.json()) as { code: string };
  return data.code;
}

export async function getRoom(code: string): Promise<{ session: SessionState; updatedAt: string }> {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code.toUpperCase())}`);
  if (res.status === 404) throw new Error('Room not found');
  if (!res.ok) throw new Error('Failed to fetch room');
  return res.json() as Promise<{ session: SessionState; updatedAt: string }>;
}

export async function pushRoom(code: string, session: SessionState): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code.toUpperCase())}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session }),
  });
  if (!res.ok) throw new Error('Failed to push room update');
}

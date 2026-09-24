// Talks to the team's Cloudflare Worker (worker/), which holds the Google key.

export async function planGoogle(apiBase, { waypoints, favorites }) {
  const base = String(apiBase ?? '').replace(/\/+$/, '');
  if (!/^https:\/\/|^http:\/\/localhost[:/]/.test(base)) {
    throw new Error('Set the server address in Settings first');
  }
  let res;
  try {
    res = await fetch(`${base}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints, favorites }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your signal and the server address.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `The server answered ${res.status}`);
  return data;
}

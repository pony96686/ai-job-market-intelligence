export async function sendMagicLink(email: string): Promise<void> {
  const res = await fetch('/api/v1/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error('Failed to send magic link');
  }
}

/** Formats milliseconds as m:ss.cc (minutes, seconds, hundredths). */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 10));
  const centis = total % 100;
  const seconds = Math.floor(total / 100) % 60;
  const minutes = Math.floor(total / 6000);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

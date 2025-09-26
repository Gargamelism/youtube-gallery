export function formatTimeFromUTC(utcIsoString: string): string {
  const utcDate = new Date(utcIsoString);
  return utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
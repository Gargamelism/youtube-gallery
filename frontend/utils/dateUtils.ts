export function formatTimeFromUTC(utcIsoString: string): string {
  const utcDate = new Date(utcIsoString);

  // Validate the date to prevent RangeError
  if (isNaN(utcDate.getTime())) {
    return '';
  }

  // Use undefined as locale to follow browser's default locale
  return utcDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
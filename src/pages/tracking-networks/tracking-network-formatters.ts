
export function formatTrackingLabel(
  value: string,
): string {
  return value
    .split(/[._-]/u)
    .filter((part) => part.length > 0)
    .map(
      (part) =>
        `${part.charAt(0).toUpperCase()}${part.slice(1)}`,
    )
    .join(' ');
}
export function formatTrackingDate(
  value: string | null,
): string {
  if (value === null) {
    return 'Not available';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
}
export function compactTrackingId(
  value: string,
): string {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}
export function maskExternalAccountId(
  value: string | null,
): string {
  if (value === null || value.length === 0) {
    return 'Not configured';
  }
  if (value.length <= 4) {
    return '****';
  }
  return `${'*'.repeat(
    Math.min(8, value.length - 4),
  )}${value.slice(-4)}`;
}

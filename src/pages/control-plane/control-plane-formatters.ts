export function formatLabel(value: string): string {
  return value
    .replace(/[._-]+/gu, ' ')
    .replace(/\b\w/gu, (character) => character.toUpperCase());
}

export function formatDateTime(value: string | null): string {
  if (value === null) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function currencyFractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function formatMinorAmount(
  amountMinor: number | null,
  currency: string | null,
): string {
  if (amountMinor === null || currency === null) {
    return 'Not configured';
  }

  const fractionDigits = currencyFractionDigits(currency);
  const amount = amountMinor / 10 ** fractionDigits;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(fractionDigits)}`;
  }
}

export function parseMajorAmountToMinor(
  value: string,
  currency: string,
): number | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Enter a valid non-negative amount.');
  }

  return Math.round(amount * 10 ** currencyFractionDigits(currency));
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: Math.abs(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercentage(numerator: number, denominator: number): string {
  if (denominator <= 0) {
    return '0.0%';
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function parseQueryParameterLines(value: string): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const rawLine of value.split(/\r?\n/gu)) {
    const line = rawLine.trim();

    if (line.length === 0) {
      continue;
    }

    const separator = line.indexOf('=');

    if (separator <= 0) {
      throw new Error('Each query parameter must use key=value format.');
    }

    const key = line.slice(0, separator).trim();
    const parameterValue = line.slice(separator + 1).trim();

    if (!/^[A-Za-z0-9_-]{1,64}$/u.test(key)) {
      throw new Error(`Invalid query parameter key: ${key}`);
    }

    result[key] = parameterValue;
  }

  return result;
}

export function formatQueryParameters(
  parameters: Readonly<Record<string, string>>,
): string {
  return Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
}

export function trackingLinkUrl(
  hostname: string,
  trackingCode: string,
  customSlug: string | null,
  options: {
    identifierMode?:
      | 'slug_or_code'
      | 'tracking_code';
    queryParameters?:
      Readonly<Record<string, string>>;
  } = {},
): string {
  const identifier =
    options.identifierMode ===
    'tracking_code'
      ? trackingCode
      : (customSlug ?? trackingCode);
  const url = new URL(
    `https://${hostname}/r/${identifier}`,
  );
  for (
    const [key, value] of
    Object.entries(
      options.queryParameters ?? {},
    )
  ) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
export function plainTextTrackingLinkUrl(
  value: string,
): string {
  const url = new URL(value);
  const hostname =
    url.hostname.replaceAll(
      '.',
      '[.]',
    );
  return (
    hostname +
    url.pathname +
    url.search
  );
}

export function shortId(value: string): string {
  return value.length <= 16 ? value : `${value.slice(0, 8)}...${value.slice(-6)}`;
}

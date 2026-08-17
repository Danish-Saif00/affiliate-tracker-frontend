export type OfferShareMode = "link" | "text";

const PLACEHOLDER_PATTERN = /%[A-Z][A-Z0-9_]*%/gu;

export function renderOfferShareText(
  template: string,
  replacements: Readonly<Record<string, string>>,
): string {
  return template.replace(
    PLACEHOLDER_PATTERN,
    (placeholder) => replacements[placeholder] ?? placeholder,
  );
}

export function formatOfferDevices(devices: readonly string[]): string {
  return devices
    .map((device) =>
      device === "ios" ? "iOS" : device === "android" ? "Android" : "Desktop",
    )
    .join(", ");
}

export function formatOfferCountries(countries: readonly string[]): string {
  return countries.length === 0 ? "Worldwide" : countries.join(", ");
}

function normalizeOfferShareCopyValue(value: string): string {
  return value.replace(/https:\/\/[^\s<>"']+/gu, candidate => candidate.replace(/%25&/giu,'.').replace(/%&/gu,'.').replace(/%2e/giu,'.'));
}

export async function copyOfferShareValue(
  value: string,
  normalize = true,
): Promise<void> {
  const clipboardValue = normalize
    ? normalizeOfferShareCopyValue(value)
    : value;
  const clipboard = navigator.clipboard;

  if (clipboard !== undefined && typeof clipboard.writeText === "function") {
    await clipboard.writeText(clipboardValue);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = clipboardValue;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("The selected Offer content could not be copied.");
  }
}

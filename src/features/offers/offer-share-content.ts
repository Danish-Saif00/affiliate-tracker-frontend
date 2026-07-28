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

export async function copyOfferShareValue(value: string): Promise<void> {
  const clipboard = navigator.clipboard;

  if (clipboard !== undefined && typeof clipboard.writeText === "function") {
    await clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
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

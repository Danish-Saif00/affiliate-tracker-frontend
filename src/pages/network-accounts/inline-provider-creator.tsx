import { useState } from "react";

import { MaterialIcon } from "../../components/icons/material-icon";
import { useCatalogOperations } from "../../features/catalog/use-catalog";
import { useNetworkProviders } from "../../features/tracking-networks/use-tracking-networks";

const PROVIDER_CODE_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/u;

function createProviderCode(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 80);
}

function normalizeOptional(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

export function InlineProviderCreator({
  onCreated,
}: {
  onCreated?: (providerId: string) => void;
}) {
  const providerOperations = useNetworkProviders();
  const catalog = useCatalogOperations();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [defaultTrackingParameter, setDefaultTrackingParameter] =
    useState("click_id");
  const [postbackClickIdToken, setPostbackClickIdToken] = useState("");
  const [postbackConversionIdToken, setPostbackConversionIdToken] =
    useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = providerOperations.isMutating;

  function resetFields(): void {
    setName("");
    setDefaultTrackingParameter("click_id");
    setPostbackClickIdToken("");
    setPostbackConversionIdToken("");
  }

  async function handleCreate(): Promise<void> {
    const normalizedName = name.trim();
    const generatedCode = createProviderCode(normalizedName);
    const clickParameter = defaultTrackingParameter.trim();
    const clickToken = postbackClickIdToken.trim();

    setError(null);
    setMessage(null);

    if (normalizedName.length < 2 || normalizedName.length > 160) {
      setError("Software name must contain between 2 and 160 characters.");
      return;
    }

    if (
      generatedCode.length < 2 ||
      generatedCode.length > 80 ||
      !PROVIDER_CODE_PATTERN.test(generatedCode)
    ) {
      setError("The software name could not produce a valid internal code.");
      return;
    }

    if (clickParameter.length === 0) {
      setError("Click ID parameter is required.");
      return;
    }

    if (clickToken.length === 0) {
      setError("Click ID token is required.");
      return;
    }

    try {
      const provider = await providerOperations.createProvider({
        code: generatedCode,
        name: normalizedName,
        websiteUrl: null,
        documentationUrl: null,
        integration: {
          defaultTrackingParameter: clickParameter,
          postbackClickIdToken: clickToken,
          postbackConversionIdToken: normalizeOptional(
            postbackConversionIdToken,
          ),
          postbackRevenueAmountToken: null,
          postbackRevenueCurrencyToken: null,
          postbackConversionStatus: "approved",
        },
      });

      await catalog.refresh();
      onCreated?.(provider.id);

      resetFields();
      setOpen(false);
      setMessage(provider.name + " was added and selected.");
    } catch (creationError: unknown) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "The software profile could not be created.",
      );
    }
  }

  return (
    <div className="inline-provider-creator">
      <div className="inline-provider-creator__bar">
        <div>
          <strong>Software not listed?</strong>
          <span>
            Add only the click/conversion mapping required by this tracker.
          </span>
        </div>

        <button
          aria-expanded={open}
          className="inline-provider-creator__toggle"
          disabled={disabled}
          onClick={() => {
            setError(null);
            setMessage(null);
            setOpen((current) => !current);
          }}
          type="button"
        >
          <MaterialIcon name={open ? "close" : "add_circle"} />
          {open ? "Cancel" : "Add custom software"}
        </button>
      </div>

      {message !== null && (
        <div className="inline-provider-creator__feedback inline-provider-creator__feedback--success">
          <MaterialIcon name="check_circle" />
          <span>{message}</span>
        </div>
      )}

      {open && (
        <div className="inline-provider-creator__panel">
          <div className="inline-provider-creator__grid">
            <label>
              <span>Software name</span>
              <input
                disabled={disabled}
                maxLength={160}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Affise, Cake, Custom..."
                required
                type="text"
                value={name}
              />
            </label>

            <label>
              <span>Click ID parameter</span>
              <input
                autoCapitalize="none"
                disabled={disabled}
                onChange={(event) =>
                  setDefaultTrackingParameter(event.currentTarget.value)
                }
                placeholder="click_id"
                spellCheck={false}
                value={defaultTrackingParameter}
              />
            </label>

            <label>
              <span>Click ID token</span>
              <input
                autoCapitalize="none"
                disabled={disabled}
                onChange={(event) =>
                  setPostbackClickIdToken(event.currentTarget.value)
                }
                placeholder="{click_id}"
                spellCheck={false}
                value={postbackClickIdToken}
              />
            </label>

            <label>
              <span>Conversion ID token (optional)</span>
              <input
                autoCapitalize="none"
                disabled={disabled}
                onChange={(event) =>
                  setPostbackConversionIdToken(event.currentTarget.value)
                }
                placeholder="{conversion_id}"
                spellCheck={false}
                value={postbackConversionIdToken}
              />
            </label>
          </div>

          {error !== null && (
            <div className="inline-provider-creator__feedback inline-provider-creator__feedback--error">
              <MaterialIcon name="error" />
              <span>{error}</span>
            </div>
          )}

          <div className="inline-provider-creator__actions">
            <span>
              Internal provider code is generated automatically. Website,
              documentation, revenue and currency fields are not needed here.
            </span>

            <button
              className="inline-provider-creator__submit"
              disabled={disabled}
              onClick={() => void handleCreate()}
              type="button"
            >
              <MaterialIcon name="add_business" />
              {disabled ? "Adding software..." : "Add software"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

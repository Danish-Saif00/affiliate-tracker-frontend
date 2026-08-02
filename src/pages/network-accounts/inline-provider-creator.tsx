// src/pages/network-accounts/inline-provider-creator.tsx
// Creates a missing company-scoped provider from the Company Admin Add Network flow.

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

function normalizeOptionalUrl(value: string): string | null {
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function isOptionalHttpUrl(value: string): boolean {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return true;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function InlineProviderCreator() {
  const providerOperations = useNetworkProviders();
  const catalog = useCatalogOperations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [defaultTrackingParameter, setDefaultTrackingParameter] = useState("");
  const [postbackClickIdToken, setPostbackClickIdToken] = useState("");
  const [postbackConversionIdToken, setPostbackConversionIdToken] =
    useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = providerOperations.isMutating;

  function resetFields() {
    setName("");
    setCode("");
    setCodeEdited(false);
    setWebsiteUrl("");
    setDocumentationUrl("");
    setDefaultTrackingParameter("");
    setPostbackClickIdToken("");
    setPostbackConversionIdToken("");
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!codeEdited) {
      setCode(createProviderCode(value));
    }
  }

  async function handleCreate() {
    const normalizedName = name.trim();
    const normalizedCode = code.trim().toLowerCase();

    setError(null);
    setMessage(null);

    if (normalizedName.length < 2 || normalizedName.length > 160) {
      setError("Provider name must contain between 2 and 160 characters.");
      return;
    }

    if (
      normalizedCode.length < 2 ||
      normalizedCode.length > 80 ||
      !PROVIDER_CODE_PATTERN.test(normalizedCode)
    ) {
      setError(
        "Provider code must use lowercase letters, numbers, and single underscores.",
      );
      return;
    }

    if (
      !isOptionalHttpUrl(websiteUrl) ||
      !isOptionalHttpUrl(documentationUrl)
    ) {
      setError("Provider links must be valid HTTP or HTTPS URLs.");
      return;
    }

    try {
      const provider = await providerOperations.createProvider({
        code: normalizedCode,
        name: normalizedName,
        websiteUrl: normalizeOptionalUrl(websiteUrl),
        documentationUrl: normalizeOptionalUrl(documentationUrl),
        integration: {
          defaultTrackingParameter: normalizeOptionalUrl(
            defaultTrackingParameter,
          ),
          postbackClickIdToken: normalizeOptionalUrl(postbackClickIdToken),
          postbackConversionIdToken: normalizeOptionalUrl(
            postbackConversionIdToken,
          ),
          postbackRevenueAmountToken: null,
          postbackRevenueCurrencyToken: null,
          postbackConversionStatus: "approved",
        },
      });

      await catalog.refresh();
      resetFields();
      setOpen(false);
      setMessage(
        `${provider.name} was added. Select it from the provider dropdown above.`,
      );
    } catch (creationError: unknown) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "The network provider could not be created.",
      );
    }
  }

  return (
    <div className="inline-provider-creator">
      <div className="inline-provider-creator__bar">
        <div>
          <strong>Provider not listed?</strong>
          <span>
            Add the missing software provider without leaving this network form.
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
          {open ? "Cancel" : "Add provider"}
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
              <span>Provider name</span>
              <input
                disabled={disabled}
                maxLength={160}
                onChange={(event) => handleNameChange(event.target.value)}
                placeholder="Example Provider"
                type="text"
                value={name}
              />
            </label>

            <label>
              <span>Provider code</span>
              <input
                autoCapitalize="none"
                disabled={disabled}
                maxLength={80}
                onChange={(event) => {
                  setCodeEdited(true);
                  setCode(event.target.value.toLowerCase());
                }}
                placeholder="example_provider"
                spellCheck={false}
                type="text"
                value={code}
              />
            </label>

            <label>
              <span>Website URL</span>
              <input
                disabled={disabled}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://provider.example"
                type="url"
                value={websiteUrl}
              />
            </label>

            <label>
              <span>Documentation URL</span>
              <input
                disabled={disabled}
                onChange={(event) => setDocumentationUrl(event.target.value)}
                placeholder="Optional provider documentation"
                type="url"
                value={documentationUrl}
              />
            </label>

            <label>
              <span>Default click-ID parameter</span>
              <input
                disabled={disabled}
                onChange={(event) =>
                  setDefaultTrackingParameter(event.target.value)
                }
                placeholder="click_id"
                value={defaultTrackingParameter}
              />
            </label>

            <label>
              <span>Provider click-ID token</span>
              <input
                disabled={disabled}
                onChange={(event) =>
                  setPostbackClickIdToken(event.target.value)
                }
                placeholder="{SUB1}"
                value={postbackClickIdToken}
              />
            </label>

            <label>
              <span>Provider conversion-ID token</span>
              <input
                disabled={disabled}
                onChange={(event) =>
                  setPostbackConversionIdToken(event.target.value)
                }
                placeholder="{CONVERSION_ID}"
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
              The provider code is unique inside this company and cannot be
              changed after creation.
            </span>
            <button
              className="inline-provider-creator__submit"
              disabled={disabled}
              onClick={() => void handleCreate()}
              type="button"
            >
              <MaterialIcon name="add_business" />
              {disabled ? "Adding provider..." : "Create provider"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

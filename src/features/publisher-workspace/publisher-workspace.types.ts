/**
 * Publisher-safe Offer projection returned by the assigned Offer directory.
 *
 * Sensitive network credentials, destination URLs, internal assignment identifiers,
 * and administrative configuration remain excluded from this client contract.
 */
export type PublisherOfferDevice = "desktop" | "android" | "ios";

export type PublisherOffer = {
  id: string;
  publicId: number;
  publisherPublicId: number;
  name: string;
  description: string | null;
  countries: readonly string[];
  devices: readonly PublisherOfferDevice[];
  trackingDomainId: string | null;
  trackingDomainHostname: string | null;
  trackingLink: string | null;
  promotionalText: string | null;
  payoutAmountMinor: number | null;
  payoutCurrency: string | null;
  timezone: string;
  activeDays: readonly number[];
  activeStartTime: string | null;
  activeEndTime: string | null;
  expiresAt: string | null;
  updatedAt: string;
};

export type PublisherWorkspaceLoadStatus =
  "idle" | "loading" | "ready" | "error" | "forbidden";

import type { Profile, SavedDeliveryAddress } from "../types/marketplace";

type AddressProfile = Pick<Profile, "savedDeliveryAddresses" | "defaultDeliveryAddressIndex" | "savedDeliveryAddress">;

export function getDefaultDeliveryAddress(profile: AddressProfile | null | undefined):
  { index: number; address: SavedDeliveryAddress } | null {
  const addresses = profile?.savedDeliveryAddresses || [];
  const preferredIndex = profile?.defaultDeliveryAddressIndex;
  const index = preferredIndex !== undefined && addresses[preferredIndex]?.isDefault
    ? preferredIndex
    : addresses.findIndex((address) => address.isDefault);
  return index >= 0 ? { index, address: addresses[index] } : null;
}

export function normalizeDefaultDeliveryAddress(profile: Profile): Profile {
  const selected = getDefaultDeliveryAddress(profile);
  if (profile.defaultDeliveryAddressIndex === selected?.index &&
    JSON.stringify(profile.savedDeliveryAddress) === JSON.stringify(selected?.address)) return profile;
  return {
    ...profile,
    defaultDeliveryAddressIndex: selected?.index,
    savedDeliveryAddress: selected?.address,
  };
}

import { isAddress, zeroAddress, type Address } from "viem";

/** The address OHM goes to: a recipient the user chose, otherwise whichever wallet is connected. */
export function resolveRecipient(custom?: Address, connected?: Address): Address | undefined {
  return custom ?? connected;
}

export function validateRecipient(value: string): string | undefined {
  if (!isAddress(value)) return "Invalid Ethereum address.";
  if (value === zeroAddress) return "OHM can't be sent to the zero address.";
  return undefined;
}

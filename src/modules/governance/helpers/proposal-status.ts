export type ProposalStatus =
  | "Pending"
  | "Active"
  | "Canceled"
  | "Defeated"
  | "Succeeded"
  | "Queued"
  | "Expired"
  | "Executed"
  | "Vetoed"
  | "Emergency";

export const PROPOSAL_STATUS_MAP: Record<number, ProposalStatus> = {
  0: "Pending",
  1: "Active",
  2: "Canceled",
  3: "Defeated",
  4: "Succeeded",
  5: "Queued",
  6: "Expired",
  7: "Executed",
  8: "Vetoed",
  9: "Emergency",
};

/**
 * Maps a proposal status to a semantic color for UI display.
 */
export function getStatusColor(
  status: ProposalStatus,
): "green" | "yellow" | "red" | "gray" | "blue" {
  switch (status) {
    case "Active":
    case "Succeeded":
      return "green";
    case "Queued":
    case "Pending":
      return "yellow";
    case "Executed":
    case "Emergency":
      return "blue";
    case "Defeated":
    case "Vetoed":
    case "Canceled":
      return "red";
    case "Expired":
      return "gray";
  }
}

/**
 * Capitalizes the first character of a string.
 */
export function toCapitalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Estimates a calendar date from a target block number using the current block
 * and an assumed block time of ~12 seconds (Ethereum mainnet average).
 */
export function getDateFromBlock(
  targetBlock: number,
  currentBlock: number,
  currentTimestamp: number,
): Date {
  const averageBlockTimeSeconds = 12;
  const date = new Date();
  date.setTime((currentTimestamp + averageBlockTimeSeconds * (targetBlock - currentBlock)) * 1000);
  return date;
}

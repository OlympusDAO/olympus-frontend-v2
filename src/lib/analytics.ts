import ReactGA from "react-ga4";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initializeAnalytics(): void {
  if (!GA_MEASUREMENT_ID) {
    console.warn(
      "[Analytics] VITE_GA_MEASUREMENT_ID not set, skipping GA initialization"
    );
    return;
  }
  ReactGA.initialize(GA_MEASUREMENT_ID);
}

function isEnabled(): boolean {
  return !!GA_MEASUREMENT_ID;
}

export function trackPageView(path: string): void {
  if (!isEnabled()) return;
  ReactGA.send({ hitType: "pageview", page: path });
}

export function trackWalletConnect(address: string): void {
  if (!isEnabled()) return;
  ReactGA.event("wallet_connect", {
    wallet_address: `${address.slice(0, 6)}...${address.slice(-4)}`,
  });
}

export function trackWalletDisconnect(): void {
  if (!isEnabled()) return;
  ReactGA.event("wallet_disconnect");
}

export function trackDepositCreate(params: {
  depositAmount: string;
  termMonths: number;
  txHash?: string;
}): void {
  if (!isEnabled()) return;
  ReactGA.event("deposit_create", {
    deposit_amount: params.depositAmount,
    term_months: params.termMonths,
    tx_hash: params.txHash,
  });
}

export function trackRedeemInstant(params: {
  redeemAmount: string;
  term: string;
  txHash?: string;
}): void {
  if (!isEnabled()) return;
  ReactGA.event("redeem_instant", {
    redeem_amount: params.redeemAmount,
    term: params.term,
    tx_hash: params.txHash,
  });
}

export function trackRedeemFull(params: {
  redeemAmount: string;
  term: string;
  txHash?: string;
}): void {
  if (!isEnabled()) return;
  ReactGA.event("redeem_full", {
    redeem_amount: params.redeemAmount,
    term: params.term,
    tx_hash: params.txHash,
  });
}

export function trackConvertToOhm(params: {
  convertAmount: string;
  term: string;
  txHash?: string;
}): void {
  if (!isEnabled()) return;
  ReactGA.event("convert_to_ohm", {
    convert_amount: params.convertAmount,
    term: params.term,
    tx_hash: params.txHash,
  });
}

export function trackBorrowCreate(params: {
  collateralAmount: string;
  borrowAmount: string;
  txHash?: string;
}): void {
  if (!isEnabled()) return;
  ReactGA.event("borrow_create", {
    collateral_amount: params.collateralAmount,
    borrow_amount: params.borrowAmount,
    tx_hash: params.txHash,
  });
}

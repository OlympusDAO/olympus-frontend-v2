import ReactGA from "react-ga4";
import posthog from "posthog-js";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initializeAnalytics(): void {
  if (GA_MEASUREMENT_ID) {
    ReactGA.initialize(GA_MEASUREMENT_ID, { gtagOptions: { anonymize_ip: true } });
  }

  const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  const posthogIngestHost = import.meta.env.VITE_PUBLIC_POSTHOG_INGEST_HOST ?? posthogHost;

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogIngestHost,
      ui_host: posthogHost,
      capture_pageview: "history_change",
      person_profiles: "identified_only",
      capture_pageleave: true,
      ip: false,
      cross_subdomain_cookie: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        maskTextFn: (text, element) => {
          if (element?.dataset["capture"] === "true") return text;
          return "*".repeat(text.trim().length);
        },
      },
    });

    captureFirstTouch();
  }
}

// ─── First-touch attribution ──────────────────────────────────────────────────

const FIRST_TOUCH_KEY = "ph_first_touch";

interface FirstTouch {
  source: string;
  utm_campaign?: string;
  utm_medium?: string;
  landing_page: string;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

function computeFirstTouchSource(utm: Record<string, string>, referrer: string): string {
  if (utm.utm_source) return utm.utm_source.toLowerCase();
  if (!referrer) return "direct";
  if (/twitter\.com|t\.co|x\.com/.test(referrer)) return "twitter";
  if (/discord/.test(referrer)) return "discord";
  if (/forum\.olympusdao/.test(referrer)) return "forum";
  if (/app\.olympusdao\.finance/.test(referrer)) return "dapp-internal";
  if (/olympusdao\.finance/.test(referrer)) return "website";
  if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(referrer)) return "organic";
  return "referral-other";
}

function captureFirstTouch(): void {
  if (sessionStorage.getItem(FIRST_TOUCH_KEY)) return;
  const utm = getUtmParams();
  const data: FirstTouch = {
    source: computeFirstTouchSource(utm, document.referrer),
    utm_campaign: utm.utm_campaign,
    utm_medium: utm.utm_medium,
    landing_page: window.location.hash || window.location.pathname,
  };
  sessionStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(data));
}

function getFirstTouch(): FirstTouch | null {
  const raw = sessionStorage.getItem(FIRST_TOUCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FirstTouch;
  } catch {
    return null;
  }
}

function track(eventName: string, props?: Record<string, unknown>): void {
  if (GA_MEASUREMENT_ID) ReactGA.event(eventName, props);
  posthog.capture(eventName, props);
}

function trackTransaction(product: string, action: string, props?: Record<string, unknown>): void {
  const eventName = `${product}_${action}_confirmed`;
  const payload = {
    product,
    action,
    phase: "confirmed",
    $set_once: { first_product: product },
    ...props,
  };
  if (GA_MEASUREMENT_ID) ReactGA.event(eventName, props);
  posthog.capture(eventName, payload);
}

// ─── Identity ────────────────────────────────────────────────────────────────

async function hashAddress(address: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(address.toLowerCase()),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function identifyWallet(address: string): Promise<void> {
  const hashedAddress = await hashAddress(address);
  const firstTouch = getFirstTouch();
  posthog.identify(hashedAddress, {
    $set_once: {
      first_connect_date: new Date().toISOString(),
      first_touch_source: firstTouch?.source,
      first_touch_utm_campaign: firstTouch?.utm_campaign,
      first_touch_utm_medium: firstTouch?.utm_medium,
      first_touch_landing_page: firstTouch?.landing_page,
    },
  });
}

export function resetIdentity(): void {
  posthog.reset();
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export function trackPageView(path: string): void {
  if (GA_MEASUREMENT_ID) ReactGA.send({ hitType: "pageview", page: path });
  posthog.capture("$pageview", { $current_url: path });
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export function trackWalletConnect(address: string): void {
  track("wallet_connected", {
    wallet_address: `${address.slice(0, 6)}...${address.slice(-4)}`,
  });
}

export function trackWalletDisconnect(): void {
  track("wallet_disconnect");
}

// ─── OHM ─────────────────────────────────────────────────────────────────────

export function trackWrapOhm(params: { amount: string; txHash?: string }): void {
  trackTransaction("ohm", "wrap", { amount: params.amount, tx_hash: params.txHash });
}

export function trackUnwrapGohm(params: { amount: string; txHash?: string }): void {
  trackTransaction("ohm", "unwrap", { amount: params.amount, tx_hash: params.txHash });
}

export function trackBridgeOhm(params: {
  amount: string;
  srcChain: string;
  dstChain: string;
  txHash?: string;
}): void {
  trackTransaction("ohm", "bridge", {
    amount: params.amount,
    src_chain: params.srcChain,
    dst_chain: params.dstChain,
    tx_hash: params.txHash,
  });
}

// ─── CDS ─────────────────────────────────────────────────────────────────────

export function trackDepositCreate(params: {
  depositAmount: string;
  termMonths: number;
  txHash?: string;
}): void {
  trackTransaction("cd", "deposit", {
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
  trackTransaction("cd", "redeem", {
    type: "instant",
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
  trackTransaction("cd", "redeem", {
    type: "full",
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
  trackTransaction("cd", "convert", {
    convert_amount: params.convertAmount,
    term: params.term,
    tx_hash: params.txHash,
  });
}

export function trackCreateLimitOrder(params: {
  amount: string;
  term: string;
  price: string;
  txHash?: string;
}): void {
  trackTransaction("cd", "limit_order_create", {
    amount: params.amount,
    term: params.term,
    price: params.price,
    tx_hash: params.txHash,
  });
}

export function trackCancelLimitOrder(params: { orderId: string; txHash?: string }): void {
  trackTransaction("cd", "limit_order_cancel", {
    order_id: params.orderId,
    tx_hash: params.txHash,
  });
}

export function trackWrapReceiptToken(params: { amount: string; txHash?: string }): void {
  trackTransaction("cd", "receipt_wrap", { amount: params.amount, tx_hash: params.txHash });
}

export function trackUnwrapReceiptToken(params: { amount: string; txHash?: string }): void {
  trackTransaction("cd", "receipt_unwrap", { amount: params.amount, tx_hash: params.txHash });
}

export function trackFinishRedemption(params: { amount: string; txHash?: string }): void {
  trackTransaction("cd", "finish_redemption", { amount: params.amount, tx_hash: params.txHash });
}

export function trackTransferPosition(params: { toAddress: string; txHash?: string }): void {
  trackTransaction("cd", "transfer", { to_address: params.toAddress, tx_hash: params.txHash });
}

// ─── Borrow (CDS loans) ───────────────────────────────────────────────────────

export function trackBorrowCreate(params: {
  collateralAmount: string;
  borrowAmount: string;
  txHash?: string;
}): void {
  trackTransaction("cd", "borrow", {
    collateral_amount: params.collateralAmount,
    borrow_amount: params.borrowAmount,
    tx_hash: params.txHash,
  });
}

export function trackRepayLoan(params: { amount: string; txHash?: string }): void {
  trackTransaction("cd", "repay", { amount: params.amount, tx_hash: params.txHash });
}

export function trackExtendLoan(params: { newExpiry: string; txHash?: string }): void {
  trackTransaction("cd", "extend", { new_expiry: params.newExpiry, tx_hash: params.txHash });
}

// ─── Cooler V2 ────────────────────────────────────────────────────────────────

export function trackCoolerBorrow(params: {
  borrowAmount: string;
  collateralAmount: string;
  txHash?: string;
}): void {
  trackTransaction("cooler", "borrow", {
    borrow_amount: params.borrowAmount,
    collateral_amount: params.collateralAmount,
    tx_hash: params.txHash,
  });
}

export function trackCoolerRepay(params: { repayAmount: string; txHash?: string }): void {
  trackTransaction("cooler", "repay", { repay_amount: params.repayAmount, tx_hash: params.txHash });
}

export function trackCoolerExtend(params: { newExpiry: string; txHash?: string }): void {
  trackTransaction("cooler", "extend", { new_expiry: params.newExpiry, tx_hash: params.txHash });
}

// ─── Governance ───────────────────────────────────────────────────────────────

export function trackCastVote(params: {
  proposalId: string;
  support: "for" | "against" | "abstain";
  txHash?: string;
}): void {
  trackTransaction("dao", "vote", {
    proposal_id: params.proposalId,
    support: params.support,
    tx_hash: params.txHash,
  });
}

export function trackDelegate(params: { delegatee: string; txHash?: string }): void {
  trackTransaction("dao", "delegate", { delegatee: params.delegatee, tx_hash: params.txHash });
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export function trackSwitchToClassic(): void {
  track("classic_view_toggled", { direction: "new_to_classic" });
}

export function trackDismissClassicBanner(): void {
  track("dismiss_classic_banner");
}

// ─── Engage ───────────────────────────────────────────────────────────────────

export function trackClaimDrachmas(params: { amount: string; txHash?: string }): void {
  trackTransaction("engage", "claim", { amount: params.amount, tx_hash: params.txHash });
}

export function trackConvertDrachmas(params: { amount: string; txHash?: string }): void {
  trackTransaction("engage", "convert", { amount: params.amount, tx_hash: params.txHash });
}

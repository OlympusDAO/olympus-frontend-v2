import ReactGA from "react-ga4";
import posthog from "posthog-js";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initializeAnalytics(): void {
  if (GA_MEASUREMENT_ID) {
    ReactGA.initialize(GA_MEASUREMENT_ID, { gtagOptions: { anonymize_ip: true } });
  }

  const posthogKey = import.meta.env.VITE_POSTHOG_API_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      capture_pageview: false,
      capture_pageleave: true,
      ip: false,
      session_recording: { maskAllInputs: true },
    });
  }
}

function track(eventName: string, props?: Record<string, unknown>): void {
  if (GA_MEASUREMENT_ID) ReactGA.event(eventName, props);
  posthog.capture(eventName, props);
}

// ─── Identity ────────────────────────────────────────────────────────────────

export function identifyWallet(address: string): void {
  posthog.identify(address);
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
  track("wallet_connect", {
    wallet_address: `${address.slice(0, 6)}...${address.slice(-4)}`,
  });
}

export function trackWalletDisconnect(): void {
  track("wallet_disconnect");
}

// ─── OHM ─────────────────────────────────────────────────────────────────────

export function trackWrapOhm(params: { amount: string; txHash?: string }): void {
  track("wrap_ohm", { amount: params.amount, tx_hash: params.txHash });
}

export function trackUnwrapGohm(params: { amount: string; txHash?: string }): void {
  track("unwrap_gohm", { amount: params.amount, tx_hash: params.txHash });
}

export function trackBridgeOhm(params: {
  amount: string;
  srcChain: string;
  dstChain: string;
  txHash?: string;
}): void {
  track("bridge_ohm", {
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
  track("deposit_create", {
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
  track("redeem_instant", {
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
  track("redeem_full", {
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
  track("convert_to_ohm", {
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
  track("create_limit_order", {
    amount: params.amount,
    term: params.term,
    price: params.price,
    tx_hash: params.txHash,
  });
}

export function trackCancelLimitOrder(params: { orderId: string; txHash?: string }): void {
  track("cancel_limit_order", { order_id: params.orderId, tx_hash: params.txHash });
}

export function trackWrapReceiptToken(params: { amount: string; txHash?: string }): void {
  track("wrap_receipt_token", { amount: params.amount, tx_hash: params.txHash });
}

export function trackUnwrapReceiptToken(params: { amount: string; txHash?: string }): void {
  track("unwrap_receipt_token", { amount: params.amount, tx_hash: params.txHash });
}

export function trackFinishRedemption(params: { amount: string; txHash?: string }): void {
  track("finish_redemption", { amount: params.amount, tx_hash: params.txHash });
}

export function trackTransferPosition(params: { toAddress: string; txHash?: string }): void {
  track("transfer_position", { to_address: params.toAddress, tx_hash: params.txHash });
}

// ─── Borrow (CDS loans) ───────────────────────────────────────────────────────

export function trackBorrowCreate(params: {
  collateralAmount: string;
  borrowAmount: string;
  txHash?: string;
}): void {
  track("borrow_create", {
    collateral_amount: params.collateralAmount,
    borrow_amount: params.borrowAmount,
    tx_hash: params.txHash,
  });
}

export function trackRepayLoan(params: { amount: string; txHash?: string }): void {
  track("repay_loan", { amount: params.amount, tx_hash: params.txHash });
}

export function trackExtendLoan(params: { newExpiry: string; txHash?: string }): void {
  track("extend_loan", { new_expiry: params.newExpiry, tx_hash: params.txHash });
}

// ─── Cooler V2 ────────────────────────────────────────────────────────────────

export function trackCoolerBorrow(params: {
  borrowAmount: string;
  collateralAmount: string;
  txHash?: string;
}): void {
  track("borrow_cooler", {
    borrow_amount: params.borrowAmount,
    collateral_amount: params.collateralAmount,
    tx_hash: params.txHash,
  });
}

export function trackCoolerRepay(params: { repayAmount: string; txHash?: string }): void {
  track("repay_cooler", { repay_amount: params.repayAmount, tx_hash: params.txHash });
}

export function trackCoolerExtend(params: { newExpiry: string; txHash?: string }): void {
  track("extend_loan_cooler", { new_expiry: params.newExpiry, tx_hash: params.txHash });
}

// ─── Governance ───────────────────────────────────────────────────────────────

export function trackCastVote(params: {
  proposalId: string;
  support: "for" | "against" | "abstain";
  txHash?: string;
}): void {
  track("cast_vote", {
    proposal_id: params.proposalId,
    support: params.support,
    tx_hash: params.txHash,
  });
}

export function trackDelegate(params: { delegatee: string; txHash?: string }): void {
  track("delegate_voting", { delegatee: params.delegatee, tx_hash: params.txHash });
}

// ─── Engage ───────────────────────────────────────────────────────────────────

export function trackClaimDrachmas(params: { amount: string; txHash?: string }): void {
  track("claim_drachmas", { amount: params.amount, tx_hash: params.txHash });
}

export function trackConvertDrachmas(params: { amount: string; txHash?: string }): void {
  track("convert_drachmas", { amount: params.amount, tx_hash: params.txHash });
}

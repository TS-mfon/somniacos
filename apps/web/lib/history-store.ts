"use client";

import { keccak256, toHex } from "viem";
import { createProofReceipt, type AgentProofReceipt, type AgentRunRecord, type CompareSession, type MissionReceipt } from "./agent-engine";

export const runHistoryKey = "somniacos.agentRuns";
export const receiptHistoryKey = "somniacos.proofReceipts";
export const missionReceiptHistoryKey = "somniacos.missionReceipts";
export const compareSessionHistoryKey = "somniacos.compareSessions";

export function loadRunHistory() {
  return readJson<AgentRunRecord[]>(runHistoryKey, []);
}

export function saveRunHistory(runs: AgentRunRecord[]) {
  writeJson(runHistoryKey, runs.slice(0, 80));
}

export function upsertRunHistory(run: AgentRunRecord) {
  const current = loadRunHistory();
  const next = [run, ...current.filter((item) => item.requestId !== run.requestId)].slice(0, 80);
  saveRunHistory(next);
  upsertReceipt(createReceipt(run));
  return next;
}

export function loadReceipts() {
  return readJson<AgentProofReceipt[]>(receiptHistoryKey, []);
}

export function upsertReceipt(receipt: AgentProofReceipt) {
  const current = loadReceipts();
  writeJson(receiptHistoryKey, [receipt, ...current.filter((item) => item.receiptId !== receipt.receiptId)].slice(0, 120));
}

export function loadMissionReceipts() {
  return readJson<MissionReceipt[]>(missionReceiptHistoryKey, []);
}

export function upsertMissionReceipt(receipt: MissionReceipt) {
  const current = loadMissionReceipts();
  writeJson(missionReceiptHistoryKey, [receipt, ...current.filter((item) => item.receiptId !== receipt.receiptId)].slice(0, 80));
}

export function loadCompareSessions() {
  return readJson<CompareSession[]>(compareSessionHistoryKey, []);
}

export function upsertCompareSession(session: CompareSession) {
  const current = loadCompareSessions();
  writeJson(compareSessionHistoryKey, [session, ...current.filter((item) => item.id !== session.id)].slice(0, 40));
}

export function createReceipt(run: AgentRunRecord): AgentProofReceipt {
  return {
    ...createProofReceipt(run),
    resultHash: run.result ? keccak256(toHex(run.result)) : undefined
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

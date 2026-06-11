"use client";

import { useEffect, useState } from "react";
import { createPublicClient, custom, formatEther, type Address, type EIP1193Provider } from "viem";
import { RefreshCw, WalletCards, Zap } from "lucide-react";
import { somnia, somniaTransport } from "../lib/contracts";
import { normalizeAppError } from "../lib/app-error";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export type WalletState = {
  address?: Address;
  chainId?: number;
  balance?: string;
  error?: string;
};

export function useSomniaWallet() {
  const [wallet, setWallet] = useState<WalletState>({});

  async function refresh(address?: Address) {
    const ethereum = window.ethereum;
    if (!ethereum) {
      setWallet({ error: "No injected wallet found. Install MetaMask, Rabby, Brave Wallet, or Coinbase Wallet." });
      return;
    }

    try {
      const accounts = await ethereum.request({ method: "eth_accounts" }) as Address[];
      const selected = address ?? accounts[0];
      const chain = await ethereum.request({ method: "eth_chainId" }) as string;

      if (!selected) {
        setWallet({ chainId: Number.parseInt(chain, 16) });
        return;
      }

      const client = createPublicClient({ chain: somnia, transport: somniaTransport() });
      const balance = await client.getBalance({ address: selected });
      setWallet({ address: selected, chainId: Number.parseInt(chain, 16), balance: formatEther(balance) });
    } catch (error) {
      setWallet((current) => ({ ...current, error: normalizeAppError(error).message }));
    }
  }

  async function connect() {
    const ethereum = window.ethereum;
    if (!ethereum) {
      setWallet({ error: "No injected wallet found. Install MetaMask, Rabby, Brave Wallet, or Coinbase Wallet." });
      return;
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" }) as Address[];
    await switchToSomnia();
    await refresh(accounts[0]);
  }

  async function switchToSomnia() {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${somnia.id.toString(16)}` }]
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? Number((error as { code: unknown }).code) : undefined;
      if (code !== 4902) throw error;
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${somnia.id.toString(16)}`,
          chainName: somnia.name,
          nativeCurrency: somnia.nativeCurrency,
          rpcUrls: somnia.rpcUrls.default.http,
          blockExplorerUrls: [somnia.blockExplorers.default.url]
        }]
      });
    }
  }

  function walletClient() {
    if (!window.ethereum) throw new Error("No injected wallet found.");
    return custom(window.ethereum);
  }

  useEffect(() => {
    void refresh();
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;
    const onAccounts = () => void refresh();
    const onChain = () => void refresh();
    ethereum.on("accountsChanged", onAccounts);
    ethereum.on("chainChanged", onChain);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccounts);
      ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  return { wallet, connect, refresh, switchToSomnia, walletClient };
}

export function WalletButton() {
  const { wallet, connect, switchToSomnia, refresh } = useSomniaWallet();
  const wrongNetwork = wallet.chainId && wallet.chainId !== somnia.id;
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");

  async function handleConnect() {
    setActionError("");
    try {
      await connect();
    } catch (error) {
      const normalized = normalizeAppError(error);
      setActionError(`${normalized.message} ${normalized.action}`);
    }
  }

  async function handleSwitch() {
    setActionError("");
    try {
      await switchToSomnia();
      await refresh(wallet.address);
    } catch (error) {
      const normalized = normalizeAppError(error);
      setActionError(`${normalized.message} ${normalized.action}`);
    }
  }

  if (!wallet.address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button onClick={handleConnect} className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-black">
          <WalletCards className="h-4 w-4" />
          Connect wallet
        </button>
        {actionError ? <p role="alert" className="max-w-64 text-right text-[11px] text-red-300">{actionError}</p> : null}
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button onClick={handleSwitch} className="inline-flex whitespace-nowrap items-center gap-2 rounded-lg border border-danger/50 bg-danger/15 px-3 py-2 text-sm font-semibold text-danger">
          <Zap className="h-4 w-4" />
          Wrong network — switch to Somnia
        </button>
        {actionError ? <p role="alert" className="max-w-64 text-right text-[11px] text-red-300">{actionError}</p> : null}
      </div>
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refresh(wallet.address);
    } catch (error) {
      const normalized = normalizeAppError(error);
      setActionError(`${normalized.message} ${normalized.action}`);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white">
      <span className="h-2 w-2 animate-pulse rounded-full bg-signal" />
      <span className="font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
      <span className="hidden font-mono text-white/45 sm:inline">{Number(wallet.balance ?? 0).toFixed(3)} STT</span>
      <span className="hidden rounded-md border border-signal/30 bg-signal/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-signal sm:inline">Somnia</span>
      <button onClick={handleRefresh} className="rounded-md p-1 text-white/45 hover:bg-white/5 hover:text-white" aria-label="Refresh balance">
        <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

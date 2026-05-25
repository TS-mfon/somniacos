"use client";

import { useEffect, useState } from "react";
import { createPublicClient, custom, formatEther, http, type Address, type EIP1193Provider } from "viem";
import { WalletCards, Zap } from "lucide-react";
import { somnia } from "../lib/contracts";

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

    const accounts = await ethereum.request({ method: "eth_accounts" }) as Address[];
    const selected = address ?? accounts[0];
    const chain = await ethereum.request({ method: "eth_chainId" }) as string;

    if (!selected) {
      setWallet({ chainId: Number.parseInt(chain, 16) });
      return;
    }

    const client = createPublicClient({ chain: somnia, transport: http(somnia.rpcUrls.default.http[0]) });
    const balance = await client.getBalance({ address: selected });
    setWallet({ address: selected, chainId: Number.parseInt(chain, 16), balance: formatEther(balance) });
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
    } catch {
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
  const { wallet, connect, switchToSomnia } = useSomniaWallet();
  const wrongNetwork = wallet.chainId && wallet.chainId !== somnia.id;

  if (!wallet.address) {
    return (
      <button onClick={connect} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-signal to-cobalt px-4 py-2 text-sm font-semibold text-black shadow-glow">
        <WalletCards className="h-4 w-4" />
        Connect wallet
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button onClick={switchToSomnia} className="inline-flex items-center gap-2 rounded-full border border-ember/40 bg-ember/15 px-4 py-2 text-sm font-semibold text-ember">
        <Zap className="h-4 w-4" />
        Switch to Somnia
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-signal/25 bg-signal/10 px-4 py-2 text-sm text-white">
      <span className="h-2 w-2 animate-pulse rounded-full bg-signal" />
      <span className="font-mono">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
      <span className="text-white/45">{Number(wallet.balance ?? 0).toFixed(3)} STT</span>
    </div>
  );
}

export interface SolanaProvider {
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(
    message: Uint8Array,
    display?: string
  ): Promise<{ signature: Uint8Array } | Uint8Array>;
}

export function walletProvider(): SolanaProvider {
  const browser = window as unknown as {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
  };
  const wallet = browser.phantom?.solana ?? browser.solana;
  if (!wallet) {
    throw new Error("Install Phantom or another Solana wallet to continue");
  }
  return wallet;
}

export function truncateWallet(publicKey: string): string {
  return `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;
}

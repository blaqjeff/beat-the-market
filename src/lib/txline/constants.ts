export type TxlineNetwork = "mainnet" | "devnet";

export const TXLINE_NETWORKS = {
  mainnet: {
    apiOrigin: "https://txline.txodds.com",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    tokenMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    freeServiceLevels: {
      delayed: 1,
      realtime: 12,
    },
  },
  devnet: {
    apiOrigin: "https://txline-dev.txodds.com",
    rpcUrl: "https://api.devnet.solana.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    tokenMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    freeServiceLevels: {
      delayed: 1,
      realtime: null,
    },
  },
} as const satisfies Record<
  TxlineNetwork,
  {
    apiOrigin: string;
    rpcUrl: string;
    programId: string;
    tokenMint: string;
    freeServiceLevels: {
      delayed: number;
      realtime: number | null;
    };
  }
>;

export const TXLINE_SUBSCRIPTION_WEEKS = 4;

export const TXLINE_ENDPOINTS = {
  guestAuth: "/auth/guest/start",
  activateToken: "/api/token/activate",
  fixturesSnapshot: "/api/fixtures/snapshot",
  oddsStream: "/api/odds/stream",
  scoresStream: "/api/scores/stream",
  oddsSnapshot: (fixtureId: string | number) =>
    `/api/odds/snapshot/${fixtureId}`,
  scoresSnapshot: (fixtureId: string | number) =>
    `/api/scores/snapshot/${fixtureId}`,
  scoresUpdates: (fixtureId: string | number) =>
    `/api/scores/updates/${fixtureId}`,
  historicalScores: (fixtureId: string | number) =>
    `/api/scores/historical/${fixtureId}`,
  scoreValidation: "/api/scores/stat-validation",
} as const;

export const SOCCER_GAME_PHASE = {
  1: "not_started",
  2: "first_half",
  3: "halftime",
  4: "second_half",
  5: "finished",
  6: "waiting_extra_time",
  7: "extra_time_first_half",
  8: "extra_time_halftime",
  9: "extra_time_second_half",
  10: "finished_after_extra_time",
  11: "waiting_penalties",
  12: "penalties",
  13: "finished_after_penalties",
  14: "interrupted",
  15: "abandoned",
  16: "cancelled",
  17: "coverage_cancelled",
  18: "coverage_suspended",
  19: "postponed",
} as const;

export const SOCCER_TOTAL_STAT_KEYS = {
  participant1Goals: 1,
  participant2Goals: 2,
  participant1YellowCards: 3,
  participant2YellowCards: 4,
  participant1RedCards: 5,
  participant2RedCards: 6,
  participant1Corners: 7,
  participant2Corners: 8,
} as const;

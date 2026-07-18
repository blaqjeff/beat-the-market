import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccountLenForMint,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";

import {
  TXLINE_NETWORKS,
  TXLINE_SUBSCRIPTION_WEEKS,
  type TxlineNetwork,
} from "./constants";

const SUBSCRIBE_DISCRIMINATOR = Uint8Array.from([
  254, 28, 191, 138, 156, 179, 183, 53,
]);

function subscribeData(serviceLevelId: number, weeks: number): Buffer {
  if (!Number.isInteger(serviceLevelId) || serviceLevelId < 0 || serviceLevelId > 65_535) {
    throw new Error("Service level ID must fit in an unsigned 16-bit integer");
  }
  if (!Number.isInteger(weeks) || weeks < 4 || weeks % 4 !== 0 || weeks > 255) {
    throw new Error("Subscription weeks must be a multiple of four");
  }

  const data = Buffer.alloc(11);
  Buffer.from(SUBSCRIBE_DISCRIMINATOR).copy(data, 0);
  data.writeUInt16LE(serviceLevelId, 8);
  data.writeUInt8(weeks, 10);
  return data;
}

export interface SubscriptionTransactionPlan {
  transactionBase64: string;
  blockhash: string;
  lastValidBlockHeight: number;
  serviceLevelId: number;
  weeks: number;
  userBalanceLamports: number;
  estimatedFeeLamports: number;
  estimatedRentLamports: number;
  estimatedTotalLamports: number;
  createsTokenAccount: boolean;
  simulationError: unknown | null;
  simulationLogs: string[];
}

export async function buildSubscriptionTransaction(
  connection: Connection,
  user: PublicKey,
  network: TxlineNetwork,
  serviceLevelId: number
): Promise<SubscriptionTransactionPlan> {
  const config = TXLINE_NETWORKS[network];
  const programId = new PublicKey(config.programId);
  const tokenMint = new PublicKey(config.tokenMint);

  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMint,
    user,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const userTokenAccountInfo = await connection.getAccountInfo(
    userTokenAccount,
    "confirmed"
  );

  const [pricingMatrix] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    programId
  );
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    programId
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    tokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();
  let estimatedRentLamports = 0;

  if (!userTokenAccountInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        user,
        userTokenAccount,
        user,
        tokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    const mint = await getMint(
      connection,
      tokenMint,
      "confirmed",
      TOKEN_2022_PROGRAM_ID
    );
    const tokenAccountLength = getAccountLenForMint(mint);
    estimatedRentLamports =
      await connection.getMinimumBalanceForRentExemption(tokenAccountLength);
  }

  transaction.add(
    new TransactionInstruction({
      programId,
      keys: [
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: pricingMatrix, isSigner: false, isWritable: false },
        { pubkey: tokenMint, isSigner: false, isWritable: false },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
        { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: subscribeData(serviceLevelId, TXLINE_SUBSCRIPTION_WEEKS),
    })
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = user;

  const fee = await connection.getFeeForMessage(
    transaction.compileMessage(),
    "confirmed"
  );
  const estimatedFeeLamports = fee.value ?? 0;
  const simulation = await connection.simulateTransaction(transaction);
  const userBalanceLamports = await connection.getBalance(user, "confirmed");

  return {
    transactionBase64: transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64"),
    blockhash,
    lastValidBlockHeight,
    serviceLevelId,
    weeks: TXLINE_SUBSCRIPTION_WEEKS,
    userBalanceLamports,
    estimatedFeeLamports,
    estimatedRentLamports,
    estimatedTotalLamports: estimatedFeeLamports + estimatedRentLamports,
    createsTokenAccount: !userTokenAccountInfo,
    simulationError: simulation.value.err,
    simulationLogs: simulation.value.logs ?? [],
  };
}

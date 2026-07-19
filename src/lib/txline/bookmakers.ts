/** TxLINE demargined consensus feed used for call pricing. */
export const CONSENSUS_BOOKMAKER_ID = 10021;
export const CONSENSUS_BOOKMAKER_NAME = "TXLineStablePriceDemargined";

export function isConsensusBookmaker(snapshot: {
  bookmaker: string | null;
  bookmakerId: number | null;
}): boolean {
  if (snapshot.bookmakerId === CONSENSUS_BOOKMAKER_ID) return true;
  const name = (snapshot.bookmaker ?? "").toLowerCase();
  return name.includes("txline") && name.includes("stable");
}

# Criteria upgrades — tracking

Maps Consumer & Fan Experiences judging criteria → product work.
Source: https://superteam.fun/earn/listing/consumer-and-fan-experiences

| ID | Upgrade | Criteria lift | Status |
| --- | --- | --- | --- |
| U1 | **Momentum / tempo meter** — live home↔away pressure + match tempo from recent goals, cards, corners, and 1X2 odds drift | Real-Time Responsiveness, Fan UX | done |
| U2 | **Cards & corners** — timeline moments + running counters feeding the meter | Real-Time Responsiveness | done |
| U3 | **1st-half markets** — allow `MarketPeriod=half=1` 1X2 / O/U / AH calls; settle on HT score | Originality, Completeness | done |
| U4 | **Asian handicap calls** — `ASIANHANDICAP_PARTICIPANT_GOALS` place + resolve | Originality, Completeness | done |
| U5 | **Consensus drift on open calls** — live % vs entry (“with you / against you”) | Fan UX, Real-Time | done |
| U6 | **World Cup live board on home** — multi-fixture scores/phase/momentum, live-first | Fan UX, Completeness | done |
| U7 | **Bookmaker spread UI** — multi-book table + per-outcome range on markets | Fan UX, Originality | done |
| U8 | **Past-match cinema** — step-through France–England replay for demo recording | Completeness, Real-Time (demoable) | done |
| U9 | **Commercial path** — premium + branded/sponsored leagues (docs + leagues UI) | Commercial & Monetization | done |

## Explicitly deferred (not in this pass)

- League push notifications / social “goal just projected +X”
- Deploy / demo video (submission pack — separate Phase 7)
- Paid checkout / brand admin console (pitch only for hackathon)

## Demo notes

- Cinema **Reset** rewinds match events/odds to prematch and drops open
  (pending) calls only. Settled/void calls, point ledger, and receipts stay.

## Monetization (for judges)

See [BUSINESS.md](./BUSINESS.md): free leagues → premium rules → branded/sponsored
competitions. White-label is a later channel.

## How to see it (demo recording)

```bash
npm run db:up
npm run db:migrate
npm run demo:cinema                 # reset to prematch
# keep npm run dev running
# open http://localhost:3000/matches/18257865
# place a call → click Advance match through the cinema bar → Settle
```

## Acceptance notes

- **Momentum ≠ chaos:** meter answers “who has the run of play right now?” and “how hot is the tempo?”, not random noise.
- HT markets must not settle on full-time goals; missing HT snapshot → void with reason (with ≤45′ / period-key fallbacks).
- Asian handicap uses TxLINE `part1`/`part2` + `line=`; pushes and quarter-line splits void (same spirit as totals).

## Primary files

- `src/lib/game/side-stats.ts` — TxLINE stat keys / period helpers
- `src/lib/game/live-context.ts` — timeline, HT score, momentum
- `src/lib/game/scoring.ts` — market allowlist
- `src/lib/game/resolve-markets.ts` — AH + period-aware resolve
- `src/lib/game/settle.ts` — period scores into resolve
- `src/lib/game/match-state.ts` — expose momentum + call drift
- `src/lib/game/home-board.ts` — multi-fixture live board data
- `src/components/game/MomentumMeter.tsx` — meter UI
- `src/components/game/MatchCentre.tsx` / `MatchCallsSheet.tsx`
- `src/app/page.tsx` — World Cup board

import { writeFileSync } from "node:fs";

/** Pipe rows: homeCode|home|hs|as|awayCode|away|round|iso|venue|optionalNote */
const RAW = `
MEX|Mexico|2|0|RSA|South Africa|Group A|2026-06-11T19:00:00.000Z|Mexico City Stadium
KOR|Korea Republic|2|1|CZE|Czechia|Group A|2026-06-12T19:00:00.000Z|Guadalajara Stadium
CAN|Canada|1|1|BIH|Bosnia and Herzegovina|Group B|2026-06-12T23:00:00.000Z|Toronto Stadium
USA|USA|4|1|PAR|Paraguay|Group D|2026-06-13T02:00:00.000Z|Los Angeles Stadium
QAT|Qatar|1|1|SUI|Switzerland|Group B|2026-06-13T22:00:00.000Z|San Francisco Bay Area Stadium
BRA|Brazil|1|1|MAR|Morocco|Group C|2026-06-14T01:00:00.000Z|New York New Jersey Stadium
HAI|Haiti|0|1|SCO|Scotland|Group C|2026-06-14T19:00:00.000Z|Boston Stadium
AUS|Australia|2|0|TUR|Türkiye|Group D|2026-06-14T22:00:00.000Z|BC Place Vancouver
GER|Germany|7|1|CUW|Curaçao|Group E|2026-06-15T01:00:00.000Z|Houston Stadium
NED|Netherlands|2|2|JPN|Japan|Group F|2026-06-15T01:00:00.000Z|Dallas Stadium
CIV|Côte d'Ivoire|1|0|ECU|Ecuador|Group E|2026-06-15T19:00:00.000Z|Philadelphia Stadium
SWE|Sweden|5|1|TUN|Tunisia|Group F|2026-06-15T22:00:00.000Z|Monterrey Stadium
ESP|Spain|0|0|CPV|Cabo Verde|Group H|2026-06-16T00:00:00.000Z|Atlanta Stadium
BEL|Belgium|1|1|EGY|Egypt|Group G|2026-06-16T02:00:00.000Z|Seattle Stadium
KSA|Saudi Arabia|1|1|URU|Uruguay|Group H|2026-06-16T01:00:00.000Z|Miami Stadium
IRN|IR Iran|2|2|NZL|New Zealand|Group G|2026-06-16T22:00:00.000Z|Los Angeles Stadium
FRA|France|3|1|SEN|Senegal|Group I|2026-06-17T01:00:00.000Z|New York New Jersey Stadium
IRQ|Iraq|1|4|NOR|Norway|Group I|2026-06-17T19:00:00.000Z|Boston Stadium
ARG|Argentina|3|0|ALG|Algeria|Group J|2026-06-17T22:00:00.000Z|Kansas City Stadium
AUT|Austria|3|1|JOR|Jordan|Group J|2026-06-18T00:00:00.000Z|San Francisco Bay Area Stadium
POR|Portugal|1|1|COD|Congo DR|Group K|2026-06-18T01:00:00.000Z|Houston Stadium
ENG|England|4|2|CRO|Croatia|Group L|2026-06-18T19:00:00.000Z|Dallas Stadium
GHA|Ghana|1|0|PAN|Panama|Group L|2026-06-18T22:00:00.000Z|Toronto Stadium
UZB|Uzbekistan|1|3|COL|Colombia|Group K|2026-06-19T01:00:00.000Z|Mexico City Stadium
CZE|Czechia|1|1|RSA|South Africa|Group A|2026-06-19T19:00:00.000Z|Atlanta Stadium
SUI|Switzerland|4|1|BIH|Bosnia and Herzegovina|Group B|2026-06-19T22:00:00.000Z|Los Angeles Stadium
CAN|Canada|6|0|QAT|Qatar|Group B|2026-06-20T02:00:00.000Z|BC Place Vancouver
MEX|Mexico|1|0|KOR|Korea Republic|Group A|2026-06-20T01:00:00.000Z|Guadalajara Stadium
USA|USA|2|0|AUS|Australia|Group D|2026-06-20T02:00:00.000Z|Seattle Stadium
SCO|Scotland|0|1|MAR|Morocco|Group C|2026-06-20T19:00:00.000Z|Boston Stadium
BRA|Brazil|3|0|HAI|Haiti|Group C|2026-06-20T22:00:00.000Z|Philadelphia Stadium
TUR|Türkiye|0|1|PAR|Paraguay|Group D|2026-06-21T02:00:00.000Z|San Francisco Bay Area Stadium
NED|Netherlands|5|1|SWE|Sweden|Group F|2026-06-21T01:00:00.000Z|Houston Stadium
GER|Germany|2|1|CIV|Côte d'Ivoire|Group E|2026-06-21T02:00:00.000Z|Toronto Stadium
ECU|Ecuador|0|0|CUW|Curaçao|Group E|2026-06-21T19:00:00.000Z|Kansas City Stadium
TUN|Tunisia|0|4|JPN|Japan|Group F|2026-06-21T22:00:00.000Z|Monterrey Stadium
ESP|Spain|4|0|KSA|Saudi Arabia|Group H|2026-06-21T23:00:00.000Z|Atlanta Stadium
BEL|Belgium|0|0|IRN|IR Iran|Group G|2026-06-22T02:00:00.000Z|Los Angeles Stadium
URU|Uruguay|2|2|CPV|Cabo Verde|Group H|2026-06-22T01:00:00.000Z|Miami Stadium
NZL|New Zealand|1|3|EGY|Egypt|Group G|2026-06-22T02:00:00.000Z|BC Place Vancouver
ARG|Argentina|2|0|AUT|Austria|Group J|2026-06-22T22:00:00.000Z|Dallas Stadium
FRA|France|3|0|IRQ|Iraq|Group I|2026-06-22T19:00:00.000Z|Philadelphia Stadium
NOR|Norway|3|2|SEN|Senegal|Group I|2026-06-23T01:00:00.000Z|New York New Jersey Stadium
JOR|Jordan|1|2|ALG|Algeria|Group J|2026-06-23T22:00:00.000Z|San Francisco Bay Area Stadium
POR|Portugal|5|0|UZB|Uzbekistan|Group K|2026-06-23T01:00:00.000Z|Houston Stadium
ENG|England|0|0|GHA|Ghana|Group L|2026-06-23T19:00:00.000Z|Boston Stadium
PAN|Panama|0|1|CRO|Croatia|Group L|2026-06-23T22:00:00.000Z|Toronto Stadium
COL|Colombia|1|0|COD|Congo DR|Group K|2026-06-24T01:00:00.000Z|Guadalajara Stadium
SUI|Switzerland|2|1|CAN|Canada|Group B|2026-06-24T02:00:00.000Z|BC Place Vancouver
BIH|Bosnia and Herzegovina|3|1|QAT|Qatar|Group B|2026-06-24T02:00:00.000Z|Seattle Stadium
SCO|Scotland|0|3|BRA|Brazil|Group C|2026-06-24T22:00:00.000Z|Miami Stadium
MAR|Morocco|4|2|HAI|Haiti|Group C|2026-06-24T19:00:00.000Z|Atlanta Stadium
CZE|Czechia|0|3|MEX|Mexico|Group A|2026-06-25T01:00:00.000Z|Mexico City Stadium
RSA|South Africa|1|0|KOR|Korea Republic|Group A|2026-06-25T01:00:00.000Z|Monterrey Stadium
CUW|Curaçao|0|2|CIV|Côte d'Ivoire|Group E|2026-06-25T19:00:00.000Z|Philadelphia Stadium
ECU|Ecuador|2|1|GER|Germany|Group E|2026-06-25T22:00:00.000Z|New York New Jersey Stadium
JPN|Japan|1|1|SWE|Sweden|Group F|2026-06-25T22:00:00.000Z|Dallas Stadium
TUN|Tunisia|1|3|NED|Netherlands|Group F|2026-06-25T23:00:00.000Z|Kansas City Stadium
TUR|Türkiye|3|2|USA|USA|Group D|2026-06-26T02:00:00.000Z|Los Angeles Stadium
PAR|Paraguay|0|0|AUS|Australia|Group D|2026-06-26T02:00:00.000Z|San Francisco Bay Area Stadium
NOR|Norway|1|4|FRA|France|Group I|2026-06-26T19:00:00.000Z|Boston Stadium
SEN|Senegal|5|0|IRQ|Iraq|Group I|2026-06-26T22:00:00.000Z|Toronto Stadium
CPV|Cabo Verde|0|0|KSA|Saudi Arabia|Group H|2026-06-27T01:00:00.000Z|Houston Stadium
URU|Uruguay|0|1|ESP|Spain|Group H|2026-06-27T01:00:00.000Z|Guadalajara Stadium
EGY|Egypt|1|1|IRN|IR Iran|Group G|2026-06-27T02:00:00.000Z|Seattle Stadium
NZL|New Zealand|1|5|BEL|Belgium|Group G|2026-06-27T02:00:00.000Z|BC Place Vancouver
PAN|Panama|0|2|ENG|England|Group L|2026-06-27T22:00:00.000Z|New York New Jersey Stadium
CRO|Croatia|2|1|GHA|Ghana|Group L|2026-06-27T22:00:00.000Z|Philadelphia Stadium
COL|Colombia|0|0|POR|Portugal|Group K|2026-06-27T23:00:00.000Z|Miami Stadium
COD|Congo DR|3|1|UZB|Uzbekistan|Group K|2026-06-27T23:00:00.000Z|Atlanta Stadium
ALG|Algeria|3|3|AUT|Austria|Group J|2026-06-28T19:00:00.000Z|Kansas City Stadium
JOR|Jordan|1|3|ARG|Argentina|Group J|2026-06-28T22:00:00.000Z|Dallas Stadium
RSA|South Africa|0|1|CAN|Canada|Round of 32|2026-06-28T23:00:00.000Z|Los Angeles Stadium
BRA|Brazil|2|1|JPN|Japan|Round of 32|2026-06-29T22:00:00.000Z|Houston Stadium
GER|Germany|1|1|PAR|Paraguay|Round of 32|2026-06-29T19:00:00.000Z|Boston Stadium|Paraguay win on penalties (4–3)
NED|Netherlands|1|1|MAR|Morocco|Round of 32|2026-06-30T22:00:00.000Z|Monterrey Stadium|Morocco win on penalties (3–2)
CIV|Côte d'Ivoire|1|2|NOR|Norway|Round of 32|2026-06-30T19:00:00.000Z|Dallas Stadium
FRA|France|3|0|SWE|Sweden|Round of 32|2026-06-30T23:00:00.000Z|New York New Jersey Stadium
MEX|Mexico|2|0|ECU|Ecuador|Round of 32|2026-07-01T01:00:00.000Z|Mexico City Stadium
ENG|England|2|1|COD|Congo DR|Round of 32|2026-07-01T22:00:00.000Z|Atlanta Stadium
BEL|Belgium|3|2|SEN|Senegal|Round of 32|2026-07-01T02:00:00.000Z|Seattle Stadium
USA|USA|2|0|BIH|Bosnia and Herzegovina|Round of 32|2026-07-02T02:00:00.000Z|San Francisco Bay Area Stadium
ESP|Spain|3|0|AUT|Austria|Round of 32|2026-07-02T22:00:00.000Z|Los Angeles Stadium
POR|Portugal|2|1|CRO|Croatia|Round of 32|2026-07-02T19:00:00.000Z|Toronto Stadium
SUI|Switzerland|2|0|ALG|Algeria|Round of 32|2026-07-03T02:00:00.000Z|BC Place Vancouver
AUS|Australia|1|1|EGY|Egypt|Round of 32|2026-07-03T22:00:00.000Z|Dallas Stadium|Egypt win on penalties (4–2)
ARG|Argentina|3|2|CPV|Cabo Verde|Round of 32|2026-07-03T23:00:00.000Z|Miami Stadium
COL|Colombia|1|0|GHA|Ghana|Round of 32|2026-07-04T01:00:00.000Z|Kansas City Stadium
CAN|Canada|0|3|MAR|Morocco|Round of 16|2026-07-04T22:00:00.000Z|Houston Stadium
PAR|Paraguay|0|1|FRA|France|Round of 16|2026-07-04T19:00:00.000Z|Philadelphia Stadium
BRA|Brazil|1|2|NOR|Norway|Round of 16|2026-07-05T22:00:00.000Z|New York New Jersey Stadium
MEX|Mexico|2|3|ENG|England|Round of 16|2026-07-06T01:00:00.000Z|Mexico City Stadium
POR|Portugal|0|1|ESP|Spain|Round of 16|2026-07-06T22:00:00.000Z|Dallas Stadium
USA|USA|1|4|BEL|Belgium|Round of 16|2026-07-07T02:00:00.000Z|Seattle Stadium
ARG|Argentina|3|2|EGY|Egypt|Round of 16|2026-07-07T22:00:00.000Z|Atlanta Stadium
SUI|Switzerland|0|0|COL|Colombia|Round of 16|2026-07-07T02:00:00.000Z|BC Place Vancouver|Switzerland win on penalties (4–3)
FRA|France|2|0|MAR|Morocco|Quarter-final|2026-07-09T23:00:00.000Z|Boston Stadium
ESP|Spain|2|1|BEL|Belgium|Quarter-final|2026-07-10T19:00:00.000Z|Los Angeles Stadium
NOR|Norway|1|2|ENG|England|Quarter-final|2026-07-11T19:00:00.000Z|Miami Stadium|England win after extra time
ARG|Argentina|3|1|SUI|Switzerland|Quarter-final|2026-07-12T00:00:00.000Z|Kansas City Stadium|Argentina win after extra time
FRA|France|0|2|ESP|Spain|Semi-final|2026-07-14T19:00:00.000Z|Dallas Stadium
ENG|England|1|2|ARG|Argentina|Semi-final|2026-07-15T19:00:00.000Z|Atlanta Stadium
FRA|France|4|6|ENG|England|Third place|2026-07-18T21:00:00.000Z|Miami Stadium|England take bronze in a 10-goal classic
`.trim();

const matches = RAW.split("\n").map((line, i) => {
  const p = line.split("|");
  const home = p[1];
  const hs = Number(p[2]);
  const as = Number(p[3]);
  const away = p[5];
  const round = p[6];
  const playedAt = p[7];
  const venue = p[8];
  const note = p[9];
  const summary = note
    ? `${note}.`
    : hs === as
      ? `${home} and ${away} draw ${hs}–${as}.`
      : `${hs > as ? home : away} beat ${hs > as ? away : home} ${Math.max(hs, as)}–${Math.min(hs, as)}.`;

  const row = {
    id: `wc26-${String(i + 1).padStart(3, "0")}`,
    round,
    home,
    away,
    homeScore: hs,
    awayScore: as,
    playedAt,
    venue,
    summary,
  };
  if (home === "France" && away === "England" && round === "Third place") {
    row.sourceFixtureId = "18257865";
  }
  return row;
});

const out = {
  tournament: "FIFA World Cup 2026",
  note: "Full finished-match archive from FIFA scores & fixtures. Final omitted until full-time.",
  matches,
};

writeFileSync(
  new URL("../../src/data/world-cup-2026-history.json", import.meta.url),
  `${JSON.stringify(out, null, 2)}\n`
);
console.log(`Wrote ${matches.length} matches`);

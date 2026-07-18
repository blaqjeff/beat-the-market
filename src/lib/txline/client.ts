import { TXLINE_ENDPOINTS } from "./constants";
import {
  txlineFixtureListSchema,
  txlineRecordSchema,
  txlineRecordListSchema,
  txlineScoreRecordListSchema,
  type TxlineFixtureRecord,
  type TxlineRecord,
  type TxlineScoreRecord,
} from "./schemas";
import {
  parseSseBlock,
  parseSseData,
  readSseMessages,
  type SseMessage,
} from "./sse";

export interface TxlineClientConfig {
  apiOrigin: string;
  guestJwt: string;
  apiToken: string;
  timeoutMs?: number;
  fetchImplementation?: typeof fetch;
}

export interface FixtureSnapshotQuery {
  competitionId?: string | number;
}

export interface ScoreValidationQuery {
  fixtureId: string | number;
  sequence: number;
  statKeys: readonly number[];
}

export type TxlineStream = "odds" | "scores";

export class TxlineHttpError extends Error {
  constructor(
    readonly status: number,
    readonly endpoint: string,
    readonly responsePreview: string
  ) {
    super(`TxLINE request failed with ${status} at ${endpoint}`);
    this.name = "TxlineHttpError";
  }
}

export class TxlineClient {
  private readonly apiOrigin: string;
  private readonly guestJwt: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;

  constructor(config: TxlineClientConfig) {
    this.apiOrigin = config.apiOrigin.replace(/\/$/, "");
    this.guestJwt = config.guestJwt;
    this.apiToken = config.apiToken;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.fetchImplementation = config.fetchImplementation ?? fetch;
  }

  async fixturesSnapshot(
    query: FixtureSnapshotQuery = {}
  ): Promise<TxlineFixtureRecord[]> {
    const payload = await this.getJson(
      TXLINE_ENDPOINTS.fixturesSnapshot,
      query.competitionId === undefined
        ? undefined
        : { competitionId: query.competitionId }
    );
    return txlineFixtureListSchema.parse(payload);
  }

  async oddsSnapshot(
    fixtureId: string | number
  ): Promise<TxlineRecord[]> {
    const payload = await this.getJson(
      TXLINE_ENDPOINTS.oddsSnapshot(fixtureId)
    );
    return txlineRecordListSchema.parse(payload);
  }

  async scoresSnapshot(
    fixtureId: string | number
  ): Promise<TxlineScoreRecord[]> {
    const payload = await this.getJson(
      TXLINE_ENDPOINTS.scoresSnapshot(fixtureId)
    );
    return txlineScoreRecordListSchema.parse(payload);
  }

  async scoreUpdates(
    fixtureId: string | number
  ): Promise<TxlineScoreRecord[]> {
    const payload = await this.getJson(
      TXLINE_ENDPOINTS.scoresUpdates(fixtureId)
    );
    return txlineScoreRecordListSchema.parse(payload);
  }

  async historicalScores(
    fixtureId: string | number
  ): Promise<TxlineScoreRecord[]> {
    const response = await this.request(
      TXLINE_ENDPOINTS.historicalScores(fixtureId)
    );
    const body = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      payload = body
        .split(/\r?\n\r?\n/)
        .map(parseSseBlock)
        .filter((message): message is SseMessage => message !== null)
        .map(parseSseData)
        .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
        .filter((entry) => entry !== null && typeof entry !== "string");
    }
    return txlineScoreRecordListSchema.parse(payload);
  }

  async scoreValidation(query: ScoreValidationQuery): Promise<TxlineRecord> {
    if (query.statKeys.length === 0) {
      throw new Error("At least one score stat key is required");
    }

    const payload = await this.getJson(TXLINE_ENDPOINTS.scoreValidation, {
      fixtureId: query.fixtureId,
      seq: query.sequence,
      statKeys: query.statKeys.join(","),
    });
    return txlineRecordSchema.parse(payload);
  }

  async openStream(stream: TxlineStream): Promise<Response> {
    const endpoint =
      stream === "odds"
        ? TXLINE_ENDPOINTS.oddsStream
        : TXLINE_ENDPOINTS.scoresStream;

    return this.request(endpoint, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  async *stream(stream: TxlineStream): AsyncGenerator<SseMessage> {
    const response = await this.openStream(stream);
    yield* readSseMessages(response);
  }

  private async getJson(
    endpoint: string,
    query?: Record<string, string | number>
  ): Promise<unknown> {
    const response = await this.request(endpoint, {}, query);
    return response.json() as Promise<unknown>;
  }

  private async request(
    endpoint: string,
    init: RequestInit = {},
    query?: Record<string, string | number>
  ): Promise<Response> {
    const url = new URL(endpoint, this.apiOrigin);
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, String(value));
    }

    const response = await this.fetchImplementation(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.guestJwt}`,
        "X-Api-Token": this.apiToken,
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const responsePreview = (await response.text()).slice(0, 500);
      throw new TxlineHttpError(
        response.status,
        `${url.pathname}${url.search}`,
        responsePreview
      );
    }

    return response;
  }
}

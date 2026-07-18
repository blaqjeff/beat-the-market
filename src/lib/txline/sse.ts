export interface SseMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export function parseSseBlock(block: string): SseMessage | null {
  const message: SseMessage = { data: "" };

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;

    const separatorIndex = rawLine.indexOf(":");
    const field =
      separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value =
      separatorIndex === -1
        ? ""
        : rawLine.slice(separatorIndex + 1).replace(/^ /, "");

    if (field === "data") message.data += `${value}\n`;
    if (field === "event") message.event = value;
    if (field === "id") message.id = value;
    if (field === "retry") {
      const retry = Number(value);
      if (Number.isFinite(retry)) message.retry = retry;
    }
  }

  message.data = message.data.replace(/\n$/, "");
  return message.data || message.event || message.id ? message : null;
}

export function parseSseData(message: SseMessage): unknown {
  if (!message.data) return null;
  try {
    return JSON.parse(message.data) as unknown;
  } catch {
    return message.data;
  }
}

export async function* readSseMessages(
  response: Response
): AsyncGenerator<SseMessage> {
  if (!response.body) {
    throw new Error("TxLINE stream response has no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.match(/\r?\n\r?\n/);
      while (separator?.index !== undefined) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);

        const message = parseSseBlock(block);
        if (message) yield message;

        separator = buffer.match(/\r?\n\r?\n/);
      }
    }

    buffer += decoder.decode();
    const trailingMessage = parseSseBlock(buffer);
    if (trailingMessage) yield trailingMessage;
  } finally {
    reader.releaseLock();
  }
}

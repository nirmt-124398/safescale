import Fastify from "fastify";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade"
]);

function copyResponseHeaders(upstreamHeaders, reply) {
  for (const [key, value] of upstreamHeaders.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      reply.header(key, value);
    }
  }
}

function createMockCompletion(requestBody) {
  const model = requestBody?.model || "auto";
  return {
    id: `chatcmpl-mock-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Hi from SafeScale mock mode."
        },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

function shouldStream(requestBody) {
  return requestBody?.stream === true;
}

async function* generateMockStreamChunks(mockCompletion) {
  const content = mockCompletion.choices[0].message.content;
  const words = content.split(" ");

  for (const word of words) {
    yield {
      choices: [
        {
          index: 0,
          delta: {
            content: word
          }
        }
      ]
    };
  }

  yield {
    choices: [
      {
        index: 0,
        delta: {
          content: ""
        },
        finish_reason: "stop"
      }
    ]
  };
}

async function streamMockResponse(reply, chunkGenerator) {
  reply.hijack();
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  for await (const chunk of chunkGenerator) {
    reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  reply.raw.write("data: [DONE]\n\n");
  reply.raw.end();
}

async function streamUpstreamResponse(reply, upstreamResponse) {
  reply.hijack();
  reply.raw.writeHead(upstreamResponse.status, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const reader = upstreamResponse.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      reply.raw.write(Buffer.from(value));
    }
  } finally {
    reply.raw.end();
  }
}

export function buildUpstreamRequest({ baseUrl, apiKey, body, headers }) {
  return {
    url: `${baseUrl}/v1/chat/completions`,
    init: {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": headers["content-type"] || "application/json",
        accept: headers.accept || "application/json"
      },
      body: JSON.stringify(body)
    }
  };
}

export function createApp({
  fetchImpl = fetch,
  openAIBaseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com",
  openAIApiKey = process.env.OPENAI_API_KEY
} = {}) {
  const app = Fastify({ logger: true });

  app.post("/v1/chat/completions", async (request, reply) => {
    // Handle streaming requests
    if (shouldStream(request.body)) {
      if (!openAIApiKey) {
        const mockCompletion = createMockCompletion(request.body);
        return await streamMockResponse(reply, generateMockStreamChunks(mockCompletion));
      } else {
        const { url, init } = buildUpstreamRequest({
          baseUrl: openAIBaseUrl,
          apiKey: openAIApiKey,
          body: request.body,
          headers: request.headers
        });

        try {
          const upstreamResponse = await fetchImpl(url, init);
          return await streamUpstreamResponse(reply, upstreamResponse);
        } catch (error) {
          request.log.error({ err: error }, "Upstream streaming request failed");
          reply.code(502);
          return {
            error: {
              message: "Upstream provider streaming request failed",
              type: "upstream_error"
            }
          };
        }
      }
    }

    // Handle non-streaming requests (existing logic)
    if (!openAIApiKey) {
      reply.code(200);
      return createMockCompletion(request.body);
    }

    const { url, init } = buildUpstreamRequest({
      baseUrl: openAIBaseUrl,
      apiKey: openAIApiKey,
      body: request.body,
      headers: request.headers
    });

    let upstreamResponse;
    try {
      upstreamResponse = await fetchImpl(url, init);
    } catch (error) {
      request.log.error({ err: error }, "Upstream request failed");
      reply.code(502);
      return {
        error: {
          message: "Upstream provider request failed",
          type: "upstream_error"
        }
      };
    }

    copyResponseHeaders(upstreamResponse.headers, reply);
    reply.code(upstreamResponse.status);

    const raw = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }

    return reply.send(raw);
  });

  return app;
}

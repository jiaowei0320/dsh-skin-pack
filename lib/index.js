// ../deepseek-harness/packages/credentials/credentials/lib/index.js
var REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
function credentialRef(value) {
  if (!REF_PATTERN.test(value)) throw new TypeError(`credential ref "${value}" must match ${String(REF_PATTERN)}`);
  return value;
}

// src/index.ts
var DEFAULT_API_KEY_ENV = "DEEPSEEK_API_KEY";
var DEFAULT_BASE_URL = "https://api.deepseek.com";
var BASE_URL_ENV = "DEEPSEEK_BASE_URL";
var CACHE_TTL_MS = 3e4;
var SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1e3;
var name = "dsh-skin-pack";
var inject = ["webServer"];
var cache = /* @__PURE__ */ new Map();
function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/api/dsh-account/balance",
    handler: async (_req, res) => {
      const payload = await loadBalance(ctx);
      writeJson(res, payload.ok ? 200 : 502, payload);
    }
  }), "dsh-skin-pack: account balance route");
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/api/dsh-account/tokens7d",
    handler: async (_req, res) => {
      const payload = await loadTokens7d(ctx);
      writeJson(res, payload.ok ? 200 : 502, payload);
    }
  }), "dsh-skin-pack: 7-day token route");
  console.log("[dsh-skin-pack] host half loaded (skins run in the browser)");
}
async function resolveApiKey(ctx) {
  const ref = credentialRef(DEFAULT_API_KEY_ENV);
  try {
    const credentials = ctx.get("credentials");
    if (credentials !== void 0) {
      const hit = await credentials.resolve(ref);
      if (hit !== void 0 && hit.value.length > 0) return hit.value;
    }
  } catch {
  }
  const ambient = process.env[DEFAULT_API_KEY_ENV];
  return ambient !== void 0 && ambient.length > 0 ? ambient : null;
}
async function loadBalance(ctx) {
  const apiKey = await resolveApiKey(ctx);
  if (apiKey === null) {
    return { ok: false, error: `no-api-key: set ${DEFAULT_API_KEY_ENV} or store it through the credentials service` };
  }
  const cached = cache.get(apiKey);
  if (cached !== void 0 && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.payload;
  const payload = await fetchBalance(apiKey);
  cache.set(apiKey, { fetchedAt: Date.now(), payload });
  return payload;
}
async function fetchBalance(apiKey) {
  const base = process.env[BASE_URL_ENV] ?? DEFAULT_BASE_URL;
  let response;
  try {
    response = await fetch(`${base}/user/balance`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5e3)
    });
  } catch (error) {
    return { ok: false, error: `balance request failed: ${String(error)}` };
  }
  if (!response.ok) return { ok: false, error: `balance HTTP ${response.status}` };
  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: "balance response was not JSON" };
  }
  const info = body.balance_infos?.[0];
  if (info === void 0) return { ok: false, error: "balance response missing balance_infos" };
  return {
    ok: true,
    available: body.is_available ?? true,
    currency: info.currency,
    total: info.total_balance,
    granted: info.granted_balance,
    toppedUp: info.topped_up_balance
  };
}
async function loadTokens7d(ctx) {
  const persistence = ctx.get("sessionPersistence");
  if (persistence === void 0) {
    return { ok: false, error: "no session persistence service" };
  }
  const backend = persistence;
  if (typeof backend.listSnapshots !== "function" || typeof backend.readRaw !== "function") {
    return { ok: false, error: "session persistence lacks list/readRaw" };
  }
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  let snapshots;
  try {
    snapshots = await backend.listSnapshots();
  } catch (error) {
    return { ok: false, error: `list failed: ${String(error)}` };
  }
  let tokens = 0;
  for (const snapshot of snapshots) {
    const id = snapshot.header.id;
    const revision = snapshot.revision;
    const cached = tokenCache.get(id);
    if (cached !== void 0 && cached.revision === revision) {
      tokens += cached.tokens;
      continue;
    }
    let content;
    try {
      const raw = await backend.readRaw(id);
      content = raw?.content;
    } catch {
    }
    if (content === void 0) continue;
    const total = foldSessionTokens(content, cutoff);
    tokenCache.set(id, { revision, tokens: total });
    tokens += total;
  }
  return { ok: true, tokens, source: "sessions" };
}
var tokenCache = /* @__PURE__ */ new Map();
function foldSessionTokens(content, cutoff) {
  let total = 0;
  for (const line of content.split("\n")) {
    if (line === "") continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event?.type !== "assistant/message") continue;
    if (typeof event.time !== "number" || event.time < cutoff) continue;
    const usage = event.data?.usage;
    if (usage === void 0) continue;
    total += finite(usage.inputTokens) + finite(usage.outputTokens) + finite(usage.cacheReadTokens) + finite(usage.cacheWriteTokens);
  }
  return total;
}
function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function writeJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map

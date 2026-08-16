window.__ModuleLoader__.load({ id: "dsh-skin-pack", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  fetchAccountBalance: () => fetchAccountBalance,
  fetchTokens7d: () => fetchTokens7d,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var STORAGE_KEY = "dsh-skin-pack.active";
var SKINS = [
  {
    id: "cyberpunk",
    label: "\u8D5B\u535A\u670B\u514B\u7D2B",
    colorScheme: "dark",
    tokens: {
      "--dsw-alias-bg-base": "#0d0618",
      "--dsw-alias-bg-layer-1": "#17102a",
      "--dsw-alias-bg-layer-2": "#1f1636",
      "--dsw-alias-bg-overlay": "#251a3d",
      "--dsw-alias-border-l1": "#3a2a5c",
      "--dsw-alias-border-l2": "#543a8a",
      "--dsw-alias-brand-primary": "#b44dff",
      "--dsw-alias-label-primary": "#f2ecff",
      "--dsw-alias-label-secondary": "#b3a3d6",
      "--dsw-alias-label-tertiary": "#8a78ad",
      "--dsw-alias-state-error-primary": "#ff4d6d",
      "--dsw-alias-state-success-primary": "#2ee6a8",
      "--dsw-alias-state-warn-primary": "#ffb84d",
      "--dsw-alias-interactive-bg-hover": "rgba(180, 77, 255, 0.12)",
      "--dsw-alias-button-primary-fill": "#b44dff",
      "--dsw-alias-button-primary-hover": "#c96aff",
      "--dsw-specific-sidebar-fill": "#120a20"
    }
  },
  {
    id: "neon-pulse",
    label: "\u9713\u8679\u8109\u51B2",
    colorScheme: "dark",
    tokens: {
      "--dsw-alias-bg-base": "#04121c",
      "--dsw-alias-bg-layer-1": "#0a1e2e",
      "--dsw-alias-bg-layer-2": "#0e2940",
      "--dsw-alias-bg-overlay": "#122f47",
      "--dsw-alias-border-l1": "#16405c",
      "--dsw-alias-border-l2": "#1f5a80",
      "--dsw-alias-brand-primary": "#00e5ff",
      "--dsw-alias-label-primary": "#e6fbff",
      "--dsw-alias-label-secondary": "#8fb8c9",
      "--dsw-alias-label-tertiary": "#6d94a8",
      "--dsw-alias-state-error-primary": "#ff5d73",
      "--dsw-alias-state-success-primary": "#37f2c3",
      "--dsw-alias-state-warn-primary": "#ffc04d",
      "--dsw-alias-interactive-bg-hover": "rgba(0, 229, 255, 0.12)",
      "--dsw-alias-button-primary-fill": "#00e5ff",
      "--dsw-alias-button-primary-hover": "#33ecff",
      "--dsw-specific-sidebar-fill": "#071620"
    }
  },
  {
    id: "miami-sunset",
    label: "\u8FC8\u963F\u5BC6\u65E5\u843D",
    colorScheme: "light",
    tokens: {
      "--dsw-alias-bg-base": "#fff5f2",
      "--dsw-alias-bg-layer-1": "#ffeae3",
      "--dsw-alias-bg-layer-2": "#ffddd1",
      "--dsw-alias-bg-overlay": "#ffd6c8",
      "--dsw-alias-border-l1": "#ffc4b4",
      "--dsw-alias-border-l2": "#ffa890",
      "--dsw-alias-brand-primary": "#ff2e93",
      "--dsw-alias-label-primary": "#3c2430",
      "--dsw-alias-label-secondary": "#8a6876",
      "--dsw-alias-label-tertiary": "#b08fa0",
      "--dsw-alias-state-error-primary": "#e63946",
      "--dsw-alias-state-success-primary": "#00b894",
      "--dsw-alias-state-warn-primary": "#f77f00",
      "--dsw-alias-interactive-bg-hover": "rgba(255, 46, 147, 0.10)",
      "--dsw-alias-button-primary-fill": "#ff2e93",
      "--dsw-alias-button-primary-hover": "#ff4aa2",
      "--dsw-specific-sidebar-fill": "#ffede6"
    }
  }
];
function readStored() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
function writeStored(id) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
  } catch {
  }
}
function clearStored() {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
  }
}
function SkinRow({ skins, current, subscribe, setSkin }) {
  const active = (0, import_react.useSyncExternalStore)(subscribe, current);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "8px 16px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 }, children: "\u76AE\u80A4\uFF08dsh-skin-pack\uFF09" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: skins.map((skin) => {
      const selected = active === skin.id;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          onClick: () => {
            setSkin(skin.id);
          },
          style: {
            border: `1px solid ${selected ? skin.tokens["--dsw-alias-brand-primary"] ?? "#888" : "var(--dsw-alias-border-l2)"}`,
            background: selected ? skin.tokens["--dsw-alias-bg-layer-2"] : "var(--dsw-alias-bg-layer-1)",
            color: "var(--dsw-alias-label-primary)",
            borderRadius: 6,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 13
          },
          children: skin.label
        },
        skin.id
      );
    }) })
  ] });
}
var name = "dsh-skin-pack";
var inject = ["theme", "slots"];
async function fetchAccountBalance(fetcher = fetch) {
  try {
    const res = await fetcher("/api/dsh-account/balance", { signal: AbortSignal.timeout(5e3) });
    if (!res.ok) return { kind: "error" };
    const data = await res.json();
    if (data.ok !== true || data.total === void 0) return { kind: "error" };
    return {
      kind: "ok",
      currency: data.currency,
      total: data.total,
      granted: data.granted,
      toppedUp: data.toppedUp
    };
  } catch {
    return { kind: "error" };
  }
}
function currencySymbol(currency) {
  return currency === "CNY" ? "\xA5" : currency === "USD" ? "$" : currency ?? "";
}
async function fetchTokens7d(fetcher = fetch) {
  try {
    const res = await fetcher("/api/dsh-account/tokens7d", { signal: AbortSignal.timeout(1e4) });
    if (!res.ok) return { kind: "error" };
    const data = await res.json();
    if (data.ok !== true || typeof data.tokens !== "number") return { kind: "error" };
    return { kind: "ok", tokens: data.tokens };
  } catch {
    return { kind: "error" };
  }
}
function formatTokensM(tokens) {
  if (tokens >= 1e6) return `${(tokens / 1e6).toFixed(2)} M`;
  if (tokens >= 1e3) return `${Math.round(tokens / 1e3)} K`;
  return String(tokens);
}
function BalanceBadge({ wide }) {
  const [state, setState] = (0, import_react.useState)({ kind: "loading" });
  const [tokens, setTokens] = (0, import_react.useState)({ kind: "loading" });
  (0, import_react.useEffect)(() => {
    let alive = true;
    const load = async () => {
      const [next, nextTokens] = await Promise.all([fetchAccountBalance(), fetchTokens7d()]);
      if (alive) {
        setState(next);
        setTokens(nextTokens);
      }
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 6e4);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (state.kind !== "ok") return null;
  const symbol = currencySymbol(state.currency);
  const toppedUp = state.toppedUp ?? state.total ?? "--";
  const breakdown = `\u603B\u4F59\u989D ${symbol}${state.total} \xB7 \u5145\u503C ${symbol}${state.toppedUp ?? "0"} \xB7 \u8D60\u9001 ${symbol}${state.granted ?? "0"}`;
  const label = `\u5145\u503C\u4F59\u989D ${symbol}${toppedUp}`;
  const tokensLabel = tokens.kind === "ok" && tokens.tokens !== void 0 ? `\u8FD17\u5929 ${formatTokensM(tokens.tokens)}` : null;
  if (!wide) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        type: "button",
        title: [label, breakdown, tokensLabel].filter(Boolean).join(" \u2014 "),
        "aria-label": label,
        style: {
          width: 36,
          height: 36,
          margin: "8px 0 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          cursor: "default",
          fontSize: 14,
          lineHeight: "18px",
          color: "var(--dsw-alias-label-tertiary)"
        },
        children: symbol
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      title: [breakdown, tokensLabel].filter(Boolean).join(" \xB7 "),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "calc(100% + 8px)",
        height: 34,
        margin: "4px -4px 4px",
        padding: "6px 2px 6px 10px",
        boxSizing: "border-box",
        fontSize: 13,
        lineHeight: "20px",
        color: "var(--dsw-alias-label-tertiary)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }),
        tokensLabel !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--dsw-alias-label-secondary)" }, children: tokensLabel })
      ]
    }
  );
}
function apply(ctx) {
  const disposers = SKINS.map((skin) => ctx.theme.register({ id: skin.id, colorScheme: skin.colorScheme, tokens: skin.tokens }));
  ctx.effect(() => () => {
    for (const dispose of disposers) dispose();
  }, "dsh-skin-pack: theme registrations");
  const saved = readStored();
  if (saved !== null && ctx.theme.getTheme().themes.some((t) => t.id === saved)) {
    ctx.theme.setTheme(saved);
  }
  ctx.on("theme/change", (snapshot) => {
    if (!SKINS.some((s) => s.id === snapshot.preference)) clearStored();
  });
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "skin-pack",
    order: 20,
    inject: () => ({
      skins: SKINS,
      current: () => ctx.theme.getTheme().preference,
      subscribe: (callback) => ctx.on("theme/change", () => callback()),
      setSkin: (id) => {
        ctx.theme.setTheme(id);
        writeStored(id);
      }
    })
  }, SkinRow));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "balance",
    order: 10
  }, BalanceBadge));
}
return module.exports; } });
//# sourceMappingURL=client.js.map

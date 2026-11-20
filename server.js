import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const YOINKU_BASE = "https://yoinku.com/api/v1";

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

function errorResponse(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}

function isSupportedVideoUrl(raw) {
  try {
    const u = new URL(raw);
    if (!["https:", "http:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const domains = ["youtube.com", "youtu.be", "tiktok.com", "instagram.com"];
    return domains.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

async function yoinkuGet(path, params) {
  const key = process.env.YOINKU_API_KEY;
  if (!key) {
    const e = new Error("YOINKU_API_KEY is missing in Railway Variables.");
    e.status = 503; e.code = "API_KEY_MISSING"; throw e;
  }
  const query = new URLSearchParams(params);
  const upstream = await fetch(`${YOINKU_BASE}${path}?${query}`, {
    headers: { "x-api-key": key, "accept": "application/json" },
    signal: AbortSignal.timeout(30_000)
  });
  const body = await upstream.text();
  let data;
  try { data = JSON.parse(body); }
  catch {
    const e = new Error(`Yoinku returned non-JSON (HTTP ${upstream.status}).`);
    e.status = 502; e.code = "UPSTREAM_NON_JSON"; throw e;
  }
  if (!upstream.ok || data?.ok === false) {
    const e = new Error(data?.error?.message || `Yoinku request failed (${upstream.status}).`);
    e.status = upstream.status || 502;
    e.code = data?.error?.code || "UPSTREAM_ERROR"; throw e;
  }
  return data;
}

app.get("/", (_req, res) => res.json({
  ok: true, service: "VIDLUXE PRO Gateway", status: "online",
  endpoints: ["/health", "/api/info?url=...", "/api/download?url=...&format=..."]
}));

app.get("/health", (_req, res) => res.json({
  ok: true, service: "VIDLUXE PRO Gateway", status: "online",
  apiKeyConfigured: Boolean(process.env.YOINKU_API_KEY)
}));

app.get("/api/info", async (req, res) => {
  const url = String(req.query.url || "");
  if (!isSupportedVideoUrl(url))
    return errorResponse(res, 400, "INVALID_URL", "Enter a valid supported video URL.");
  try { return res.json(await yoinkuGet("/info", { url })); }
  catch (e) {
    console.error("Info error:", e.message);
    return errorResponse(res, e.status || 502, e.code || "GATEWAY_ERROR", e.message);
  }
});

app.get("/api/download", async (req, res) => {
  const url = String(req.query.url || "");
  const format = String(req.query.format || "");
  if (!isSupportedVideoUrl(url))
    return errorResponse(res, 400, "INVALID_URL", "Enter a valid supported video URL.");
  if (!format || format.length > 40 || !/^[a-zA-Z0-9_-]+$/.test(format))
    return errorResponse(res, 400, "INVALID_FORMAT", "Use a format ID returned by /api/info.");
  try { return res.json(await yoinkuGet("/download", { url, format })); }
  catch (e) {
    console.error("Download error:", e.message);
    return errorResponse(res, e.status || 502, e.code || "GATEWAY_ERROR", e.message);
  }
});

app.use((_req, res) => errorResponse(res, 404, "NOT_FOUND", "Endpoint not found."));
app.listen(PORT, "0.0.0.0", () => console.log(`VIDLUXE PRO Gateway running on port ${PORT}`));

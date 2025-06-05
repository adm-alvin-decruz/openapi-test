const configsModel = require("../db/models/configsModel");
const RateLimit = require("express-rate-limit");

let limiter; // Cache the limiter instance
let lastFetched = 0;
const TTL = 30 * 1000; // Refresh every 30 seconds

async function initRateLimiter() {
  const rateLimitConfig = await configsModel.findByConfigKey("rate_limit", "limitter");

  const maxRequest = rateLimitConfig && rateLimitConfig.value && rateLimitConfig.value.max_requests;
  const windowMs = rateLimitConfig && rateLimitConfig.value && rateLimitConfig.value.ms_time;

  console.log("Rate limiter config:", { maxRequest, windowMs });

  limiter = RateLimit({
    windowMs: windowMs,
    max: maxRequest,
    message: "Too many requests - try again in a minute.",
    standardHeaders: true,
    legacyHeaders: false,
  });
}

async function RateLimitMiddleware(req, res, next) {
  const now = Date.now();
  if (!limiter || now - lastFetched > TTL) {
    console.log("Rate limit fetching");
    await initRateLimiter(); // Lazy initialization on first request
    lastFetched = now;
  }

  return limiter(req, res, next);
}

module.exports = {
  RateLimitMiddleware,
};

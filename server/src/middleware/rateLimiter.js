// In-memory rate limiting store for sensitive endpoints (login, register, forgot/reset password, etc.)
const requestCounts = new Map();

// Periodic cleanup of expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Higher-order rate limiting middleware
 * @param {number} maxRequests - Max allowed requests per window
 * @param {number} windowMinutes - Time window in minutes
 */
function createRateLimiter(maxRequests = 10, windowMinutes = 15) {
  const windowMs = windowMinutes * 60 * 1000;

  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestCounts.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        message: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}

module.exports = {
  authRateLimiter: createRateLimiter(15, 15), // 15 attempts per 15 minutes
  sensitiveRateLimiter: createRateLimiter(5, 15), // 5 attempts per 15 minutes (forgot password, etc.)
};

const crypto = require("crypto");

/**
 * Validates password strength against security policy:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
function validatePasswordStrength(password) {
  const errors = [];
  if (!password || typeof password !== "string") {
    return { isValid: false, errors: ["Password is required"] };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character (e.g. !@#$%^&*).");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hashes a token using SHA-256 for secure storage at rest.
 */
function hashToken(token) {
  if (!token) return "";
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure random raw token.
 */
function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parses User-Agent header into readable device & browser summary.
 */
function parseUserAgent(ua = "") {
  let browser = "Unknown Browser";
  let device = "Unknown Device";

  if (!ua) return { browser, device };

  // Browser detection
  if (ua.includes("Firefox/")) {
    browser = "Mozilla Firefox";
  } else if (ua.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (ua.includes("Chrome/")) {
    browser = "Google Chrome";
  } else if (ua.includes("Safari/")) {
    browser = "Apple Safari";
  } else if (ua.includes("OPR/") || ua.includes("Opera/")) {
    browser = "Opera";
  }

  // Device / OS detection
  if (ua.includes("Windows NT 10.0")) {
    device = "Windows 10/11";
  } else if (ua.includes("Windows")) {
    device = "Windows OS";
  } else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) {
    device = "macOS";
  } else if (ua.includes("iPhone")) {
    device = "iPhone (iOS)";
  } else if (ua.includes("iPad")) {
    device = "iPad (iPadOS)";
  } else if (ua.includes("Android")) {
    device = "Android Device";
  } else if (ua.includes("Linux")) {
    device = "Linux OS";
  }

  return { browser, device };
}

/**
 * Safe development logger for tokens and notification links (never logs raw passwords).
 */
function logDevelopmentNotification(title, message, details = {}) {
  console.log("\n==================================================");
  console.log(`🔒 [SECURITY NOTICE - ${title.toUpperCase()}]`);
  console.log(`Message: ${message}`);
  Object.keys(details).forEach((key) => {
    console.log(`${key}: ${details[key]}`);
  });
  console.log("==================================================\n");
}

module.exports = {
  validatePasswordStrength,
  hashToken,
  generateRandomToken,
  parseUserAgent,
  logDevelopmentNotification,
};

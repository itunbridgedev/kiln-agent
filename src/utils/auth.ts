import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function buildCookieOptions(
  sessionID: string,
  host: string = "localhost"
): string {
  const secret = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
  const sig = require("cookie-signature");
  const signedSessionId = `s:${sig.sign(sessionID, secret)}`;

  // Determine if we're on localhost or production
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  
  let domainPart = "";
  let securePart = "Secure";
  let sameSitePart = "SameSite=None";

  if (isLocalhost) {
    // For localhost, don't set domain and use Lax SameSite (no Secure needed for http)
    domainPart = "";
    securePart = "";
    sameSitePart = "SameSite=Lax";
  } else {
    // For production, set the domain from the host
    const domainMatch = host.match(/([a-zA-Z0-9-]+\.[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)?)$/);
    const domain = domainMatch ? domainMatch[1] : host;
    domainPart = `Domain=.${domain}`;
  }

  const cookieParts = [
    `connect.sid=${signedSessionId}`,
    `Path=/`,
    `Expires=${new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString()}`,
    `HttpOnly`,
    sameSitePart,
  ];

  if (domainPart) cookieParts.splice(1, 0, domainPart);
  if (securePart) cookieParts.push(securePart);

  return cookieParts.join("; ");
}

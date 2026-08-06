// Simple client-side JWT payload utilities.
// We do NOT verify signatures on the client (the API protects resources server-side).
// This module only reads the role/email out of the bearer token for UI routing.

export type AppRole =
  | "CALL_CENTER_AGENT"
  | "MBBS_DOCTOR"
  | "SPECIALIST"
  | "NUTRITIONIST"
  | "ADMIN"
  | "CAREGIVER"
  | "SONOLOGIST";

export interface DecodedJwt {
  sub: string;
  email: string;
  role: AppRole | string;
  iat?: number;
  exp?: number;
}

export interface StoredSession {
  token: string;
  user: {
    id: string;
    email: string;
    first_name_en?: string;
    last_name_en?: string;
    role: AppRole | string;
    /** True while the account is still on a temporary password. */
    require_password_change?: boolean;
  };
}

const STORAGE_KEY = "hhdms.session";

/** Decode the payload section of a JWT (base64url) without verifying the signature. */
export function decodeJwt(token: string): DecodedJwt | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payloadSegment = parts[1];
  if (!payloadSegment) return null;
  try {
    const payload = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as DecodedJwt;
  } catch {
    return null;
  }
}

/** Save the session returned from /auth/login into localStorage. */
export function persistSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage may be disabled — silently ignore */
  }
}

/** Read the active session from localStorage (or null if missing/expired). */
export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;

    const decoded = decodeJwt(parsed.token);
    if (!decoded) return null;
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Remove the locally stored session (used on logout / token expiry). */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Map a role string to its dashboard path. */
export function dashboardPathForRole(role: string | undefined | null): string {
  switch (role) {
    case "CALL_CENTER_AGENT":
      return "/dashboard/call-center";
    case "MBBS_DOCTOR":
      return "/dashboard/mbbs";
    case "SPECIALIST":
      return "/dashboard/specialist";
    case "NUTRITIONIST":
      return "/dashboard/nutritionist";
    case "SONOLOGIST":
      return "/dashboard/sonologist";
    case "CAREGIVER":
      return "/dashboard/caregiver";
    case "ADMIN":
      return "/dashboard/admin";
    default:
      return "/signin";
  }
}

/** Human-friendly label for a role. */
export function roleLabel(role: string | undefined | null): string {
  switch (role) {
    case "CALL_CENTER_AGENT":
      return "Call Center Agent";
    case "MBBS_DOCTOR":
      return "MBBS Doctor";
    case "SPECIALIST":
      return "Specialist";
    case "NUTRITIONIST":
      return "Nutritionist";
    case "SONOLOGIST":
      return "Sonologist";
    case "CAREGIVER":
      return "Caregiver";
    case "ADMIN":
      return "Administrator";
    default:
      return "Unknown Role";
  }
}

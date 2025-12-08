import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Hash a password using bcryptjs
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
};

/**
 * Compare a password with its hash
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: any, expiresIn: string = "7d"): string => {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn,
  } as any);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Set authentication cookie
 */
export const setAuthCookie = async (token: string) => {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
};

/**
 * Get authentication token from cookies
 */
export const getAuthToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  return token || null;
};

/**
 * Clear authentication cookie
 */
export const clearAuthCookie = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
};

/**
 * Verify master password
 * Can verify against a stored hash (from DB) or fall back to environment variable
 * @param password - The password to verify
 * @param storedHash - Optional hash from database user record
 */
export const verifyMasterPassword = async (
  password: string,
  storedHash?: string
): Promise<boolean> => {
  // If storedHash is provided (from DB), use it; otherwise fall back to env variable
  let hashToCompare = storedHash;

  if (!hashToCompare) {
    hashToCompare = process.env.NEXT_PUBLIC_MASTER_PASSWORD_HASH;

    // Remove quotes if present (in case they were included in the .env file)
    if (hashToCompare && hashToCompare.startsWith('"') && hashToCompare.endsWith('"')) {
      hashToCompare = hashToCompare.slice(1, -1);
    }

    if (!hashToCompare) {
      console.error(
        "NEXT_PUBLIC_MASTER_PASSWORD_HASH not set in environment variables. Please set it."
      );
      return false;
    }
  }

  return comparePassword(password, hashToCompare);
};

/**
 * Validate authenticated request
 */
export const validateAuth = async (): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) return false;

  const decoded = verifyToken(token);
  return !!decoded;
};

/**
 * Get current user ID from token
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  const token = await getAuthToken();
  if (!token) return null;

  const decoded = verifyToken(token);
  return decoded?.userId || null;
};

/**
 * Get current user info from token
 */
export const getCurrentUser = async (): Promise<any | null> => {
  const token = await getAuthToken();
  if (!token) return null;

  const decoded = verifyToken(token);
  return decoded || null;
};

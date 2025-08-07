import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db } from "../db";
import { oauthStates } from "../../shared/schema";

export interface OAuthPkceOptions {
  clientId: string;
  baseAuthUrl: string;
  redirectPath: string;
}

export function createCloverPkceInitiateHandler(options: OAuthPkceOptions) {
  return async function initiateOAuthPKCE(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const state = crypto.randomBytes(32).toString("hex");
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await db.insert(oauthStates).values({
        state,
        codeVerifier,
        expiresAt,
      });

      const redirectUri = `https://${req.get("host")}${options.redirectPath}`;
      const url = new URL(`${options.baseAuthUrl}/oauth/v2/authorize`);
      url.searchParams.set("client_id", options.clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      // url.searchParams.set("state", state); // Optional for CSRF

      res.redirect(url.toString());
    } catch (err) {
      next(err);
    }
  };
}

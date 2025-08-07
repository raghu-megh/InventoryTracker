import { Router } from "express";
import { createCloverPkceInitiateHandler } from "../middleware/oauthPkceInitiate";

export const authRoutes = Router();

const isProd = process.env.NODE_ENV === "production";
const cloverBase = isProd
  ? "https://www.clover.com"
  : "https://sandbox.dev.clover.com";

authRoutes.get(
  "/auth/clover",
  createCloverPkceInitiateHandler({
    clientId: process.env.CLOVER_APP_ID!,
    baseAuthUrl: cloverBase,
    redirectPath: "/api/auth/clover/callback",
  })
);

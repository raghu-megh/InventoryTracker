import crypto from "crypto";
import express from "express";
import { generatePkcePair } from "../utils/pkce";
import { storage } from "../storage";
const router = express.Router();

const CLOVER_CLIENT_ID = process.env.CLOVER_CLIENT_ID!;
const CLOVER_REDIRECT_URI = process.env.CLOVER_REDIRECT_URI!;
const CLOVER_AUTH_ENDPOINT =
  "https://sandbox.dev.clover.com/oauth/v2/authorize";

const pkceStore = new Map<
  string,
  { codeVerifier: string; codeChallenge: string }
>();

router.get("/start", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const { codeVerifier, codeChallenge } = generatePkcePair();

  pkceStore.set(state, { codeVerifier, codeChallenge });

  const params = new URLSearchParams({
    client_id: CLOVER_CLIENT_ID,
    redirect_uri: CLOVER_REDIRECT_URI,
    response_type: "code",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  console.log(
    "Clover OAuth Start Params:",
    `${CLOVER_AUTH_ENDPOINT}?${params.toString()}`
  );

  res.redirect(`${CLOVER_AUTH_ENDPOINT}?${params.toString()}`);
});

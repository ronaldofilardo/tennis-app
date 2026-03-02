// frontend/api/auth/switch-club.js
// POST /api/auth/switch-club — Troca o clube ativo, re-emite JWT
// Payload: { clubId }

import { switchClub, verifyToken } from "../../src/services/authService.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  try {
    // Extrair token
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      res.writeHead(401, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Authentication required" }));
    }

    const tokenResult = verifyToken(auth.split(" ")[1]);
    if (!tokenResult.valid) {
      res.writeHead(401, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: tokenResult.error }));
    }

    const { clubId } = req.body || {};
    if (!clubId) {
      res.writeHead(400, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "clubId is required" }));
    }

    const result = await switchClub(tokenResult.payload.userId, clubId);

    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  } catch (err) {
    if (err.message === "NOT_A_MEMBER") {
      res.writeHead(403, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Not a member of this club" }));
    }
    console.error("[switch-club]", err);
    res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// frontend/api/auth/login.js
// POST /api/auth/login — Login com email+senha, retorna JWT
// Payload: { email, password }

import { loginUser } from "../../src/services/authService.js";

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
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.writeHead(400, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: "email and password are required" }),
      );
    }

    const result = await loginUser({ email, password });

    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify(result));
  } catch (err) {
    if (err.message === "INVALID_CREDENTIALS") {
      res.writeHead(401, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Invalid email or password" }));
    }
    if (err.message === "USER_INACTIVE") {
      res.writeHead(403, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "User account is inactive" }));
    }
    console.error("[login]", err);
    res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

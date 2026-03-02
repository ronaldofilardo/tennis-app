// frontend/api/auth/register.js
// POST /api/auth/register — Registro de novo usuário
// Payload: { email, name, password }

import { registerUser, loginUser } from "../../src/services/authService.js";

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
    const { email, name, password } = req.body || {};

    if (!email || !name || !password) {
      res.writeHead(400, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: "email, name and password are required" }),
      );
    }

    if (password.length < 6) {
      res.writeHead(400, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
      );
    }

    // Registra o usuário
    const user = await registerUser({ email, name, password });

    // Faz login automático após registro
    const loginResult = await loginUser({ email, password });

    res.writeHead(201, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify(loginResult));
  } catch (err) {
    if (err.message === "EMAIL_EXISTS") {
      res.writeHead(409, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Email already registered" }));
    }
    console.error("[register]", err);
    res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

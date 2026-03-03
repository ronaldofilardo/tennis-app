// frontend/api/auth.js
// Router consolidado — todas as rotas /api/auth/*
//   POST /api/auth/login        → login com email+senha, retorna JWT
//   POST /api/auth/register     → registro de novo usuário
//   POST /api/auth/switch-club  → troca clube ativo, re-emite JWT

import {
  loginUser,
  registerUser,
  switchClub,
  verifyToken,
} from "../../src/services/authService.js";
import { handleCors, sendJson } from "../_lib/authMiddleware.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Payload-Version",
};

function getAction(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  // parts: [api, auth, action]
  return parts[2] || null;
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  if (req.method !== "POST") {
    res.writeHead(405, { ...corsHeaders, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const action = getAction(url);

  // ─── POST /api/auth/login ──────────────────────────────────────────────────
  if (action === "login") {
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
      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
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
      console.error("[auth/login]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  // ─── POST /api/auth/register ───────────────────────────────────────────────
  if (action === "register") {
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
      await registerUser({ email, name, password });
      const loginResult = await loginUser({ email, password });
      res.writeHead(201, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(loginResult));
    } catch (err) {
      if (err.message === "EMAIL_EXISTS") {
        res.writeHead(409, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify({ error: "Email already registered" }));
      }
      console.error("[auth/register]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  // ─── POST /api/auth/switch-club ────────────────────────────────────────────
  if (action === "switch-club") {
    try {
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
      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(result));
    } catch (err) {
      if (err.message === "NOT_A_MEMBER") {
        res.writeHead(403, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        return res.end(JSON.stringify({ error: "Not a member of this club" }));
      }
      console.error("[auth/switch-club]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Unknown auth action" }));
}

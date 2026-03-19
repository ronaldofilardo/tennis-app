// frontend/api/auth.js
// Router consolidado — todas as rotas /api/auth/*
//   POST /api/auth/login                        → login com email+senha, retorna JWT
//   POST /api/auth/register                     → registro de novo usuário
//   POST /api/auth/switch-club                  → troca clube ativo, re-emite JWT
//   POST /api/auth/register-scorer              → auto-cadastro de anotador (sem clube)
//   POST /api/auth/register-athlete-independent → auto-cadastro de atleta independente

import {
  loginUser,
  registerUser,
  switchClub,
  verifyToken,
} from "../../src/services/authService.js";
import { handleCors, sendJson } from "../_lib/authMiddleware.js";
import { hashPassword, derivarSenha } from "../_lib/passwordUtils.js";
import prisma from "../_lib/prisma.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Payload-Version",
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

  // ─── POST /api/auth/register-scorer ──────────────────────────────────────
  // Cria uma conta de anotador independente (sem vínculo a clube).
  // Senha = DDMMAAAA (data de nascimento) ou 8 dígitos do CPF.
  if (action === "register-scorer") {
    try {
      const { name, email, cpf, phone, birthDate } = req.body || {};
      if (!name || !name.trim())
        return sendJson(res, 400, { error: "Nome é obrigatório." });

      const cleanCpf = cpf ? cpf.replace(/\D/g, "").trim() : null;
      if (cleanCpf && cleanCpf.length !== 11)
        return sendJson(res, 400, {
          error: "CPF inválido (deve ter 11 dígitos).",
        });

      const loginIdentifier =
        cleanCpf || (email ? email.trim().toLowerCase() : null);
      if (!loginIdentifier)
        return sendJson(res, 400, {
          error: "E-mail ou CPF é obrigatório para criar a conta.",
        });

      const existing = await prisma.user.findUnique({
        where: { email: loginIdentifier },
      });
      if (existing)
        return sendJson(res, 409, {
          error: "Este CPF/e-mail já está cadastrado.",
        });

      const senha = derivarSenha(birthDate || null, cleanCpf);
      const passwordHash = await hashPassword(senha);

      await prisma.user.create({
        data: {
          email: loginIdentifier,
          name: name.trim(),
          passwordHash,
          isActive: true,
        },
      });

      const loginResult = await loginUser({
        email: loginIdentifier,
        password: senha,
      });
      res.writeHead(201, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(loginResult));
    } catch (err) {
      console.error("[auth/register-scorer]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: "Erro interno ao cadastrar anotador." }),
      );
    }
  }

  // ─── POST /api/auth/register-athlete-independent ─────────────────────────
  // Cria conta + AthleteProfile para atleta sem vínculo a clube.
  // Senha = DDMMAAAA (data de nascimento obrigatória).
  if (action === "register-athlete-independent") {
    try {
      const {
        name,
        cpf,
        email,
        birthDate,
        category,
        gender,
        nickname,
        phone,
        ranking,
        entity,
        fatherName,
        fatherCpf,
        motherName,
        motherCpf,
      } = req.body || {};

      if (!name || !name.trim())
        return sendJson(res, 400, { error: "Nome é obrigatório." });
      if (!birthDate)
        return sendJson(res, 400, {
          error: "Data de nascimento é obrigatória.",
        });

      const cleanCpf = cpf ? cpf.replace(/\D/g, "").trim() : null;
      if (cleanCpf && cleanCpf.length !== 11)
        return sendJson(res, 400, {
          error: "CPF inválido (deve ter 11 dígitos).",
        });

      const cleanFatherCpf = fatherCpf ? fatherCpf.replace(/\D/g, "") : null;
      const cleanMotherCpf = motherCpf ? motherCpf.replace(/\D/g, "") : null;

      const loginIdentifier =
        cleanCpf || (email ? email.trim().toLowerCase() : null);
      if (!loginIdentifier)
        return sendJson(res, 400, {
          error: "CPF ou e-mail é obrigatório para criar a conta.",
        });

      const existing = await prisma.user.findUnique({
        where: { email: loginIdentifier },
      });
      if (existing)
        return sendJson(res, 409, {
          error: "Este CPF/e-mail já está cadastrado.",
        });

      const senha = derivarSenha(birthDate, cleanCpf);
      const passwordHash = await hashPassword(senha);

      const user = await prisma.user.create({
        data: {
          email: loginIdentifier,
          name: name.trim(),
          passwordHash,
          isActive: true,
        },
      });

      await prisma.athleteProfile.create({
        data: {
          userId: user.id,
          name: name.trim(),
          nickname: nickname?.trim() || null,
          cpf: cleanCpf || null,
          gender: gender ? gender.toUpperCase() : null,
          birthDate: new Date(birthDate),
          category: category?.trim() || null,
          entity: entity?.trim() || null,
          phone: phone?.trim() || null,
          ranking: ranking ? parseInt(String(ranking), 10) : null,
          fatherName: fatherName?.trim() || null,
          fatherCpf: cleanFatherCpf || null,
          motherName: motherName?.trim() || null,
          motherCpf: cleanMotherCpf || null,
          clubId: null,
          isPublic: true,
        },
      });

      const loginResult = await loginUser({
        email: loginIdentifier,
        password: senha,
      });
      res.writeHead(201, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify(loginResult));
    } catch (err) {
      if (err.code === "P2002")
        return sendJson(res, 409, { error: "CPF ou e-mail já cadastrado." });
      console.error("[auth/register-athlete-independent]", err);
      res.writeHead(500, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      return res.end(
        JSON.stringify({ error: "Erro interno ao cadastrar atleta." }),
      );
    }
  }

  res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Unknown auth action" }));
}

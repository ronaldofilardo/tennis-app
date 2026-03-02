// frontend/src/services/authService.js
// Serviço de autenticação com JWT — Fase 1

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// Cache de conexão Prisma (serverless)
let prisma;
if (typeof globalThis !== "undefined" && globalThis.__prisma) {
  prisma = globalThis.__prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
  if (typeof globalThis !== "undefined") {
    globalThis.__prisma = prisma;
  }
}

// ========================================================
// Utilidades de hash (sem dependência bcrypt para serverless)
// ========================================================

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;

/**
 * Hash de senha usando scrypt (nativo do Node.js).
 * @param {string} password
 * @returns {Promise<string>} salt:hash em hex
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifica senha contra hash armazenado.
 * @param {string} password
 * @param {string} storedHash  formato salt:hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(":");
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex") === hash);
    });
  });
}

// ========================================================
// JWT manual (sem jsonwebtoken para keep serverless leve)
// ========================================================

const JWT_SECRET =
  process.env.JWT_SECRET || "racket-app-dev-secret-change-in-production";
const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24h
const REFRESH_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 dias

function base64url(str) {
  return Buffer.from(str).toString("base64url");
}

function base64urlDecode(str) {
  return Buffer.from(str, "base64url").toString("utf8");
}

/**
 * Gera um JWT com claims customizadas.
 * @param {{ userId: string, email: string, clubId?: string, role?: string, planType?: string, subscriptionStatus?: string }} payload
 * @returns {string}
 */
export function generateToken(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(
    JSON.stringify({
      userId: payload.userId,
      email: payload.email,
      clubId: payload.clubId,
      role: payload.role,
      planType: payload.planType || "FREE",
      subscriptionStatus: payload.subscriptionStatus || "ACTIVE",
      iat: now,
      exp: now + JWT_EXPIRY_SECONDS,
    }),
  );
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Gera um refresh token opaco.
 * @returns {string}
 */
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

/**
 * Verifica e decodifica um JWT.
 * @param {string} token
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
export function verifyToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3)
      return { valid: false, error: "Invalid token format" };

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSig) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload = JSON.parse(base64urlDecode(body));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Token decode failed" };
  }
}

// ========================================================
// Serviço de Usuários
// ========================================================

/**
 * Registra novo usuário.
 * @param {{ email: string, name: string, password: string }} data
 * @returns {Promise<{ id: string, email: string, name: string }>}
 */
export async function registerUser({ email, name, password }) {
  // Verificar se email já existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true },
  });

  return user;
}

/**
 * Login do usuário — retorna tokens JWT.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, refreshToken: string, user: object }>}
 */
export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          club: {
            select: {
              id: true, name: true, slug: true, logoUrl: true,
              planType: true,
              subscription: {
                select: { status: true, planType: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new Error("INVALID_CREDENTIALS");
  if (!user.isActive) throw new Error("USER_INACTIVE");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new Error("INVALID_CREDENTIALS");

  // Primeiro clube como default (ou null se não tem clube)
  const defaultMembership = user.memberships[0] || null;
  const defaultClubId = defaultMembership?.clubId || null;
  const defaultRole = defaultMembership?.role || "PLAYER";
  const defaultClub = defaultMembership?.club || null;
  const defaultPlanType = defaultClub?.subscription?.planType || defaultClub?.planType || "FREE";
  const defaultSubStatus = defaultClub?.subscription?.status || "ACTIVE";

  const token = generateToken({
    userId: user.id,
    email: user.email,
    clubId: defaultClubId,
    role: defaultRole,
    planType: defaultPlanType,
    subscriptionStatus: defaultSubStatus,
  });

  const refreshToken = generateRefreshToken();

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      clubs: user.memberships.map((m) => ({
        clubId: m.club.id,
        clubName: m.club.name,
        clubSlug: m.club.slug,
        clubLogo: m.club.logoUrl,
        role: m.role,
        planType: m.club.subscription?.planType || m.club.planType,
        subscriptionStatus: m.club.subscription?.status || "ACTIVE",
      })),
      activeClubId: defaultClubId,
      activeRole: defaultRole,
      planType: defaultPlanType,
      subscriptionStatus: defaultSubStatus,
    },
  };
}

/**
 * Troca o clube ativo do usuário (re-emite JWT).
 * @param {string} userId
 * @param {string} clubId
 * @returns {Promise<{ token: string, club: object }>}
 */
export async function switchClub(userId, clubId) {
  const membership = await prisma.clubMembership.findUnique({
    where: { userId_clubId: { userId, clubId } },
    include: {
      club: {
        include: {
          subscription: {
            select: { status: true, planType: true },
          },
        },
      },
      user: { select: { email: true } },
    },
  });

  if (!membership) throw new Error("NOT_A_MEMBER");

  const planType = membership.club.subscription?.planType || membership.club.planType || "FREE";
  const subscriptionStatus = membership.club.subscription?.status || "ACTIVE";

  const token = generateToken({
    userId,
    email: membership.user.email,
    clubId: membership.clubId,
    role: membership.role,
    planType,
    subscriptionStatus,
  });

  return {
    token,
    club: {
      clubId: membership.club.id,
      clubName: membership.club.name,
      clubSlug: membership.club.slug,
      role: membership.role,
      planType,
      subscriptionStatus,
    },
  };
}

// ========================================================
// Serviço de Clubes
// ========================================================

/**
 * Cria um novo clube e adiciona o criador como ADMIN.
 * @param {{ name: string, slug: string, userId: string }} data
 * @returns {Promise<object>}
 */
export async function createClub({ name, slug, userId }) {
  // Verificar slug único
  const existing = await prisma.club.findUnique({ where: { slug } });
  if (existing) throw new Error("SLUG_EXISTS");

  const club = await prisma.club.create({
    data: {
      name,
      slug,
      memberships: {
        create: { userId, role: "GESTOR" },
      },
    },
    include: {
      memberships: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  return club;
}

// Roles válidas para membros de clube (alinhadas com enum UserRole do Prisma)
const VALID_CLUB_ROLES = [
  "GESTOR",
  "CLUB_STAFF",
  "COACH",
  "ATHLETE",
  "SPECTATOR",
];

/**
 * Adiciona membro a um clube.
 * @param {{ clubId: string, userId: string, role?: string, invitedByUserId?: string }} data
 */
export async function addClubMember({
  clubId,
  userId,
  role = "ATHLETE",
  invitedByUserId,
}) {
  if (!VALID_CLUB_ROLES.includes(role)) {
    throw new Error(
      `INVALID_ROLE: must be one of ${VALID_CLUB_ROLES.join(", ")}`,
    );
  }

  // GESTOR não pode ser ATHLETE no mesmo clube
  if (role === "ATHLETE") {
    const existingGestor = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (existingGestor?.role === "GESTOR") {
      throw new Error(
        "GESTOR_CANNOT_BE_ATHLETE: Gestor cannot also be Athlete in the same club",
      );
    }
  }
  if (role === "GESTOR") {
    const existingAthlete = await prisma.clubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (existingAthlete?.role === "ATHLETE") {
      throw new Error(
        "ATHLETE_CANNOT_BE_GESTOR: Athlete cannot also be Gestor in the same club",
      );
    }
  }

  return prisma.clubMembership.create({
    data: { clubId, userId, role, invitedByUserId },
  });
}

/**
 * Lista membros de um clube.
 * @param {string} clubId
 */
export async function getClubMembers(clubId, excludeUserId = null) {
  return prisma.clubMembership.findMany({
    where: {
      clubId,
      role: { not: "ADMIN" }, // ADMINs são agnósticos a clubes
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

/**
 * Solicita um marcador comunitário (scorer) para uma partida.
 * @param {{ matchId: string, scorerId: string, createdByUserId: string }} data
 */
export async function requestScorer({ matchId, scorerId, createdByUserId }) {
  // Validar que o criador e o scorer são diferentes
  if (createdByUserId === scorerId) {
    throw new Error(
      "SCORER_CANNOT_BE_CREATOR: Scorer must be different from match creator",
    );
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      createdByUserId: true,
      player1Id: true,
      player2Id: true,
      scorerId: true,
    },
  });

  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (match.createdByUserId !== createdByUserId) {
    throw new Error("UNAUTHORIZED: Only match creator can request a scorer");
  }

  // Validar que o scorer não é um dos jogadores
  const player1 = await prisma.athleteProfile.findUnique({
    where: { id: match.player1Id || "" },
    select: { userId: true },
  });
  const player2 = await prisma.athleteProfile.findUnique({
    where: { id: match.player2Id || "" },
    select: { userId: true },
  });

  if (player1?.userId === scorerId || player2?.userId === scorerId) {
    throw new Error(
      "SCORER_CANNOT_BE_PLAYER: Scorer cannot be one of the match players",
    );
  }

  return prisma.match.update({
    where: { id: matchId },
    data: {
      scorerId,
      scorerStatus: "PENDING",
    },
    select: {
      id: true,
      scorerId: true,
      scorerStatus: true,
    },
  });
}

/**
 * Scorer responde à solicitação (aceita ou recusa).
 * @param {{ matchId: string, scorerId: string, status: "ACCEPTED" | "DECLINED" }} data
 */
export async function respondScorerRequest({ matchId, scorerId, status }) {
  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    throw new Error("INVALID_STATUS: must be ACCEPTED or DECLINED");
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { scorerId: true, scorerStatus: true },
  });

  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (match.scorerId !== scorerId) {
    throw new Error("UNAUTHORIZED: Only the requested scorer can respond");
  }
  if (match.scorerStatus !== "PENDING") {
    throw new Error("INVALID_STATE: Scorer request is not pending");
  }

  const newStatus = status === "ACCEPTED" ? "ACCEPTED" : null;
  const newScorerId = status === "ACCEPTED" ? scorerId : null;

  return prisma.match.update({
    where: { id: matchId },
    data: {
      scorerId: newScorerId,
      scorerStatus: newStatus,
    },
    select: {
      id: true,
      scorerId: true,
      scorerStatus: true,
    },
  });
}

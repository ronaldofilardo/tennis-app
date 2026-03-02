// frontend/api/clubs/join.js
// API: POST — Entrar em um clube via código de convite
// Requer autenticação. Cria ClubMembership com role ATHLETE.

import { handleCors, requireAuth, sendJson } from "../_lib/authMiddleware.js";
import prisma from "../_lib/prisma.js";
import { requireActiveSubscription, requireAthleteQuota } from "../_lib/subscriptionMiddleware.js";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const ctx = requireAuth(req, res);
  if (!ctx) return;

  const { inviteCode } = req.body || {};

  if (!inviteCode || typeof inviteCode !== "string") {
    return sendJson(res, 400, { error: "Código de convite obrigatório." });
  }

  try {
    // Find club by invite code
    const club = await prisma.club.findFirst({
      where: { inviteCode },
      select: {
        id: true,
        name: true,
        slug: true,
        allowedEmailDomains: true,
      },
    });

    if (!club) {
      return sendJson(res, 404, { error: "Código de convite inválido." });
    }

    // Check if user is already a member
    const existing = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: ctx.userId,
          clubId: club.id,
        },
      },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return sendJson(res, 409, { error: "Você já é membro deste clube." });
      }
      // Reactivate if suspended/inactive
      await prisma.clubMembership.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });
      return sendJson(res, 200, {
        success: true,
        message: `Bem-vindo de volta ao ${club.name}!`,
        clubId: club.id,
      });
    }

    // Check email domain restriction
    if (club.allowedEmailDomains) {
      const domains = club.allowedEmailDomains
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      if (domains.length > 0) {
        const userDomain = ctx.email?.split("@")[1]?.toLowerCase();
        if (!domains.includes(userDomain)) {
          return sendJson(res, 403, {
            error: `Este clube aceita apenas e-mails dos domínios: ${domains.join(", ")}`,
          });
        }
      }
    }

    // Check subscription limits (use club context temporarily)
    const tempCtx = { ...ctx, clubId: club.id };
    const subCheck = await requireActiveSubscription(req, res, tempCtx);
    if (!subCheck) return; // Response already sent (402)

    const quotaCheck = await requireAthleteQuota(req, res, tempCtx);
    if (!quotaCheck) return; // Response already sent (403)

    // Create membership
    await prisma.clubMembership.create({
      data: {
        userId: ctx.userId,
        clubId: club.id,
        role: "ATHLETE",
        status: "ACTIVE",
      },
    });

    return sendJson(res, 201, {
      success: true,
      message: `Bem-vindo ao ${club.name}!`,
      clubId: club.id,
    });
  } catch (error) {
    console.error("[JoinClub POST] Error:", error);
    return sendJson(res, 500, { error: "Erro ao entrar no clube." });
  }
}

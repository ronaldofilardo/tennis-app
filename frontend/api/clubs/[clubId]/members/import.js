// frontend/api/clubs/[clubId]/members/import.js
// POST /api/clubs/:clubId/members/import — Importação em massa de atletas via JSON (parsed do XLSX no front)

import { hashPassword } from "../../../../src/services/authService.js";
import {
  handleCors,
  requireClubAccess,
  sendJson,
  methodNotAllowed,
} from "../../../_lib/authMiddleware.js";
import { requireActiveSubscription } from "../../../_lib/subscriptionMiddleware.js";
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.__prisma || new PrismaClient();
if (!globalThis.__prisma) globalThis.__prisma = prisma;

const MAX_ROWS = 500;

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  // Extrair clubId da rota
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split("/");
  // /api/clubs/:clubId/members/import  → index 3 = clubId
  const clubId = pathParts[3];

  // Apenas GESTOR / ADMIN
  const ctx = requireClubAccess(req, res, clubId, "GESTOR", "ADMIN");
  if (!ctx) return;

  // Verificar subscription ativa
  const subCheck = await requireActiveSubscription(req, res, ctx);
  if (!subCheck) return;

  const { athletes } = req.body || {};
  if (!Array.isArray(athletes) || athletes.length === 0) {
    return sendJson(res, 400, { error: "athletes array is required" });
  }
  if (athletes.length > MAX_ROWS) {
    return sendJson(res, 400, {
      error: `Maximum ${MAX_ROWS} athletes per import. Received ${athletes.length}.`,
    });
  }

  // Verificar quota de atletas restante
  const currentCount = await prisma.clubMembership.count({
    where: { clubId, status: "ACTIVE" },
  });

  const sub = await prisma.subscription.findUnique({ where: { clubId } });
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { planType: true },
  });
  const planType = sub?.planType || club?.planType || "FREE";

  const PLAN_LIMITS = { FREE: 30, BASIC: 100, PRO: 500, ENTERPRISE: 9999 };
  const maxAthletes = PLAN_LIMITS[planType] || 30;
  const remaining = maxAthletes - currentCount;

  if (athletes.length > remaining) {
    return sendJson(res, 400, {
      error: `Quota insuficiente. Restam ${remaining} vagas, mas foram enviados ${athletes.length} atletas. Plano: ${planType}.`,
    });
  }

  const results = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < athletes.length; i++) {
    const row = athletes[i];
    const rowNum = i + 1;

    try {
      const name = (row.name || "").trim();
      const email = (row.email || "").trim().toLowerCase();
      const cpf = (row.cpf || "").replace(/\D/g, "").trim() || null;
      const gender = (row.gender || "").toUpperCase().trim() || null;
      const birthDate = row.birthDate ? new Date(row.birthDate) : null;
      const category = (row.category || "").trim() || null;
      const entity = (row.entity || "").trim() || null;
      const fatherName = (row.fatherName || "").trim() || null;
      const fatherCpf = (row.fatherCpf || "").replace(/\D/g, "").trim() || null;
      const motherName = (row.motherName || "").trim() || null;
      const motherCpf = (row.motherCpf || "").replace(/\D/g, "").trim() || null;

      if (!name || !email) {
        results.errors.push({
          row: rowNum,
          error: "Nome e e-mail são obrigatórios",
        });
        results.skipped++;
        continue;
      }

      // Validar CPF (11 dígitos, se fornecido)
      if (cpf && cpf.length !== 11) {
        results.errors.push({
          row: rowNum,
          name,
          error: `CPF inválido: ${cpf}`,
        });
        results.skipped++;
        continue;
      }

      // Validar birthDate
      if (birthDate && isNaN(birthDate.getTime())) {
        results.errors.push({
          row: rowNum,
          name,
          error: "Data de nascimento inválida",
        });
        results.skipped++;
        continue;
      }

      // 1) Upsert User (buscar por email, criar se não existe)
      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        const tempPassword = cpf ? cpf.substring(0, 6) : "123456";
        const passwordHash = await hashPassword(tempPassword);
        user = await prisma.user.create({
          data: { email, name, passwordHash, isActive: true },
        });
      }

      // 2) Upsert AthleteProfile (buscar por userId)
      let profile = await prisma.athleteProfile.findUnique({
        where: { userId: user.id },
      });
      if (profile) {
        // Atualizar com dados novos (não sobrescrever campos que já têm valor)
        await prisma.athleteProfile.update({
          where: { id: profile.id },
          data: {
            name,
            cpf: cpf || profile.cpf,
            gender: gender || profile.gender,
            birthDate: birthDate || profile.birthDate,
            category: category || profile.category,
            entity: entity || profile.entity,
            fatherName: fatherName || profile.fatherName,
            fatherCpf: fatherCpf || profile.fatherCpf,
            motherName: motherName || profile.motherName,
            motherCpf: motherCpf || profile.motherCpf,
            clubId: profile.clubId || clubId,
          },
        });
      } else {
        await prisma.athleteProfile.create({
          data: {
            userId: user.id,
            name,
            cpf,
            gender,
            birthDate,
            category,
            entity,
            fatherName,
            fatherCpf,
            motherName,
            motherCpf,
            clubId,
            isPublic: true,
          },
        });
      }

      // 3) Criar ClubMembership se não existe
      const existingMembership = await prisma.clubMembership.findFirst({
        where: { userId: user.id, clubId },
      });
      if (!existingMembership) {
        await prisma.clubMembership.create({
          data: {
            userId: user.id,
            clubId,
            role: "ATHLETE",
            status: "ACTIVE",
            invitedByUserId: ctx.userId,
          },
        });
      }

      results.created++;
    } catch (err) {
      console.error(`[bulk-import] Row ${rowNum} error:`, err);
      // Duplicate CPF
      if (err.code === "P2002") {
        results.errors.push({
          row: rowNum,
          name: row.name,
          error: "CPF ou e-mail duplicado",
        });
      } else {
        results.errors.push({
          row: rowNum,
          name: row.name,
          error: err.message || "Erro interno",
        });
      }
      results.skipped++;
    }
  }

  return sendJson(res, 200, {
    message: `Importação concluída: ${results.created} criados, ${results.skipped} ignorados.`,
    ...results,
  });
}

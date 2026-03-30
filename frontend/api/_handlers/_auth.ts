// frontend/api/_handlers/_auth.ts
import type { ServerResponse } from 'node:http';
import {
  loginUser,
  registerUser,
  switchClub,
  verifyToken,
} from '../../src/services/authService.js';
import { handleCors, sendJson } from '../_lib/authMiddleware.js';
import { hashPassword, derivarSenha } from '../_lib/passwordUtils.js';
import prisma from '../_lib/prisma.js';
import type { ApiRequest } from '../_lib/types.js';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Payload-Version',
};

function getAction(url: URL): string | null {
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[2] || null;
}

export default async function handler(req: ApiRequest, res: ServerResponse): Promise<void> {
  if (handleCors(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const action = getAction(url);

  // ─── POST /api/auth/login ─────────────────────────────────────────────────
  if (action === 'login') {
    try {
      const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
      if (!email || !password) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'email and password are required' }));
        return;
      }
      const result = await loginUser({ email, password });
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'INVALID_CREDENTIALS') {
        res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }
      if (msg === 'USER_INACTIVE') {
        res.writeHead(403, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User account is inactive' }));
        return;
      }
      console.error('[auth/login]', err);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }
  }

  // ─── POST /api/auth/register ──────────────────────────────────────────────
  if (action === 'register') {
    try {
      const { email, name, password } = (req.body ?? {}) as {
        email?: string;
        name?: string;
        password?: string;
      };
      if (!email || !name || !password) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'email, name and password are required' }));
        return;
      }
      if (password.length < 6) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters' }));
        return;
      }
      await registerUser({ email, name, password });
      const loginResult = await loginUser({ email, password });
      res.writeHead(201, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loginResult));
      return;
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_EXISTS') {
        res.writeHead(409, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email already registered' }));
        return;
      }
      console.error('[auth/register]', err);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }
  }

  // ─── POST /api/auth/switch-club ───────────────────────────────────────────
  if (action === 'switch-club') {
    try {
      const auth = req.headers?.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authentication required' }));
        return;
      }
      const tokenResult = verifyToken(auth.split(' ')[1]);
      if (!tokenResult.valid) {
        res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: tokenResult.error }));
        return;
      }
      const { clubId } = (req.body ?? {}) as { clubId?: string };
      if (!clubId) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'clubId is required' }));
        return;
      }
      const result = await switchClub(
        (tokenResult.payload as { userId: string }).userId,
        clubId,
      );
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_A_MEMBER') {
        res.writeHead(403, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not a member of this club' }));
        return;
      }
      console.error('[auth/switch-club]', err);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }
  }

  // ─── POST /api/auth/register-scorer ──────────────────────────────────────
  if (action === 'register-scorer') {
    try {
      const { name, email, cpf, birthDate } = (req.body ?? {}) as {
        name?: string;
        email?: string;
        cpf?: string;
        birthDate?: string;
      };
      if (!name?.trim()) return sendJson(res, 400, { error: 'Nome é obrigatório.' });

      const cleanCpf = cpf ? cpf.replace(/\D/g, '').trim() : null;
      if (cleanCpf && cleanCpf.length !== 11)
        return sendJson(res, 400, { error: 'CPF inválido (deve ter 11 dígitos).' });

      const loginIdentifier = cleanCpf || (email ? email.trim().toLowerCase() : null);
      if (!loginIdentifier)
        return sendJson(res, 400, {
          error: 'E-mail ou CPF é obrigatório para criar a conta.',
        });

      const existing = await prisma.user.findUnique({ where: { email: loginIdentifier } });
      if (existing) return sendJson(res, 409, { error: 'Este CPF/e-mail já está cadastrado.' });

      const senha = derivarSenha(birthDate ?? null, cleanCpf);
      const passwordHash = await hashPassword(senha);

      await prisma.user.create({
        data: { email: loginIdentifier, name: name.trim(), passwordHash, isActive: true },
      });

      const loginResult = await loginUser({ email: loginIdentifier, password: senha });
      res.writeHead(201, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loginResult));
      return;
    } catch (err) {
      console.error('[auth/register-scorer]', err);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno ao cadastrar anotador.' }));
      return;
    }
  }

  // ─── POST /api/auth/register-athlete-independent ─────────────────────────
  if (action === 'register-athlete-independent') {
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
      } = (req.body ?? {}) as {
        name?: string;
        cpf?: string;
        email?: string;
        birthDate?: string;
        category?: string;
        gender?: string;
        nickname?: string;
        phone?: string;
        ranking?: number | string;
        entity?: string;
        fatherName?: string;
        fatherCpf?: string;
        motherName?: string;
        motherCpf?: string;
      };

      if (!name?.trim()) return sendJson(res, 400, { error: 'Nome é obrigatório.' });
      if (!birthDate) return sendJson(res, 400, { error: 'Data de nascimento é obrigatória.' });

      const cleanCpf = cpf ? cpf.replace(/\D/g, '').trim() : null;
      if (cleanCpf && cleanCpf.length !== 11)
        return sendJson(res, 400, { error: 'CPF inválido (deve ter 11 dígitos).' });

      const cleanFatherCpf = fatherCpf ? fatherCpf.replace(/\D/g, '') : null;
      const cleanMotherCpf = motherCpf ? motherCpf.replace(/\D/g, '') : null;

      const loginIdentifier = cleanCpf || (email ? email.trim().toLowerCase() : null);
      if (!loginIdentifier)
        return sendJson(res, 400, {
          error: 'CPF ou e-mail é obrigatório para criar a conta.',
        });

      const existing = await prisma.user.findUnique({ where: { email: loginIdentifier } });
      if (existing) return sendJson(res, 409, { error: 'Este CPF/e-mail já está cadastrado.' });

      const senha = derivarSenha(birthDate, cleanCpf);
      const passwordHash = await hashPassword(senha);

      const user = await prisma.user.create({
        data: { email: loginIdentifier, name: name.trim(), passwordHash, isActive: true },
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

      const loginResult = await loginUser({ email: loginIdentifier, password: senha });
      res.writeHead(201, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(loginResult));
      return;
    } catch (err) {
      const errCode = (err as { code?: string }).code;
      if (errCode === 'P2002') return sendJson(res, 409, { error: 'CPF ou e-mail já cadastrado.' });
      console.error('[auth/register-athlete-independent]', err);
      res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno ao cadastrar atleta.' }));
      return;
    }
  }

  res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unknown auth action' }));
}

// frontend/src/services/authService.ts
// Serviço de autenticação com JWT — Fase 1
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';
// Cache de conexão Prisma (serverless)
let prisma;
if (globalThis.__prisma) {
    prisma = globalThis.__prisma;
}
else {
    prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    });
    globalThis.__prisma = prisma;
}
// ========================================================
// Utilidades de hash (sem dependência bcrypt para serverless)
// ========================================================
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const ITERATIONS = 100000;
export async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
        crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
            if (err)
                reject(err);
            else
                resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}
export async function verifyPassword(password, storedHash) {
    return new Promise((resolve, reject) => {
        const [salt, hash] = storedHash.split(':');
        crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
            if (err)
                reject(err);
            else
                resolve(derivedKey.toString('hex') === hash);
        });
    });
}
// ========================================================
// JWT manual (sem jsonwebtoken para keep serverless leve)
// ========================================================
// SECURITY: JWT_SECRET deve sempre ser definida via variável de ambiente.
// Em produção: um valor ausente lança um erro fatal imediatamente (fail-fast).
// Em dev/test: usa um fallback PÚBLICO conhecido — NÃO usar em staging ou produção.
// Para gerar um secret seguro: openssl rand -hex 32
const JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('[FATAL] JWT_SECRET não definida em produção. ' +
                'Configure a variável de ambiente com: openssl rand -hex 32');
        }
        // Fallback apenas para ambientes de desenvolvimento e teste locais.
        // Qualquer pessoa pode forjar tokens com este secret — seguro somente offline.
        return 'racket-app-dev-secret-change-in-production';
    }
    return secret;
})();
const JWT_EXPIRY_SECONDS = 24 * 60 * 60; // 24h
function base64url(str) {
    return Buffer.from(str).toString('base64url');
}
function base64urlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf8');
}
export function generateToken(payload) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = base64url(JSON.stringify({
        userId: payload.userId,
        email: payload.email,
        clubId: payload.clubId,
        role: payload.role,
        platformRole: payload.platformRole,
        planType: payload.planType ?? 'FREE',
        subscriptionStatus: payload.subscriptionStatus ?? 'ACTIVE',
        iat: now,
        exp: now + JWT_EXPIRY_SECONDS,
    }));
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}
export function generateRefreshToken() {
    return crypto.randomBytes(48).toString('base64url');
}
export function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return { valid: false, error: 'Invalid token format' };
        const [header, body, signature] = parts;
        const expectedSig = crypto
            .createHmac('sha256', JWT_SECRET)
            .update(`${header}.${body}`)
            .digest('base64url');
        if (signature !== expectedSig) {
            return { valid: false, error: 'Invalid signature' };
        }
        const payload = JSON.parse(base64urlDecode(body));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return { valid: false, error: 'Token expired' };
        }
        return { valid: true, payload };
    }
    catch {
        return { valid: false, error: 'Token decode failed' };
    }
}
// ========================================================
// Serviço de Usuários
// ========================================================
export async function registerUser({ email, name, password, }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new Error('EMAIL_EXISTS');
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: { email, name, passwordHash },
        select: { id: true, email: true, name: true },
    });
    return user;
}
export async function loginUser({ email, password, }) {
    const user = (await prisma.user.findUnique({
        where: { email },
        include: {
            memberships: {
                include: {
                    club: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            planType: true,
                            subscription: {
                                select: { status: true, planType: true },
                            },
                        },
                    },
                },
            },
        },
    }));
    if (!user)
        throw new Error('INVALID_CREDENTIALS');
    if (!user.isActive)
        throw new Error('USER_INACTIVE');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid)
        throw new Error('INVALID_CREDENTIALS');
    const defaultMembership = user.memberships[0] ?? null;
    const defaultClubId = defaultMembership?.clubId ?? null;
    const defaultRole = defaultMembership?.role ?? user.platformRole ?? 'ATHLETE';
    const defaultClub = defaultMembership?.club ?? null;
    const defaultPlanType = defaultClub?.subscription?.planType ?? defaultClub?.planType ?? 'FREE';
    const defaultSubStatus = defaultClub?.subscription?.status ?? 'ACTIVE';
    const token = generateToken({
        userId: user.id,
        email: user.email,
        clubId: defaultClubId,
        role: defaultRole,
        platformRole: user.platformRole,
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
            platformRole: user.platformRole,
            clubs: user.memberships.map((m) => ({
                clubId: m.club.id,
                clubName: m.club.name,
                clubSlug: m.club.slug,
                role: m.role,
                planType: m.club.subscription?.planType ?? m.club.planType,
                subscriptionStatus: m.club.subscription?.status ?? 'ACTIVE',
            })),
        },
    };
}
export async function switchClub(userId, clubId) {
    const membership = (await prisma.clubMembership.findUnique({
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
    }));
    if (!membership)
        throw new Error('NOT_A_MEMBER');
    const planType = membership.club.subscription?.planType ?? membership.club.planType ?? 'FREE';
    const subscriptionStatus = membership.club.subscription?.status ?? 'ACTIVE';
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
export async function createClub({ name, slug, userId, }) {
    const existing = await prisma.club.findUnique({ where: { slug } });
    if (existing)
        throw new Error('SLUG_EXISTS');
    const club = await prisma.club.create({
        data: {
            name,
            slug,
            memberships: {
                create: { userId, role: 'GESTOR' },
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
const VALID_CLUB_ROLES = ['GESTOR', 'COACH', 'ATHLETE'];
export async function addClubMember({ clubId, userId, role = 'ATHLETE', invitedByUserId, }) {
    if (!VALID_CLUB_ROLES.includes(role)) {
        throw new Error(`INVALID_ROLE: must be one of ${VALID_CLUB_ROLES.join(', ')}`);
    }
    if (role === 'ATHLETE') {
        const existingGestor = (await prisma.clubMembership.findUnique({
            where: { userId_clubId: { userId, clubId } },
        }));
        if (existingGestor?.role === 'GESTOR') {
            throw new Error('GESTOR_CANNOT_BE_ATHLETE: Gestor cannot also be Athlete in the same club');
        }
    }
    if (role === 'GESTOR') {
        const existingAthlete = (await prisma.clubMembership.findUnique({
            where: { userId_clubId: { userId, clubId } },
        }));
        if (existingAthlete?.role === 'ATHLETE') {
            throw new Error('ATHLETE_CANNOT_BE_GESTOR: Athlete cannot also be Gestor in the same club');
        }
    }
    return prisma.clubMembership.create({
        data: {
            clubId,
            userId,
            role: role,
            invitedByUserId,
            status: role === 'ATHLETE' ? 'PENDING' : 'ACTIVE',
        },
    });
}
export async function getClubMembers(clubId, excludeUserId = null) {
    return prisma.clubMembership.findMany({
        where: {
            clubId,
            role: { notIn: ['ADMIN', 'SPECTATOR'] },
            ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatarUrl: true,
                    athleteProfile: {
                        select: { id: true, globalId: true, cpf: true, birthDate: true },
                    },
                },
            },
        },
        orderBy: { joinedAt: 'asc' },
    });
}
// Suppress unused variable warning for ITERATIONS (used for documentation purposes)
void ITERATIONS;

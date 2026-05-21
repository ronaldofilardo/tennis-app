-- Add GESTOR and COACH to UserRole enum
-- These values are already in schema.prisma and expected by AuthContext.tsx, authorization.ts, and tests

-- PostgreSQL: ALTER ENUM to add values (must be done carefully to avoid conflicts)
-- Step 1: Add GESTOR after ADMIN (before ATHLETE)
-- Step 2: Add COACH after GESTOR

ALTER TYPE "UserRole" ADD VALUE 'GESTOR' AFTER 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'COACH' AFTER 'GESTOR';

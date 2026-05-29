const { getAuthService, extractCtx, prisma } = require('./helpers.cjs');
const express = require('express');

module.exports = function registerAuthRoutes(app) {
// ─── Auth ────────────────────────────────────────────────────────────────────

// POST /api/auth/login — usa authService.js real (scrypt + JWT)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const svc = await getAuthService();
    const result = await svc.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    if (err.message === 'INVALID_CREDENTIALS')
      return res.status(401).json({ error: 'Invalid email or password' });
    if (err.message === 'USER_INACTIVE')
      return res.status(403).json({ error: 'User account is inactive' });
    console.error('[POST /api/auth/login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body || {};
    if (!email || !name || !password)
      return res.status(400).json({ error: 'email, name and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const svc = await getAuthService();
    await svc.registerUser({ email, name, password });
    const result = await svc.loginUser({ email, password });
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'EMAIL_EXISTS')
      return res.status(409).json({ error: 'Email already registered' });
    console.error('[POST /api/auth/register]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/register-scorer
app.post('/api/auth/register-scorer', async (req, res) => {
  try {
    const { name, email, cpf, phone, birthDate } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const cleanCpf = cpf ? cpf.replace(/\D/g, '').trim() : null;
    if (cleanCpf && cleanCpf.length !== 11) return res.status(400).json({ error: 'CPF inválido.' });
    const loginIdentifier = cleanCpf || (email ? email.trim().toLowerCase() : null);
    if (!loginIdentifier) return res.status(400).json({ error: 'E-mail ou CPF é obrigatório.' });
    const existing = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (existing) return res.status(409).json({ error: 'Este CPF/e-mail já está cadastrado.' });
    function derivarSenhaPure(birthDateRaw, cleanCpfVal) {
      if (birthDateRaw) {
        let dd, mm, yyyy;
        if (typeof birthDateRaw === 'string' && birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = birthDateRaw.split('-');
          dd = String(day).padStart(2, '0');
          mm = String(month).padStart(2, '0');
          yyyy = year;
        } else {
          const d = new Date(birthDateRaw);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, '0');
            mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
      }
      return cleanCpfVal ? cleanCpfVal.substring(0, 8) : '12345678';
    }
    const senha = derivarSenhaPure(birthDate || null, cleanCpf);
    const svc = await getAuthService();
    const passwordHash = await svc.hashPassword(senha);
    await prisma.user.create({
      data: {
        email: loginIdentifier,
        name: name.trim(),
        passwordHash,
        isActive: true,
        platformRole: 'SCORER',
      },
    });
    const result = await svc.loginUser({
      email: loginIdentifier,
      password: senha,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/auth/register-scorer]', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar anotador.' });
  }
});

// POST /api/auth/register-athlete-independent
app.post('/api/auth/register-athlete-independent', async (req, res) => {
  try {
    const {
      name,
      email,
      cpf,
      phone,
      birthDate,
      gender,
      category,
      nickname,
      ranking,
      entity,
      fatherName,
      fatherCpf,
      motherName,
      motherCpf,
    } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    const cleanCpf = cpf ? cpf.replace(/\D/g, '').trim() : null;
    if (cleanCpf && cleanCpf.length !== 11) return res.status(400).json({ error: 'CPF inválido.' });
    if (!birthDate) return res.status(400).json({ error: 'Data de nascimento é obrigatória.' });
    const loginIdentifier = cleanCpf || (email ? email.trim().toLowerCase() : null);
    if (!loginIdentifier) return res.status(400).json({ error: 'E-mail ou CPF é obrigatório.' });
    const existing = await prisma.user.findUnique({
      where: { email: loginIdentifier },
    });
    if (existing) return res.status(409).json({ error: 'Este CPF/e-mail já está cadastrado.' });
    function derivarSenhaPure2(birthDateRaw, cleanCpfVal) {
      if (birthDateRaw) {
        let dd, mm, yyyy;
        if (typeof birthDateRaw === 'string' && birthDateRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = birthDateRaw.split('-');
          dd = String(day).padStart(2, '0');
          mm = String(month).padStart(2, '0');
          yyyy = year;
        } else {
          const d = new Date(birthDateRaw);
          if (!isNaN(d.getTime())) {
            dd = String(d.getUTCDate()).padStart(2, '0');
            mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            yyyy = d.getUTCFullYear();
          }
        }
        if (dd && mm && yyyy) return `${dd}${mm}${yyyy}`;
      }
      return cleanCpfVal ? cleanCpfVal.substring(0, 8) : '12345678';
    }
    const senha = derivarSenhaPure2(birthDate, cleanCpf);
    const svc = await getAuthService();
    const passwordHash = await svc.hashPassword(senha);
    const parsedBirth = birthDate ? new Date(birthDate) : null;
    const user = await prisma.user.create({
      data: {
        email: loginIdentifier,
        name: name.trim(),
        passwordHash,
        isActive: true,
        platformRole: 'INDEPENDENT_ATHLETE',
      },
    });
    await prisma.athleteProfile.create({
      data: {
        userId: user.id,
        name: name.trim(),
        nickname: nickname || null,
        birthDate: parsedBirth,
        phone: phone || null,
        cpf: cleanCpf || null,
        gender: gender || null,
        category: category || null,
        ranking: ranking ? Number(ranking) : null,
        entity: entity || null,
        fatherName: fatherName || null,
        fatherCpf: fatherCpf ? fatherCpf.replace(/\D/g, '') : null,
        motherName: motherName || null,
        motherCpf: motherCpf ? motherCpf.replace(/\D/g, '') : null,
        isPublic: true,
      },
    });
    const result = await svc.loginUser({
      email: loginIdentifier,
      password: senha,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('[POST /api/auth/register-athlete-independent]', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar atleta.' });
  }
});

// GET /api/athletes/my — lista atletas criados pelo usuário autenticado
};


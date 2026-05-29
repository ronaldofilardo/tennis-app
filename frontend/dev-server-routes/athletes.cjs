const { extractCtx, prisma } = require('./helpers.cjs');

module.exports = function registerAthleteRoutes(app) {
app.get('/api/athletes/my', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });

    const athletes = await prisma.athleteProfile.findMany({
      where: { createdByUserId: ctx.userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nickname: true,
        gender: true,
        age: true,
        ranking: true,
        clubName: true,
        dominance: true,
        backhand: true,
      },
    });
    res.json({ athletes });
  } catch (err) {
    console.error('[GET /api/athletes/my]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/athletes', async (req, res) => {
  try {
    const ctx = await extractCtx(req); // pode ser null para anônimos
    const q = (req.query.q || '')
      .replace(/[<>'"%;()&+]/g, '')
      .trim()
      .slice(0, 100);
    const excludeUserId = req.query.excludeUserId || null;
    const excludeAthleteId = req.query.excludeAthleteId || null;
    const limit = Math.min(parseInt(req.query.limit || '20'), 200); // Aumentado para 200
    const notClauses = [
      ...(excludeUserId ? [{ userId: excludeUserId }] : []),
      ...(excludeAthleteId ? [{ id: excludeAthleteId }] : []),
    ];
    const where = {
      isPublic: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { globalId: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(notClauses.length > 0 && {
        NOT: notClauses.length === 1 ? notClauses[0] : notClauses,
      }),
    };
    const athletes = await prisma.athleteProfile.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        globalId: true,
        name: true,
        nickname: true,
        category: true,
        gender: true,
        ranking: true,
        userId: true,
        user: { select: { name: true } },
      },
    });
    // Anônimos não veem userId (privacidade)
    // Usa User.name como nome canônico (mesmo exibido no Gestor); AthleteProfile.name como fallback
    const response = athletes.map((a) => ({
      id: a.id,
      globalId: a.globalId,
      name: a.user?.name ?? a.name,
      nickname: a.nickname,
      category: a.category,
      gender: a.gender,
      ranking: a.ranking,
      ...(ctx ? { userId: a.userId } : {}),
    }));
    res.json(response);
  } catch (err) {
    console.error('[GET /api/athletes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/athletes — cria perfil de atleta
app.post('/api/athletes', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    const { name, nickname, category, gender, age, clubName, dominance, backhand, ranking } =
      req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Verificar se o usuário existe, se não deixar createdByUserId como NULL
    let createdByUserId = null;
    if (ctx.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { id: true },
      });
      if (userExists) {
        createdByUserId = ctx.userId;
      } else {
        console.warn(
          `[POST /api/athletes] Usuário ${ctx.userId} não existe, criando atleta sem createdByUserId`,
        );
      }
    }

    const profile = await prisma.athleteProfile.create({
      data: {
        name,
        nickname,
        category,
        gender,
        age: age ? parseInt(age) : null,
        clubName: clubName || null,
        dominance: dominance || null,
        backhand: backhand || null,
        ranking: ranking ? parseInt(ranking) : null,
        isPublic: true,
        createdByUserId,
      },
    });
    res.status(201).json(profile);
  } catch (err) {
    console.error('[POST /api/athletes]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/athletes/:id — edita perfil de atleta (próprio atleta ou admin)
app.patch('/api/athletes/:id', async (req, res) => {
  try {
    const ctx = await extractCtx(req);
    if (!ctx) return res.status(401).json({ error: 'Authentication required' });
    const { id } = req.params;
    const athlete = await prisma.athleteProfile.findUnique({ where: { id } });
    if (!athlete) return res.status(404).json({ error: 'Athlete not found' });

    const isSelf = athlete.userId && athlete.userId === ctx.userId;
    const isAdmin = ctx.role === 'ADMIN';
    if (!isSelf && !isAdmin)
      return res.status(403).json({
        error: 'Apenas o próprio atleta ou admin pode editar este perfil.',
      });

    const { name, nickname, birthDate, phone, category, gender, ranking } = req.body || {};
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (nickname !== undefined) updateData.nickname = nickname?.trim() || null;
    if (birthDate !== undefined) updateData.birthDate = birthDate ? new Date(birthDate) : null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (ranking !== undefined) updateData.ranking = ranking ? parseInt(ranking) : null;

    const updated = await prisma.athleteProfile.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    console.error('[PATCH /api/athletes/:id]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// Criar partida — delega ao matchService.js (valida + salva courtType, nickname, etc.)
};


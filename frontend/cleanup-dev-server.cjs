const fs = require('fs');

const file = 'dev-server.cjs';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove comment about "Clubes"
content = content.replace(
  /\/\/ ─── Clubes ──────────[\s\S]*?\n\/\/ GET \/api\/clubs — clubes do usuário autenticado\n\/\/ Endpoint PÚBLICO — permite acesso anônimo \(para Scorer Avulso\)\n/,
  ''
);

// 2. Remove "scheduledAt" from MATCH_SELECT template
content = content.replace(
  /scheduledAt: match\.scheduledAt \? match\.scheduledAt\.toISOString\(\) : null,\n/g,
  ''
);

// 3. Remove "venueId" from MATCH_SELECT template
content = content.replace(
  /venueId: match\.venueId \|\| null,\n/g,
  ''
);

// 4. Remove "venue" from MATCH_SELECT template
content = content.replace(
  /venue: match\.venue \|\| null,\n/g,
  ''
);

// 5. Remove "scheduledAt: true" from select clauses
content = content.replace(
  /\s+scheduledAt: true,\n/g,
  ''
);

// 6. Remove "scheduledAt" from response mappings
content = content.replace(
  /scheduledAt: m\.scheduledAt[^,]*,\n/g,
  ''
);

// 7. Remove "club:" from select clauses
content = content.replace(
  /\s+club: \{ select: \{ id: true, name: true \} \},\n/g,
  ''
);

// 8. Remove "club:" from response mappings  
content = content.replace(
  /club: m\.club,\n/g,
  ''
);

// 9. Remove "scheduledAt" and "venueId" from PATCH body destructuring
content = content.replace(
  /const \{ scheduledAt, venueId, nickname, visibility, openForAnnotation \} = req\.body \|\| \{\};/,
  'const { nickname, visibility, openForAnnotation } = req.body || {};'
);

// 10. Remove "scheduledAt" assignment in PATCH
content = content.replace(
  /if \(scheduledAt !== undefined\) data\.scheduledAt = scheduledAt \? new Date\(scheduledAt\) : null;\n/g,
  ''
);

// 11. Remove "venueId" assignment in PATCH
content = content.replace(
  /if \(venueId !== undefined\) data\.venueId = venueId \|\| null;\n/g,
  ''
);

// 12. Remove "clubId: null" in request body
content = content.replace(
  /clubId: null,\n/g,
  ''
);

fs.writeFileSync(file, content, 'utf8');
console.log('✅ dev-server.cjs cleaned');

// Verify consolidation logic: Resume → Close → Resume → Close should not create duplicates
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyConsolidation() {
  try {
    // Test match ID
    const matchId = 'cmpcqzh6v0001hppk81ztbdba';
    const userId = 'user_2sLYbJPHqvbzKnc8uNGt5bC9cCu'; // Player user

    console.log('========== CONSOLIDATION VERIFICATION ==========\n');

    // 1. Get all sessions for this match
    const sessions = await prisma.matchAnnotationSession.findMany({
      where: { matchId, annotatorUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Total sessions: ${sessions.length}`);
    console.log('\n--- Session Details ---');
    sessions.forEach((s, i) => {
      console.log(
        `[${i}] ID: ${s.id.substring(0, 12)}... | Status: ${s.status} | Active: ${s.isActive} | Created: ${s.createdAt.toISOString()}`,
      );
    });

    // 2. Check status distribution
    const inProgress = sessions.filter((s) => s.status === 'IN_PROGRESS').length;
    const abandoned = sessions.filter((s) => s.status === 'ABANDONED').length;
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;

    console.log('\n--- Status Count ---');
    console.log(`IN_PROGRESS: ${inProgress}`);
    console.log(`ABANDONED: ${abandoned}`);
    console.log(`COMPLETED: ${completed}`);

    // 3. Verify consolidation:
    // - Should have at most 1 IN_PROGRESS or 1 active session
    // - Older sessions should be ABANDONED
    const activeCount = sessions.filter((s) => s.isActive).length;
    console.log('\n--- Consolidation Check ---');
    console.log(`✅ Active sessions: ${activeCount} (expected: 0 or 1)`);

    if (activeCount <= 1) {
      console.log('✅ PASS: Consolidation logic working (max 1 active session)');
    } else {
      console.log(`❌ FAIL: Multiple active sessions found (${activeCount})`);
    }

    // 4. Check if older sessions are marked ABANDONED
    if (sessions.length > 1) {
      const olderSessions = sessions.slice(1);
      const allAbandoned = olderSessions.every(
        (s) => s.status === 'ABANDONED' || s.status === 'COMPLETED',
      );
      console.log(`✅ Older sessions status: ${allAbandoned ? 'ABANDONED/COMPLETED' : 'Mixed'}`);
    }

    console.log('\n========== VERIFICATION COMPLETE ==========');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConsolidation();

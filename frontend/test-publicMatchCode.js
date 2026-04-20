// Test publicMatchCode in DEV
const prisma = require('./api/_lib/prisma.js');

async function test() {
  try {
    // Test 1: Create a match with publicMatchCode
    console.log('Test 1: Creating match with publicMatchCode...');
    const match = await prisma.match.create({
      data: {
        sportType: 'TENNIS',
        format: 'BEST_OF_3',
        playerP1: 'Test Player 1',
        playerP2: 'Test Player 2',
        visibility: 'PUBLIC',
        openForAnnotation: true,
        publicMatchCode: 'TEST0001',
      },
    });
    console.log('✓ Match created:', {
      id: match.id,
      publicMatchCode: match.publicMatchCode,
    });

    // Test 2: Check unique constraint
    console.log('\nTest 2: Testing UNIQUE constraint on publicMatchCode...');
    try {
      await prisma.match.create({
        data: {
          sportType: 'TENNIS',
          format: 'BEST_OF_3',
          playerP1: 'Dup Player 1',
          playerP2: 'Dup Player 2',
          visibility: 'PUBLIC',
          openForAnnotation: true,
          publicMatchCode: 'TEST0001', // Duplicate!
        },
      });
      console.log('✗ ERROR: Duplicate publicMatchCode was allowed!');
    } catch (err) {
      console.log('✓ Duplicate rejected correctly:', err.code);
    }

    // Test 3: Find by publicMatchCode
    console.log('\nTest 3: Finding match by publicMatchCode...');
    const found = await prisma.match.findUnique({
      where: { publicMatchCode: 'TEST0001' },
    });
    console.log('✓ Match found:', {
      id: found?.id,
      publicMatchCode: found?.publicMatchCode,
    });

    // Test 4: List matches with publicMatchCode filter
    console.log('\nTest 4: Listing matches with publicMatchCode filter...');
    const list = await prisma.match.findMany({
      where: { publicMatchCode: { not: null } },
      select: { id: true, publicMatchCode: true },
      take: 5,
    });
    console.log(`✓ Found ${list.length} matches with publicMatchCode`);

    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();

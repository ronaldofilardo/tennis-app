const fetch = require('node-fetch');

async function testSuspendedEndpoint() {
  try {
    const res = await fetch('http://localhost:3001/api/matches/suspended-sessions', {
      headers: {
        Cookie: 'sid=test_token_play_email_com', // Ensure auth context for play@email.com
      },
    });

    const data = await res.json();
    console.log('GET /suspended-sessions Response:');
    console.log(`Status: ${res.status}`);
    console.log(`Total items: ${Array.isArray(data) ? data.length : 'Not an array'}\n`);

    if (Array.isArray(data)) {
      const matches = {};
      data.forEach((item, idx) => {
        const key = `${item.id}-${item.suspendedSessionId}`;
        console.log(`[${idx + 1}] Match: ${item.id} (${item.playerP1} vs ${item.playerP2})`);
        console.log(`    SessionId: ${item.suspendedSessionId}`);
        console.log(`    Status: ${item.suspendedStatus}`);
        console.log(`    SuspendedAt: ${item.suspendedAt}`);
        console.log();

        if (!matches[item.id]) {
          matches[item.id] = [];
        }
        matches[item.id].push(item.suspendedSessionId);
      });

      console.log('\n--- Summary ---');
      for (const [matchId, sessions] of Object.entries(matches)) {
        if (sessions.length > 1) {
          console.log(`⚠️ Match ${matchId}: ${sessions.length} suspended sessions`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testSuspendedEndpoint();

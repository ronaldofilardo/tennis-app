const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/matches/suspended-sessions',
  method: 'GET',
  headers: {
    Cookie: 'test=1',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('API Response:', {
          status: res.statusCode,
          itemCount: Array.isArray(json) ? json.length : 'not-array',
          headers: res.headers,
        });
        if (Array.isArray(json) && json.length > 0) {
          console.log('\nFirst item:', {
            id: json[0].id,
            suspendedSessionId: json[0].suspendedSessionId,
            suspendedStatus: json[0].suspendedStatus,
          });
        }
      } catch (e) {
        console.log('Raw response:', data.substring(0, 200));
      }
    } else {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

req.on('error', (err) => console.error('Error:', err.message));
req.end();

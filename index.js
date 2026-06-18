const express = require('express');
const crypto = require('crypto');
const https = require('https');
const app = express();

const CHANNEL_ACCESS_TOKEN = "gPTH9qo58RL80DhQQ6Wc7LttQkg4i5SzmCyucNPhUHpgJqEQfhrV/hn7fou7pC4MnqowoBdSqSe4cbmnPwIOObE03xgBZ5i9Plt75BdTmrAHdKsw6h6mtucORUglB7dRmYL/+Z0aEq656LFkcpkMAAdB04t89/1O/w1cDnyilFU=";
const CHANNEL_SECRET = "56c10923be25796f368f1aab4d6847b0";
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyeW1MH1nYGVBIogsGEte-ziInIOz35bkC83gxQgzHmvpAPZCruqr7uYG8n7WfuFmOLIw/exec";

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

app.get('/', (req, res) => {
  res.status(200).json({ status: 'LINE Webhook Server Running' });
});

app.post('/webhook', (req, res) => {
  res.status(200).json({ status: 'success' });

  const signature = req.headers['x-line-signature'];
  const hash = crypto.createHmac('sha256', CHANNEL_SECRET)
    .update(req.rawBody).digest('base64');

  if (signature !== hash) return;

  const events = req.body.events || [];
  events.forEach(event => {
    if (event.type === 'follow') {
      const userId = event.source.userId;
      getProfile(userId).then(profile => {
        logToSheet({
          timestamp: new Date().toISOString(),
          displayName: profile.displayName || '',
          userId: userId,
          pictureUrl: profile.pictureUrl || ''
        });
      });
    }
  });
});

function getProfile(userId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/profile/' + userId,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

function logToSheet(data) {
  const params = new URLSearchParams({
    type: 'follower',
    timestamp: data.timestamp,
    displayName: data.displayName,
    userId: data.userId,
    pictureUrl: data.pictureUrl
  });
  const url = SHEET_URL + '?' + params.toString();
  https.get(url, () => {}).on('error', () => {});
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));

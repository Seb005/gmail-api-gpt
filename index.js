require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Étape 1 : Lancer l’authentification avec Google
app.get('/auth', async (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    prompt: 'consent'
  });
  res.redirect(url);
});

// Étape 2 : Recevoir le code de Google et obtenir le token
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  console.log('🔐 Voici tes tokens:', tokens);
  res.send('Tokens reçus ! Va les copier dans .env');
});

// Étape 3 : Endpoint pour lire tes 5 derniers courriels
app.get('/emails', async (req, res) => {
  oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 5
  });

  const emails = await Promise.all(
    (response.data.messages || []).map(async (msg) => {
      const mail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const subject = mail.data.payload.headers.find(h => h.name === 'Subject');
      return {
        id: msg.id,
        subject: subject ? subject.value : '(Pas de sujet)',
        snippet: mail.data.snippet
      };
    })
  );

  res.json(emails);
});

app.listen(port, () => {
  console.log(`✅ Serveur prêt sur http://localhost:${port}`);
});
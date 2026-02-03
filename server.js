require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Data files
const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Config
const ADMIN_CODE = '0632685293';
const ALERT_EMAIL = 'antoine-thomas.devweb@gmail.com';
const MY_NETWORK_IDENTIFIER = process.env.MY_NETWORK_IP || null; // Set in .env if needed

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, '[]');
}
if (!fs.existsSync(VISITORS_FILE)) {
  fs.writeFileSync(VISITORS_FILE, '[]');
}
if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, '{}');
}

// Email transporter (using Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Active sessions tracking
let activeSessions = {};
try {
  activeSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
} catch (e) {
  activeSessions = {};
}

// Helper: Get IP location using ip-api.com (free)
async function getIpLocation(ip) {
  try {
    // Handle localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::ffff:127.0.0.1') {
      return { city: 'Local', region: 'Réseau local', country: 'Local', isp: 'Localhost' };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,isp,query`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city || 'Inconnu',
        region: data.regionName || 'Inconnu',
        country: data.country || 'Inconnu',
        isp: data.isp || 'Inconnu'
      };
    }
    return { city: 'Inconnu', region: 'Inconnu', country: 'Inconnu', isp: 'Inconnu' };
  } catch (error) {
    console.error('IP location error:', error);
    return { city: 'Erreur', region: 'Erreur', country: 'Erreur', isp: 'Erreur' };
  }
}

// Helper: Send email alert
async function sendEmailAlert(subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email alert (SMTP not configured):', subject);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Laserel Tracker" <${process.env.SMTP_USER}>`,
      to: ALERT_EMAIL,
      subject: subject,
      html: html
    });
    console.log('Email sent:', subject);
  } catch (error) {
    console.error('Email error:', error);
  }
}

// Helper: Check if IP is mine
function isMyNetwork(ip) {
  if (!MY_NETWORK_IDENTIFIER) return false;
  return ip.includes(MY_NETWORK_IDENTIFIER);
}

// Helper: Generate session ID
function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper: Save sessions to file
function saveSessions() {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(activeSessions, null, 2));
}

// Helper: Save visitor to file
function saveVisitor(visitor) {
  const visitors = JSON.parse(fs.readFileSync(VISITORS_FILE, 'utf8'));
  visitors.push(visitor);
  fs.writeFileSync(VISITORS_FILE, JSON.stringify(visitors, null, 2));
}

// Helper: Update visitor in file
function updateVisitor(sessionId, updates) {
  const visitors = JSON.parse(fs.readFileSync(VISITORS_FILE, 'utf8'));
  const index = visitors.findIndex(v => v.sessionId === sessionId);
  if (index !== -1) {
    visitors[index] = { ...visitors[index], ...updates };
    fs.writeFileSync(VISITORS_FILE, JSON.stringify(visitors, null, 2));
  }
}

// Helper: Analyze session with AI
async function analyzeSession(session) {
  try {
    const prompt = `Analyse cette session de visite sur une proposition commerciale B2B (IA pour Laserel):

Durée: ${Math.round((session.endTime - session.startTime) / 1000)} secondes
Pages/sections vues: ${session.pageViews?.join(', ') || 'Page principale'}
Scroll max: ${session.maxScroll || 0}%
Questions chatbot: ${session.chatMessages?.length || 0}
${session.chatMessages?.length ? 'Messages: ' + session.chatMessages.map(m => m.question).join(' | ') : ''}

Donne une analyse courte (2-3 phrases) du niveau d'intérêt et de l'engagement. Sois direct et utile pour un commercial.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Analysis error:', error);
    return 'Analyse non disponible';
  }
}

// Serve static files
app.use(express.static('public'));

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ==================== TRACKING API ====================

// New visitor arrives
app.post('/api/track/visit', async (req, res) => {
  try {
    const { userAgent, screenSize, referrer } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    // Check if it's my network
    if (isMyNetwork(ip)) {
      return res.json({ sessionId: null, tracked: false });
    }

    const sessionId = generateSessionId();
    const location = await getIpLocation(ip);

    const visitor = {
      sessionId,
      ip,
      location,
      userAgent,
      screenSize,
      referrer,
      startTime: Date.now(),
      endTime: null,
      pageViews: ['home'],
      maxScroll: 0,
      chatMessages: [],
      analysis: null,
      isActive: true
    };

    // Save to active sessions
    activeSessions[sessionId] = visitor;
    saveSessions();

    // Save to visitors file
    saveVisitor(visitor);

    // Send email alert
    const emailHtml = `
      <h2>Nouveau visiteur sur Laserel Proposition</h2>
      <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</p>
      <p><strong>IP:</strong> ${ip}</p>
      <p><strong>Localisation:</strong> ${location.city}, ${location.region}, ${location.country}</p>
      <p><strong>FAI:</strong> ${location.isp}</p>
      <p><strong>Appareil:</strong> ${screenSize || 'Inconnu'}</p>
      <p><strong>Navigateur:</strong> ${userAgent?.substring(0, 100) || 'Inconnu'}</p>
      ${referrer ? `<p><strong>Provenance:</strong> ${referrer}</p>` : ''}
      <hr>
      <p><a href="https://laserel.cohorte.tech/admin">Voir le dashboard</a></p>
    `;

    await sendEmailAlert(`Nouveau visiteur - ${location.city}, ${location.country}`, emailHtml);

    res.json({ sessionId, tracked: true });
  } catch (error) {
    console.error('Track visit error:', error);
    res.status(500).json({ error: 'Tracking error' });
  }
});

// Update activity (scroll, page view)
app.post('/api/track/activity', (req, res) => {
  try {
    const { sessionId, scroll, section } = req.body;

    if (!sessionId || !activeSessions[sessionId]) {
      return res.json({ ok: false });
    }

    const session = activeSessions[sessionId];
    session.lastActivity = Date.now();

    if (scroll && scroll > (session.maxScroll || 0)) {
      session.maxScroll = scroll;
    }

    if (section && !session.pageViews.includes(section)) {
      session.pageViews.push(section);
    }

    saveSessions();
    res.json({ ok: true });
  } catch (error) {
    res.json({ ok: false });
  }
});

// Heartbeat (keep session alive)
app.post('/api/track/heartbeat', (req, res) => {
  const { sessionId } = req.body;

  if (sessionId && activeSessions[sessionId]) {
    activeSessions[sessionId].lastActivity = Date.now();
    saveSessions();
  }

  res.json({ ok: true });
});

// Session end (user leaves or inactive)
app.post('/api/track/end', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !activeSessions[sessionId]) {
      return res.json({ ok: false });
    }

    const session = activeSessions[sessionId];
    session.endTime = Date.now();
    session.isActive = false;

    // Analyze session
    const analysis = await analyzeSession(session);
    session.analysis = analysis;

    // Update visitor file
    updateVisitor(sessionId, {
      endTime: session.endTime,
      maxScroll: session.maxScroll,
      pageViews: session.pageViews,
      chatMessages: session.chatMessages,
      analysis: analysis,
      isActive: false
    });

    // Send end session email
    const duration = Math.round((session.endTime - session.startTime) / 1000);
    const emailHtml = `
      <h2>Fin de visite - Laserel Proposition</h2>
      <p><strong>Localisation:</strong> ${session.location.city}, ${session.location.country}</p>
      <p><strong>Durée:</strong> ${duration} secondes</p>
      <p><strong>Scroll max:</strong> ${session.maxScroll || 0}%</p>
      <p><strong>Sections vues:</strong> ${session.pageViews?.join(', ') || 'Aucune'}</p>
      <p><strong>Questions chatbot:</strong> ${session.chatMessages?.length || 0}</p>
      <hr>
      <h3>Analyse IA:</h3>
      <p>${analysis}</p>
      <hr>
      <p><a href="https://laserel.cohorte.tech/admin">Voir le dashboard</a></p>
    `;

    await sendEmailAlert(`Fin de visite (${duration}s) - ${session.location.city}`, emailHtml);

    // Remove from active sessions
    delete activeSessions[sessionId];
    saveSessions();

    res.json({ ok: true, analysis });
  } catch (error) {
    console.error('Track end error:', error);
    res.status(500).json({ error: 'End tracking error' });
  }
});

// ==================== CHAT API ====================

const SYSTEM_PROMPT = `Tu es l'assistant de la proposition commerciale Laserel × Cohorte présentée à Mickaël.

CONTEXTE DU DOCUMENT:
- Proposition d'accompagnement IA pour Laserel (franchise épilation laser)
- On a déjà eu un premier call avec Mickaël. Il est intéressé mais veut des résultats concrets.
- Ses 3 priorités : remplir ses centres, réduire les no-shows, baisser les coûts agence
- Tarifs : Audit business 500€ (tu gardes tout même si tu arrêtes), puis Construction 1 500€/mois sans engagement
- 3 solutions prioritaires :
  1. Chatbot closing 24/7 → 10-30% de leads en plus
  2. Système anti no-shows (scoring + relances auto) → 15-40% de no-shows en moins
  3. Ads sans agence (IA génère, tu valides) → 60-80% de frais en moins
- Roadmap : Mois 1 = chatbot + dashboard leads, Mois 2 = système anti no-shows, Mois 3 = optimisation + CRM
- Break-even estimé : mois 2-3
- Aussi prévu : onboarding franchisés, CRM intelligent, contenu marketing, dashboard, assistant interne
- Outils : IA métier (comprend ton business), visibilité IA (nouveau SEO), outils sur-mesure Laserel
- Call de suivi prévu : vendredi 7 février 2026
- Garanties : Sans engagement, transparence totale, ROI mesurable, données restent chez lui

VOCABULAIRE (ne JAMAIS utiliser ces termes techniques, utilise les équivalents) :
- "BMAD" → dis "notre méthode d'audit"
- "RAG" → dis "IA entraînée sur tes données"
- "Agents" ou "agents agentiques" → dis "automatisations intelligentes"
- "Fine-tuning" → dis "IA personnalisée Laserel"
- "Anthropic" ou "Claude" → dis "l'IA qu'on utilise pour le travail métier"
- "GEO" → dis "visibilité dans les résultats IA"

RÈGLES STRICTES:
1. Tu réponds UNIQUEMENT aux questions qui clarifient le document
2. Sois concis, pro, chaleureux - utilise le "tu". Évite le jargon technique.
3. Quand Mickaël pose une question, privilégie toujours les résultats concrets et les chiffres dans ta réponse
4. Si la question est IN-SCOPE (clarification du doc) → réponds clairement avec des chiffres si possible
5. Si la question est OUT-OF-SCOPE (demande business, technique précise, hors doc) → réponds:
   "Bonne question ! Je la note pour qu'Antoine te réponde vendredi lors du call. 📝"
6. Ne jamais inventer d'informations non présentes dans le document
7. Maximum 2-3 phrases par réponse. Pas de jargon.

EXEMPLES IN-SCOPE:
- "Ça va me rapporter quoi concrètement ?" → Parle des 3 résultats chiffrés (leads, no-shows, économie)
- "Pourquoi 1500€/mois ?" → Compare avec le coût agence (2-4k€) et explique que c'est sans engagement
- "C'est quoi le chatbot ?" → Explique simplement : un assistant sur ton site qui répond 24/7 et prend des RDV
- "Comment ça marche ?" → 3 étapes simples : on écoute, on construit, on mesure

EXEMPLES OUT-OF-SCOPE (à noter pour Antoine):
- "En combien de temps vous pouvez mettre ça en place ?"
- "Vous travaillez avec quelles autres entreprises ?"
- "Si je veux arrêter après 2 mois, comment ça se passe exactement ?"
- Toute question sur des détails non présents dans le document`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }]
    });

    const reply = response.content[0].text;
    const isLogged = reply.includes('📝') || reply.includes('Antoine');

    // Log question
    const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
    const questionEntry = {
      timestamp: new Date().toISOString(),
      sessionId: sessionId || null,
      question: message,
      response: reply,
      type: isLogged ? 'out-of-scope' : 'in-scope'
    };
    questions.push(questionEntry);
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));

    // Add to session if exists
    if (sessionId && activeSessions[sessionId]) {
      if (!activeSessions[sessionId].chatMessages) {
        activeSessions[sessionId].chatMessages = [];
      }
      activeSessions[sessionId].chatMessages.push({
        question: message,
        response: reply,
        timestamp: Date.now()
      });
      saveSessions();
    }

    res.json({ response: reply, logged: isLogged });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== ADMIN API ====================

// Admin authentication
app.post('/api/admin/auth', (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) {
    res.json({ success: true, token: 'admin_' + Date.now() });
  } else {
    res.status(401).json({ success: false, error: 'Code incorrect' });
  }
});

// Get all visitors
app.get('/api/admin/visitors', (req, res) => {
  const { token } = req.query;
  if (!token || !token.startsWith('admin_')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const visitors = JSON.parse(fs.readFileSync(VISITORS_FILE, 'utf8'));
    res.json(visitors.reverse()); // Most recent first
  } catch (error) {
    res.json([]);
  }
});

// Get all questions
app.get('/api/admin/questions', (req, res) => {
  const { token } = req.query;
  if (!token || !token.startsWith('admin_')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
    res.json(questions.reverse()); // Most recent first
  } catch (error) {
    res.json([]);
  }
});

// Get active sessions
app.get('/api/admin/active', (req, res) => {
  const { token } = req.query;
  if (!token || !token.startsWith('admin_')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  res.json(Object.values(activeSessions));
});

// Get stats
app.get('/api/admin/stats', (req, res) => {
  const { token } = req.query;
  if (!token || !token.startsWith('admin_')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const visitors = JSON.parse(fs.readFileSync(VISITORS_FILE, 'utf8'));
    const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));

    const today = new Date().toDateString();
    const todayVisitors = visitors.filter(v => new Date(v.startTime).toDateString() === today);

    const avgDuration = visitors
      .filter(v => v.endTime)
      .reduce((sum, v) => sum + (v.endTime - v.startTime), 0) / (visitors.filter(v => v.endTime).length || 1);

    res.json({
      totalVisitors: visitors.length,
      todayVisitors: todayVisitors.length,
      totalQuestions: questions.length,
      outOfScopeQuestions: questions.filter(q => q.type === 'out-of-scope').length,
      avgDuration: Math.round(avgDuration / 1000),
      activeNow: Object.keys(activeSessions).length
    });
  } catch (error) {
    res.json({});
  }
});

// Check for inactive sessions periodically
setInterval(() => {
  const now = Date.now();
  const inactiveThreshold = 30000; // 30 seconds

  Object.keys(activeSessions).forEach(async (sessionId) => {
    const session = activeSessions[sessionId];
    const lastActivity = session.lastActivity || session.startTime;

    if (now - lastActivity > inactiveThreshold && session.isActive) {
      console.log(`Session ${sessionId} inactive, ending...`);

      session.endTime = now;
      session.isActive = false;

      // Analyze and notify
      const analysis = await analyzeSession(session);
      session.analysis = analysis;

      updateVisitor(sessionId, {
        endTime: session.endTime,
        maxScroll: session.maxScroll,
        pageViews: session.pageViews,
        chatMessages: session.chatMessages,
        analysis: analysis,
        isActive: false
      });

      const duration = Math.round((session.endTime - session.startTime) / 1000);
      const emailHtml = `
        <h2>Visiteur inactif (30s) - Laserel Proposition</h2>
        <p><strong>Localisation:</strong> ${session.location.city}, ${session.location.country}</p>
        <p><strong>Durée totale:</strong> ${duration} secondes</p>
        <p><strong>Scroll max:</strong> ${session.maxScroll || 0}%</p>
        <p><strong>Sections vues:</strong> ${session.pageViews?.join(', ') || 'Aucune'}</p>
        <p><strong>Questions chatbot:</strong> ${session.chatMessages?.length || 0}</p>
        <hr>
        <h3>Analyse IA:</h3>
        <p>${analysis}</p>
        <hr>
        <p><a href="https://laserel.cohorte.tech/admin">Voir le dashboard</a></p>
      `;

      await sendEmailAlert(`Visiteur parti (inactif ${duration}s) - ${session.location.city}`, emailHtml);

      delete activeSessions[sessionId];
      saveSessions();
    }
  });
}, 10000); // Check every 10 seconds

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Laserel Demo running on port ${PORT}`);
});

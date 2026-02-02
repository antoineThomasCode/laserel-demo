require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const QUESTIONS_FILE = path.join(__dirname, 'data', 'questions.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, '[]');
}

const SYSTEM_PROMPT = `Tu es l'assistant de la proposition commerciale Laserel × Cohorte présentée à Mickaël.

CONTEXTE DU DOCUMENT:
- Proposition d'accompagnement IA pour Laserel (franchise épilation laser)
- Tarifs: Audit BMAD 500€, puis Construction 1500€/mois MRR sans engagement
- Stack: Claude/Anthropic, ChatGPT Ads (GEO), Modèles privés Laserel
- Méthode BMAD: Brief, Map, Architect, Develop, Deploy
- Use cases: Ads automatisés, no-shows, chatbot closing, onboarding franchisés, CRM, contenu marketing, dashboard
- Call prévu: mardi 3 février 2026
- Garanties: Sans engagement, transparence totale, ROI mesurable

RÈGLES STRICTES:
1. Tu réponds UNIQUEMENT aux questions qui clarifient le document
2. Sois concis, pro, chaleureux - utilise le "tu"
3. Si la question est IN-SCOPE (clarification du doc) → réponds clairement
4. Si la question est OUT-OF-SCOPE (demande business, technique précise, hors doc) → réponds:
   "Excellente question ! Je la note pour qu'Antoine te réponde en détail demain lors du call. 📝"
5. Ne jamais inventer d'informations non présentes dans le document
6. Maximum 2-3 phrases par réponse

EXEMPLES IN-SCOPE:
- "C'est quoi BMAD ?" → Explique brièvement
- "Pourquoi 1500€/mois ?" → Explique la logique MRR
- "C'est quoi le RAG ?" → Vulgarise
- "Pourquoi Claude et pas ChatGPT ?" → Différencie

EXEMPLES OUT-OF-SCOPE (à noter pour Antoine):
- "En combien de temps vous pouvez faire mon site ?"
- "Vous travaillez avec quelles autres entreprises ?"
- "Si je veux arrêter après 2 mois, comment ça se passe exactement ?"
- Toute question sur des détails non présents dans le document`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }]
    });

    const reply = response.content[0].text;
    const isLogged = reply.includes('📝') || reply.includes('Antoine');

    // Log question if out-of-scope
    if (isLogged) {
      const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
      questions.push({
        timestamp: new Date().toISOString(),
        question: message,
        response: reply,
        type: 'out-of-scope'
      });
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
    }

    res.json({ response: reply, logged: isLogged });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get logged questions (for Antoine)
app.get('/api/questions', (req, res) => {
  try {
    const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
    res.json(questions);
  } catch (error) {
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Laserel Demo running on port ${PORT}`);
});

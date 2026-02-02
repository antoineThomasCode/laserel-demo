# LASEREL INTERACTIVE DEMO - Brief Projet

## Objectif
Page web interactive présentant la proposition commerciale Laserel × Cohorte avec un chatbot IA intégré pour répondre aux questions de Mickaël et logger ses interrogations pour préparer le call de closing.

## URL
`laserel.cohorte.fr`

## Stack
- Frontend: HTML/CSS/JS vanilla (léger, rapide)
- Backend: Node.js Express minimal
- IA: Claude API (Anthropic)
- Storage: JSON file (simple, suffisant pour POC)
- Deploy: Docker + Traefik sur VPS Hostinger

## Priorité #1: Mobile-first
95% de chances que Mickaël lise sur mobile. Le design DOIT être parfait sur mobile.

## Fonctionnalités

### 1. Document Interactif
- Reprend exactement le contenu du PDF V8
- Responsive mobile-first
- Navigation fluide entre sections
- Design premium Laserel (gold, cream) + Cohorte (purple)

### 2. Chatbot Widget
- Bulle flottante bottom-right
- Panel slide-up sur mobile
- Conversation contextuelle
- Répond UNIQUEMENT sur le contenu du document
- Questions hors-scope → loggées + "Antoine répondra demain"

### 3. Logging Questions
- Stockage JSON côté serveur
- Timestamp + question + réponse donnée
- Accessible via /api/questions (pour Antoine)

## Contraintes
- Temps: 2-3h max
- Pas d'over-engineering
- Pas d'auth nécessaire
- Un seul utilisateur (Mickaël)

## Fichiers à créer
```
/laserel-demo
├── docker-compose.yml
├── Dockerfile
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── style.css
│   └── chat.js
├── data/
│   └── questions.json
└── .env.example
```

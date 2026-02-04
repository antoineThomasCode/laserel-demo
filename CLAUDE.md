# CLAUDE.md - Mémoire projet Laserel Demo

## Contexte

Proposition commerciale interactive pour **Mickaël** (fondateur Laserel, 5 centres d'esthétique/laser). Page one-pager mobile-first avec chatbot IA intégré. Objectif : closer le deal lors du call vendredi 7 février.

Antoine Thomas (Cohorte Agency) = le consultant qui propose ses services d'automatisation/IA.

## URL & Deploy

- **Production** : https://laserel.cohorte.tech
- **VPS Hostinger** : ID `1108058`, projet Docker `traefik`
- **Deploy** : `/deploy` skill → commit + push origin/main + restart projet VPS via MCP Hostinger-cohorte
- Le conteneur fait `git clone` au démarrage puis `npm install && node server.js`
- Volume `laserel-data` monté sur `/app/data` (persiste les questions du chatbot)

## Stack

- Frontend : HTML/CSS/JS vanilla (un seul fichier `index.html`, `style.css`, `chat.js`, `animations.js`)
- Backend : Node.js Express (`server.js`)
- IA chatbot : Claude Sonnet 4.5 (Anthropic API)
- Pas de framework, pas de build step

## Structure des fichiers

```
public/
  index.html       ← Page principale (tout le contenu + JS inline pour onboarding/ROI calc)
  style.css         ← Tous les styles (~3600 lignes)
  animations.js     ← Scroll-reveal (IntersectionObserver) + progress bar + nav
  chat.js           ← Chatbot widget (panel, messages, API calls)
  admin.html        ← Page admin pour voir les questions loggées
  antoine.png       ← Photo Antoine (avatar chat)
  logo-laserel.png  ← Logo Laserel
server.js           ← Express server + API chat + API tracking
```

## Architecture de la page (sections)

1. **Hero** — Badge, titre, sous-titre, chat cinématique (6 bulles), benefits, scroll indicator
2. **#problem** (01) — 3 alert-toasts + highlight box + comparaison agence vs IA
3. **#solutions** (02) — 3 solution-cards accordion + "Et aussi" section
4. **#roi** (03) — Simulation avant/après + Calculateur ROI interactif (wizard 3 étapes) + Roadmap 3 mois
5. **#method** (04) — 3 étapes méthode + pricing timeline + garanties
6. **#stack** (05) — Outils IA utilisés
7. **#cta** (06) — Call to action vendredi + carte auteur

## Fonctionnalités clés

### Hero cinématique (dernier commit)
- Les éléments hero utilisent `.hero-anim` + `data-hero-step` (PAS les anciennes classes `animate-fade-in`)
- 6 bulles de chat avec typing indicator iMessage-style, séquencées par `animateHero()`
- Coordonné avec l'onboarding overlay : animation démarre après fermeture overlay (ou directement si `sessionStorage('onboarding-done')`)
- Timing total ~9s depuis le clic "Compris !"

### Onboarding overlay
- S'affiche au premier chargement, pointe vers le chatbot widget
- "Compris !" → dismiss + lance animateHero()
- sessionStorage pour ne pas réafficher

### Calculateur ROI (wizard 3 étapes)
- Step 1 : Ton activité (centres, audits/mois, panier moyen)
- Step 2 : Ce que tu perds (taux no-show, leads/mois)
- Step 3 : Ce qu'on récupère (gains calculés en temps réel)
- Boutons +/− pour mobile, navigation prev/next, progress dots
- Tracking throttled vers `/api/track/activity`

### Chatbot widget
- Bulle flottante bottom-right, panel slide-up
- Répond uniquement sur le contenu du document
- Questions hors-scope → loggées + "Antoine répondra"
- API : POST `/api/chat`

### Animations (animations.js)
- Scroll-reveal via IntersectionObserver (classe `.reveal`)
- Progress bar top + progress ring header
- Section nav active state
- **Ne pas modifier ce fichier** sauf demande explicite

## Conventions CSS

- Variables CSS dans `:root` — couleurs Laserel (gold/cream) + Cohorte (teal)
- Mobile-first, breakpoints via `@media (min-width: ...)`
- Classes d'animation hero : `.hero-anim` / `.hero-visible` (éléments), `.hero-bubble` / `.bubble-visible` (bulles)
- Scroll-reveal : `.reveal` / `.revealed` (géré par animations.js)

## Chiffres utilisés (conservateurs, >80% certitude)

- Conversion audit → devis : 60%
- Réduction no-shows avec rappels auto : 25%
- Leads supplémentaires chatbot 24/7 : 10%
- Coût agence actuel : 2-4k€/mois
- Investissement proposé : 500€ audit + 1 500€/mois sans engagement

## Ce qui reste à faire / axes d'amélioration

Antoine a mentionné vouloir changer "beaucoup de choses" — attendre ses instructions spécifiques avant de modifier quoi que ce soit.

// Laserel Demo - Chatbot Widget + Visitor Tracking

// ==================== TRACKING ====================
let sessionId = null;

async function initTracking() {
  try {
    const response = await fetch('/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer || null
      })
    });

    const data = await response.json();
    if (data.tracked) {
      sessionId = data.sessionId;
      startHeartbeat();
      trackScroll();
      trackSections();
      trackPageLeave();
    }
  } catch (error) {
    console.log('Tracking init error:', error);
  }
}

// Heartbeat every 10 seconds
function startHeartbeat() {
  setInterval(() => {
    if (sessionId) {
      fetch('/api/track/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      }).catch(() => {});
    }
  }, 10000);
}

// Track scroll depth
function trackScroll() {
  let maxScroll = 0;
  let throttle = false;

  window.addEventListener('scroll', () => {
    if (throttle) return;
    throttle = true;

    setTimeout(() => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = Math.round((window.scrollY / scrollHeight) * 100);

      if (currentScroll > maxScroll) {
        maxScroll = currentScroll;

        if (sessionId) {
          fetch('/api/track/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, scroll: maxScroll })
          }).catch(() => {});
        }
      }

      throttle = false;
    }, 500);
  });
}

// Track which sections are viewed
function trackSections() {
  const sections = [
    { id: 'hero', selector: '.hero' },
    { id: 'intro', selector: '.intro-card' },
    { id: 'monde-change', selector: '.comparison' },
    { id: 'exemples', selector: '.examples-grid' },
    { id: 'stack', selector: '.stack-card' },
    { id: '2026', selector: '.reasons-grid' },
    { id: 'bmad', selector: '.bmad-steps' },
    { id: 'process', selector: '.process-section' },
    { id: 'garanties', selector: '.guarantees' },
    { id: 'cta', selector: '.cta-section' }
  ];

  const viewedSections = new Set(['home']);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const section = sections.find(s => entry.target.matches(s.selector));
        if (section && !viewedSections.has(section.id)) {
          viewedSections.add(section.id);

          if (sessionId) {
            fetch('/api/track/activity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, section: section.id })
            }).catch(() => {});
          }
        }
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(section => {
    const el = document.querySelector(section.selector);
    if (el) observer.observe(el);
  });
}

// Track when user leaves
function trackPageLeave() {
  // On page unload
  window.addEventListener('beforeunload', () => {
    if (sessionId) {
      // Use sendBeacon for reliable delivery
      navigator.sendBeacon('/api/track/end', JSON.stringify({ sessionId }));
    }
  });

  // On visibility change (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && sessionId) {
      fetch('/api/track/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true
      }).catch(() => {});
    }
  });
}

// ==================== CHATBOT ====================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize tracking
  initTracking();

  const chatWidget = document.getElementById('chat-widget');
  const chatButton = document.getElementById('chat-button');
  const chatPanel = document.getElementById('chat-panel');
  const chatClose = document.getElementById('chat-close');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  if (!chatButton || !chatPanel) return;

  let isOpen = false;

  // Toggle chat panel
  function toggleChat() {
    isOpen = !isOpen;
    chatPanel.classList.toggle('active', isOpen);
    chatButton.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) {
      chatInput.focus();
    }
  }

  chatButton.addEventListener('click', toggleChat);
  chatClose.addEventListener('click', toggleChat);

  // Add message to chat
  function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'bot'}`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Show typing indicator
  function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot loading';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Remove typing indicator
  function hideTyping() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  // Send message
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, true);
    chatInput.value = '';
    chatSend.disabled = true;

    // Show typing
    showTyping();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();
      hideTyping();

      if (data.response) {
        addMessage(data.response);
      } else {
        addMessage("Désolé, une erreur s'est produite. Réessaie ou pose ta question à Antoine demain !");
      }
    } catch (error) {
      hideTyping();
      addMessage("Connexion perdue. Réessaie dans quelques instants !");
    }

    chatSend.disabled = false;
  }

  // Event listeners
  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Welcome message on first open
  let hasOpened = false;
  chatButton.addEventListener('click', () => {
    if (!hasOpened) {
      setTimeout(() => {
        addMessage("Salut ! Je suis là pour clarifier la proposition. Une question sur le document ?");
      }, 500);
      hasOpened = true;
    }
  });
});

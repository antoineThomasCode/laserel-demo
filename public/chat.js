// Laserel Demo - Chatbot Widget
document.addEventListener('DOMContentLoaded', function() {
  const chatWidget = document.getElementById('chat-widget');
  const chatButton = document.getElementById('chat-button');
  const chatPanel = document.getElementById('chat-panel');
  const chatClose = document.getElementById('chat-close');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

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
    typingDiv.className = 'chat-message typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
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
        body: JSON.stringify({ message })
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
        addMessage("Salut ! 👋 Je suis là pour clarifier la proposition. Une question sur le document ?");
      }, 500);
      hasOpened = true;
    }
  });
});

// Content script for Claude.ai - self-contained (no imports)
const PLATFORM_NAME = 'Claude';
const config = {
  name: 'Claude',
  inputSelector: 'div[contenteditable="true"]',
  messageContainerSelector: '[data-testid*="message"]',
  userMessageSelector: '[data-testid="user-message"]',
  assistantMessageSelector: '[data-testid*="message"]:not([data-testid="user-message"])',
  submitButtonSelector: 'button[aria-label*="Send"]',
};

console.log('[Singularity] Content script loaded for Claude.ai');

let isEnabled = true;
let lastProcessedMessageCount = 0;

// Check if extension is enabled
chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
});

// Listen for extension state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleExtension') {
    isEnabled = message.enabled;
  }
  sendResponse({ success: true });
});

// Monitor DOM for new messages
function observeConversation() {
  // Wait for chat container to exist
  const waitForContainer = setInterval(() => {
    const container = document.body;
    if (container) {
      clearInterval(waitForContainer);

      // Initialize the count with current messages
      const currentMessages = document.querySelectorAll(config.messageContainerSelector);
      lastProcessedMessageCount = currentMessages.length;
      console.log(`[Singularity] Starting observation with ${lastProcessedMessageCount} existing messages`);

      const observer = new MutationObserver((mutations) => {
        if (!isEnabled) return;

        // Check for new messages
        const messages = document.querySelectorAll(config.messageContainerSelector);
        console.log(`[Singularity] Mutation detected. Current: ${messages.length}, Last: ${lastProcessedMessageCount}`);

        if (messages.length > lastProcessedMessageCount) {
          console.log(`[Singularity] New messages detected! Processing ${messages.length - lastProcessedMessageCount} new message(s)`);
          extractNewMessages(messages);
          lastProcessedMessageCount = messages.length;
        }
      });

      // Start observing the document body
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });

      console.log('[Singularity] Started observing Claude.ai conversation');
    }
  }, 100);

  // Clear interval after 10 seconds to prevent infinite waiting
  setTimeout(() => clearInterval(waitForContainer), 10000);
}

// Extract new messages from the conversation
async function extractNewMessages(allMessages) {
  const newMessages = Array.from(allMessages).slice(lastProcessedMessageCount);

  for (const messageElement of newMessages) {
    const text = messageElement.innerText || messageElement.textContent;
    const isUser = messageElement.getAttribute('data-testid') === 'user-message';

    if (text && text.trim().length > 0) {
      const message = {
        platform: PLATFORM_NAME,
        text: text.trim(),
        isUser: isUser,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      // Send to background script for processing
      try {
        await chrome.runtime.sendMessage({
          action: 'extractContext',
          message: message
        });
        console.log('[Singularity] Sent message for extraction:', message);
      } catch (error) {
        console.error('[Singularity] Failed to send message:', error);
      }
    }
  }
}

// Intercept user input before sending
function setupInputInterception() {
  const inputObserver = new MutationObserver(() => {
    const inputField = document.querySelector(config.inputSelector);
    const submitButton = document.querySelector(config.submitButtonSelector);

    if (inputField && submitButton && !submitButton.dataset.singularityHooked) {
      submitButton.dataset.singularityHooked = 'true';

      submitButton.addEventListener('click', async (event) => {
        if (!isEnabled) return;

        const userMessage = inputField.innerText || inputField.textContent;
        if (!userMessage || userMessage.trim().length === 0) return;

        console.log('[Singularity] User is sending:', userMessage);

        // For Claude, we don't inject context (it's the source)
        // But we could still request relevant context for display purposes
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'getRelevantContext',
            message: userMessage,
            platform: PLATFORM_NAME
          });

          if (response && response.context && response.context.length > 0) {
            console.log('[Singularity] Found relevant context:', response.context);
          }
        } catch (error) {
          console.error('[Singularity] Failed to get context:', error);
        }
      }, { capture: true });
    }
  });

  inputObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[Singularity] Initializing for Claude.ai');
  observeConversation();
  setupInputInterception();
}

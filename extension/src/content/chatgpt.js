import { PLATFORMS } from '../utils/platform-config.js';

const PLATFORM_NAME = 'ChatGPT';
const config = PLATFORMS['chat.openai.com'];

console.log('[Singularity] Content script loaded for ChatGPT');

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
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    // Check for new messages
    const messages = document.querySelectorAll(config.messageContainerSelector);
    if (messages.length > lastProcessedMessageCount) {
      extractNewMessages(messages);
      lastProcessedMessageCount = messages.length;
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[Singularity] Started observing ChatGPT conversation');
}

// Extract new messages
async function extractNewMessages(allMessages) {
  const newMessages = Array.from(allMessages).slice(lastProcessedMessageCount);

  for (const messageElement of newMessages) {
    const role = messageElement.getAttribute('data-message-author-role');
    const text = messageElement.innerText || messageElement.textContent;

    if (text && text.trim().length > 0) {
      const message = {
        platform: PLATFORM_NAME,
        text: text.trim(),
        isUser: role === 'user',
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      // Send to background script
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

// Intercept and enhance user input
function setupInputInterception() {
  const inputObserver = new MutationObserver(() => {
    const inputField = document.querySelector(config.inputSelector);
    const submitButton = document.querySelector(config.submitButtonSelector);

    if (inputField && submitButton && !submitButton.dataset.singularityHooked) {
      submitButton.dataset.singularityHooked = 'true';

      submitButton.addEventListener('click', async (event) => {
        if (!isEnabled) return;

        const userMessage = inputField.value || inputField.textContent;
        if (!userMessage || userMessage.trim().length === 0) return;

        console.log('[Singularity] User is sending:', userMessage);

        // Get relevant context from other platforms
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'getRelevantContext',
            message: userMessage,
            platform: PLATFORM_NAME
          });

          if (response && response.context && response.context.length > 0) {
            console.log('[Singularity] Injecting context:', response.context);

            // Inject context into the message
            event.preventDefault();
            event.stopPropagation();

            const contextPrefix = `[Context from other AI conversations: ${response.context.join('; ')}]\n\n`;
            const enhancedMessage = contextPrefix + userMessage;

            // Set the enhanced message
            if (inputField.tagName === 'TEXTAREA') {
              inputField.value = enhancedMessage;
            } else {
              inputField.textContent = enhancedMessage;
            }

            // Trigger input event to update React state
            inputField.dispatchEvent(new Event('input', { bubbles: true }));

            // Click submit again after a brief delay
            setTimeout(() => {
              submitButton.click();
            }, 100);
          }
        } catch (error) {
          console.error('[Singularity] Failed to inject context:', error);
        }
      }, { capture: true, once: true });
    }
  });

  inputObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[Singularity] Initializing for ChatGPT');
  observeConversation();
  setupInputInterception();
}

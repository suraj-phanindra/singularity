// Content script for ChatGPT - self-contained (no imports)
const PLATFORM_NAME = 'ChatGPT';
const config = {
  name: 'ChatGPT',
  inputSelector: '#prompt-textarea',
  messageContainerSelector: 'div[data-message-author-role]',
  userMessageSelector: 'div[data-message-author-role="user"]',
  assistantMessageSelector: 'div[data-message-author-role="assistant"]',
  submitButtonSelector: 'button[data-testid="send-button"]',
};

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
  let isProcessing = false;

  const interceptSubmit = async (event) => {
    console.log('[Singularity] interceptSubmit called, enabled:', isEnabled, 'processing:', isProcessing);

    if (!isEnabled || isProcessing) return;

    const inputField = document.querySelector(config.inputSelector);
    console.log('[Singularity] Input field found:', !!inputField);
    if (!inputField) return;

    const userMessage = inputField.value || inputField.textContent;
    console.log('[Singularity] User message:', userMessage);
    if (!userMessage || userMessage.trim().length === 0) return;

    // Check if already enhanced
    if (userMessage.includes('[Context from other AI conversations:')) return;

    console.log('[Singularity] Intercepting ChatGPT message:', userMessage);

    isProcessing = true;

    // Get relevant context from other platforms
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getRelevantContext',
        message: userMessage,
        platform: PLATFORM_NAME
      });

      console.log('[Singularity] Got response:', response);

      if (response && response.context && response.context.length > 0) {
        console.log('[Singularity] Injecting context:', response.context);

        // Prevent the original submit
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const contextPrefix = `[Context from other AI conversations: ${response.context.join('; ')}]\n\n`;
        const enhancedMessage = contextPrefix + userMessage;

        // Set the enhanced message
        // ChatGPT uses a contenteditable div, need to set innerHTML/textContent
        inputField.textContent = '';
        inputField.innerText = enhancedMessage;

        // Focus the field
        inputField.focus();

        // Trigger input events for React
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        inputField.dispatchEvent(new Event('change', { bubbles: true }));

        // Re-submit after delay to allow React to update
        setTimeout(() => {
          isProcessing = false;

          // Find and click the submit button
          const submitBtn = document.querySelector(config.submitButtonSelector);
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
          }
        }, 500);
      } else {
        isProcessing = false;
        console.log('[Singularity] No context to inject');
      }
    } catch (error) {
      isProcessing = false;
      console.error('[Singularity] Failed to inject context:', error);
    }
  };

  // Intercept Enter key on input field
  const inputObserver = new MutationObserver(() => {
    const inputField = document.querySelector(config.inputSelector);

    if (inputField && !inputField.dataset.singularityHooked) {
      inputField.dataset.singularityHooked = 'true';

      inputField.addEventListener('keydown', (event) => {
        // Check if Enter was pressed without Shift (Shift+Enter is for new line)
        if (event.key === 'Enter' && !event.shiftKey && !isProcessing) {
          // Get message immediately
          const userMessage = inputField.value || inputField.textContent;

          // Check if already enhanced
          if (!userMessage || userMessage.includes('[Context from other AI conversations:')) {
            return;
          }

          console.log('[Singularity] Blocking Enter, will enhance and resubmit');

          // Block this Enter keypress
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          // Now do the async work
          interceptSubmit(event);
        }
      }, true);

      console.log('[Singularity] Hooked ChatGPT input field');
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

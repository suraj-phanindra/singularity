import { PLATFORMS } from '../utils/platform-config.js';

const PLATFORM_NAME = 'Gemini';
const config = PLATFORMS['gemini.google.com'];

console.log('[Singularity] Content script loaded for Gemini');

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

    // Gemini uses different selectors, we need to find message containers
    const messages = findMessageElements();
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

  console.log('[Singularity] Started observing Gemini conversation');
}

// Find message elements (Gemini's DOM structure)
function findMessageElements() {
  // Gemini uses message-content elements or similar
  // Try multiple selectors as Gemini's structure may vary
  const selectors = [
    'message-content',
    '[class*="message"]',
    '[data-test-id*="message"]',
    '.model-response-text',
    '.user-query'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return elements;
    }
  }

  return [];
}

// Extract new messages
async function extractNewMessages(allMessages) {
  const newMessages = Array.from(allMessages).slice(lastProcessedMessageCount);

  for (const messageElement of newMessages) {
    const text = messageElement.innerText || messageElement.textContent;

    // Determine if it's a user or model message
    const isUser = isUserMessage(messageElement);

    if (text && text.trim().length > 0) {
      const message = {
        platform: PLATFORM_NAME,
        text: text.trim(),
        isUser: isUser,
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

// Determine if message is from user or model
function isUserMessage(element) {
  const classList = element.className || '';
  const dataAttrs = element.dataset || {};

  // Check for user-specific classes or attributes
  if (classList.includes('user') || dataAttrs.role === 'user') {
    return true;
  }

  // Check parent elements
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const parentClass = parent.className || '';
    if (parentClass.includes('user-query') || parentClass.includes('user-message')) {
      return true;
    }
    if (parentClass.includes('model-response') || parentClass.includes('assistant')) {
      return false;
    }
    parent = parent.parentElement;
  }

  // Default: assume it's a user message if it appears before model messages
  return false;
}

// Intercept and enhance user input
function setupInputInterception() {
  const inputObserver = new MutationObserver(() => {
    const inputField = findInputField();
    const submitButton = findSubmitButton();

    if (inputField && submitButton && !submitButton.dataset.singularityHooked) {
      submitButton.dataset.singularityHooked = 'true';

      submitButton.addEventListener('click', async (event) => {
        if (!isEnabled) return;

        const userMessage = extractUserInput(inputField);
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
            setUserInput(inputField, enhancedMessage);

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

// Find input field (Gemini uses contenteditable divs)
function findInputField() {
  const selectors = [
    'div[contenteditable="true"]',
    'textarea[placeholder*="Enter"]',
    'rich-textarea',
    '[data-test-id*="input"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }

  return null;
}

// Find submit button
function findSubmitButton() {
  const selectors = [
    'button[aria-label*="Send"]',
    'button[aria-label*="Submit"]',
    'button[type="submit"]',
    '[data-test-id*="send"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && !element.disabled) return element;
  }

  return null;
}

// Extract user input from various input types
function extractUserInput(inputField) {
  if (inputField.tagName === 'TEXTAREA') {
    return inputField.value;
  } else if (inputField.contentEditable === 'true') {
    return inputField.innerText || inputField.textContent;
  }
  return '';
}

// Set user input in various input types
function setUserInput(inputField, text) {
  if (inputField.tagName === 'TEXTAREA') {
    inputField.value = text;
  } else if (inputField.contentEditable === 'true') {
    inputField.textContent = text;
  }

  // Trigger input event to update any React/Vue state
  inputField.dispatchEvent(new Event('input', { bubbles: true }));
  inputField.dispatchEvent(new Event('change', { bubbles: true }));
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[Singularity] Initializing for Gemini');
  observeConversation();
  setupInputInterception();
}

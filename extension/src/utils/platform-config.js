// Platform-specific DOM selectors and configurations
export const PLATFORMS = {
  'claude.ai': {
    name: 'Claude',
    inputSelector: 'div[contenteditable="true"]',
    messageContainerSelector: 'div[class*="font-claude-message"]',
    userMessageSelector: 'div[data-test-render-count]',
    assistantMessageSelector: 'div[class*="font-claude-message"]',
    submitButtonSelector: 'button[aria-label*="Send"]',
  },
  'chat.openai.com': {
    name: 'ChatGPT',
    inputSelector: '#prompt-textarea',
    messageContainerSelector: 'div[data-message-author-role]',
    userMessageSelector: 'div[data-message-author-role="user"]',
    assistantMessageSelector: 'div[data-message-author-role="assistant"]',
    submitButtonSelector: 'button[data-testid="send-button"]',
  },
  'gemini.google.com': {
    name: 'Gemini',
    inputSelector: 'div[contenteditable="true"]',
    messageContainerSelector: 'message-content',
    userMessageSelector: '.user-message',
    assistantMessageSelector: '.model-message',
    submitButtonSelector: 'button[aria-label*="Send"]',
  },
  'www.perplexity.ai': {
    name: 'Perplexity',
    inputSelector: 'textarea',
    messageContainerSelector: 'div[class*="prose"]',
    userMessageSelector: 'div[class*="user"]',
    assistantMessageSelector: 'div[class*="assistant"]',
    submitButtonSelector: 'button[type="submit"]',
  }
};

export function getPlatformConfig() {
  const hostname = window.location.hostname;
  return PLATFORMS[hostname] || null;
}

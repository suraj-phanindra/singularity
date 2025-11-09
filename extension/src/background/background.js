import {
  initDB,
  storeFact,
  storeConversation,
  getAllFacts,
  getRecentFacts,
  getFactCount,
  clearAllData
} from '../utils/storage.js';

const BACKEND_URL = 'http://localhost:8000';

console.log('[Singularity] Background service worker initialized');

// Initialize IndexedDB
initDB().then(() => {
  console.log('[Singularity] IndexedDB initialized');
}).catch(error => {
  console.error('[Singularity] Failed to initialize IndexedDB:', error);
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(error => {
    console.error('[Singularity] Error handling message:', error);
    sendResponse({ error: error.message });
  });

  // Return true to indicate async response
  return true;
});

async function handleMessage(message, sender) {
  const { action } = message;

  switch (action) {
    case 'extractContext':
      return await handleExtractContext(message.message);

    case 'getRelevantContext':
      return await handleGetRelevantContext(message.message, message.platform);

    case 'getContextStats':
      return await handleGetContextStats();

    case 'toggleExtension':
      return await handleToggleExtension(message.enabled);

    case 'clearAllContext':
      return await handleClearAllContext();

    default:
      return { error: 'Unknown action' };
  }
}

// Extract context from a conversation message
async function handleExtractContext(message) {
  try {
    // Store the raw conversation message
    await storeConversation(message);

    // Send to backend for AI-powered context extraction
    const response = await fetch(`${BACKEND_URL}/api/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error('Backend extraction failed');
    }

    const result = await response.json();

    // Store extracted facts
    if (result.facts && result.facts.length > 0) {
      for (const fact of result.facts) {
        await storeFact({
          ...fact,
          extractedAt: new Date().toISOString(),
          sourceMessage: message.text
        });
      }
      console.log(`[Singularity] Stored ${result.facts.length} facts`);
    }

    return { success: true, factsExtracted: result.facts.length };
  } catch (error) {
    console.error('[Singularity] Context extraction failed:', error);

    // Fallback: simple keyword extraction without backend
    const simpleFacts = simpleKeywordExtraction(message);
    for (const fact of simpleFacts) {
      await storeFact(fact);
    }

    return { success: true, factsExtracted: simpleFacts.length, fallback: true };
  }
}

// Simple fallback extraction when backend is unavailable
function simpleKeywordExtraction(message) {
  const facts = [];
  const text = message.text.toLowerCase();

  // Simple pattern matching for preferences
  const preferencePatterns = [
    /i (?:like|love|prefer|enjoy) ([^.,!?]+)/gi,
    /i am (a |an )?([^.,!?]+)/gi,
    /my (?:favorite|favourite) ([^.,!?]+) is ([^.,!?]+)/gi,
  ];

  for (const pattern of preferencePatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      facts.push({
        text: match[0],
        category: 'preference',
        confidence: 0.5,
        platform: message.platform,
        timestamp: message.timestamp
      });
    }
  }

  return facts;
}

// Get relevant context for a query
async function handleGetRelevantContext(query, platform) {
  try {
    // Try backend first (uses AI for semantic search)
    const response = await fetch(`${BACKEND_URL}/api/retrieve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, platform, limit: 5 })
    });

    if (!response.ok) {
      throw new Error('Backend retrieval failed');
    }

    const result = await response.json();
    return { context: result.context || [] };
  } catch (error) {
    console.error('[Singularity] Context retrieval failed, using fallback:', error);

    // Fallback: simple keyword search
    const allFacts = await getAllFacts();
    const relevantFacts = allFacts
      .filter(fact => {
        // Don't return facts from the same platform
        if (fact.platform === platform) return false;

        // Simple keyword matching
        const queryWords = query.toLowerCase().split(' ');
        const factText = fact.text.toLowerCase();
        return queryWords.some(word => word.length > 3 && factText.includes(word));
      })
      .slice(0, 3)
      .map(fact => fact.text);

    return { context: relevantFacts };
  }
}

// Get context statistics
async function handleGetContextStats() {
  try {
    const count = await getFactCount();
    const recentFacts = await getRecentFacts(10);

    return {
      count,
      recentFacts
    };
  } catch (error) {
    console.error('[Singularity] Failed to get stats:', error);
    return { count: 0, recentFacts: [] };
  }
}

// Toggle extension enabled/disabled
async function handleToggleExtension(enabled) {
  await chrome.storage.local.set({ enabled });
  console.log(`[Singularity] Extension ${enabled ? 'enabled' : 'disabled'}`);

  // Notify all content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleExtension',
        enabled
      });
    } catch (error) {
      // Tab might not have content script
    }
  }

  return { success: true };
}

// Clear all context
async function handleClearAllContext() {
  try {
    await clearAllData();
    console.log('[Singularity] All context cleared');
    return { success: true };
  } catch (error) {
    console.error('[Singularity] Failed to clear context:', error);
    return { success: false, error: error.message };
  }
}

// Check backend health periodically
setInterval(async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET'
    });
    if (response.ok) {
      console.log('[Singularity] Backend is healthy');
    }
  } catch (error) {
    console.log('[Singularity] Backend is not reachable');
  }
}, 60000); // Every minute

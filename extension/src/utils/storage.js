// IndexedDB storage utility for Singularity

const DB_NAME = 'SingularityDB';
const DB_VERSION = 1;
const STORE_FACTS = 'facts';
const STORE_CONVERSATIONS = 'conversations';

let db = null;

// Initialize IndexedDB
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create facts object store
      if (!database.objectStoreNames.contains(STORE_FACTS)) {
        const factsStore = database.createObjectStore(STORE_FACTS, {
          keyPath: 'id',
          autoIncrement: true
        });
        factsStore.createIndex('platform', 'platform', { unique: false });
        factsStore.createIndex('timestamp', 'timestamp', { unique: false });
        factsStore.createIndex('category', 'category', { unique: false });
      }

      // Create conversations object store
      if (!database.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const convoStore = database.createObjectStore(STORE_CONVERSATIONS, {
          keyPath: 'id',
          autoIncrement: true
        });
        convoStore.createIndex('platform', 'platform', { unique: false });
        convoStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Get database instance
async function getDB() {
  if (!db) {
    await initDB();
  }
  return db;
}

// Store a fact
export async function storeFact(fact) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS], 'readwrite');
    const store = transaction.objectStore(STORE_FACTS);
    const request = store.add(fact);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store a conversation message
export async function storeConversation(message) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_CONVERSATIONS], 'readwrite');
    const store = transaction.objectStore(STORE_CONVERSATIONS);
    const request = store.add(message);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all facts
export async function getAllFacts() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS], 'readonly');
    const store = transaction.objectStore(STORE_FACTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get recent facts
export async function getRecentFacts(limit = 10) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS], 'readonly');
    const store = transaction.objectStore(STORE_FACTS);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');

    const results = [];
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Search facts by text
export async function searchFacts(searchText) {
  const allFacts = await getAllFacts();
  const searchLower = searchText.toLowerCase();

  return allFacts.filter(fact =>
    fact.text && fact.text.toLowerCase().includes(searchLower)
  );
}

// Get facts by platform
export async function getFactsByPlatform(platform) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS], 'readonly');
    const store = transaction.objectStore(STORE_FACTS);
    const index = store.index('platform');
    const request = index.getAll(platform);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get fact count
export async function getFactCount() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS], 'readonly');
    const store = transaction.objectStore(STORE_FACTS);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Delete a specific fact by ID
export async function deleteFact(factId) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS], 'readwrite');
    const store = transaction.objectStore(STORE_FACTS);
    const request = store.delete(factId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all data
export async function clearAllData() {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_FACTS, STORE_CONVERSATIONS], 'readwrite');

    const factsStore = transaction.objectStore(STORE_FACTS);
    const convoStore = transaction.objectStore(STORE_CONVERSATIONS);

    const clearFacts = factsStore.clear();
    const clearConvos = convoStore.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

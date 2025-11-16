import React, { useState, useEffect } from 'react';

function App() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [contextCount, setContextCount] = useState(0);
  const [recentFacts, setRecentFacts] = useState([]);

  useEffect(() => {
    // Check backend connection
    checkBackendStatus();

    // Load context count from storage
    loadContextData();

    // Load enabled state from storage
    loadEnabledState();
  }, []);

  const loadEnabledState = async () => {
    try {
      const result = await chrome.storage.local.get(['enabled']);
      // Default to true if not set
      setIsEnabled(result.enabled !== false);
    } catch (error) {
      console.error('Failed to load enabled state:', error);
    }
  };

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const loadContextData = async () => {
    try {
      // Request context data from background script
      const response = await chrome.runtime.sendMessage({
        action: 'getContextStats'
      });

      if (response) {
        setContextCount(response.count || 0);
        setRecentFacts(response.recentFacts || []);
      }
    } catch (error) {
      console.error('Failed to load context data:', error);
    }
  };

  const toggleEnabled = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);

    // Save to storage
    await chrome.storage.local.set({ enabled: newState });

    // Notify background script
    await chrome.runtime.sendMessage({
      action: 'toggleExtension',
      enabled: newState
    });
  };

  const clearAllContext = async () => {
    if (confirm('Are you sure you want to clear all stored context?')) {
      await chrome.runtime.sendMessage({ action: 'clearAllContext' });
      setContextCount(0);
      setRecentFacts([]);
    }
  };

  const deleteSingleFact = async (factId) => {
    if (confirm('Delete this context item?')) {
      const response = await chrome.runtime.sendMessage({
        action: 'deleteFact',
        factId: factId
      });

      if (response.success) {
        // Reload context data
        await loadContextData();
      }
    }
  };

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return '#4ade80';
      case 'disconnected': return '#f87171';
      case 'checking': return '#fbbf24';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Singularity</h1>
        <div className="status-indicator">
          <div
            className="status-dot"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="status-text">
            {backendStatus === 'connected' ? 'Connected' :
             backendStatus === 'disconnected' ? 'Backend Offline' :
             'Checking...'}
          </span>
        </div>
      </header>

      <div className="controls">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={toggleEnabled}
          />
          <span className="slider"></span>
          <span className="label">{isEnabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-value">{contextCount}</div>
          <div className="stat-label">Facts Stored</div>
        </div>
      </div>

      <div className="recent-facts">
        <h3>Manage Context & Memories</h3>
        {recentFacts.length === 0 ? (
          <p className="empty-state">No context captured yet</p>
        ) : (
          <div className="fact-list-container">
            <ul className="fact-list">
              {recentFacts.map((fact, index) => (
                <li key={fact.id || index} className="fact-item">
                  <div className="fact-content">
                    <div className="fact-text">{fact.text}</div>
                    <div className="fact-meta">
                      <span className="fact-platform">{fact.platform}</span>
                      <span className="fact-time">{formatTime(fact.timestamp)}</span>
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => deleteSingleFact(fact.id)}
                    title="Delete this fact"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={checkBackendStatus}
        >
          Refresh Status
        </button>
        <button
          className="btn btn-danger"
          onClick={clearAllContext}
          disabled={contextCount === 0}
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default App;

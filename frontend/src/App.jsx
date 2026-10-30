import { useState } from 'react';
import Header from './components/Header';
import { checkHealth } from './services/api';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTestBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setApiStatus(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
      setApiStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <Header />
      <main>
        <h1>Welcome to Birds-Eye</h1>
        <p>Your fullstack application is configured and ready to build.</p>

        <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
          <h3>Backend API Connection Test</h3>
          <p>Click below to test connection to the Node.js API server (<code>GET /api/health</code>):</p>
          <button
            onClick={handleTestBackend}
            disabled={loading}
            style={{
              padding: '0.6rem 1.2rem',
              fontSize: '1rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Checking...' : 'Test Backend Connection'}
          </button>

          {apiStatus && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px' }}>
              <strong>Status:</strong> {apiStatus.status} <br />
              <strong>Message:</strong> {apiStatus.message} <br />
              <strong>Timestamp:</strong> {apiStatus.timestamp}
            </div>
          )}

          {error && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px' }}>
              <strong>Error:</strong> {error}
              <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Ensure your backend server is running with <code>npm run dev:backend</code>.
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { seedData, clearAllData } from '../firebase/seed';
import './Auth.css';

export default function SeedPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const isError = status.startsWith('Error');

  const handleSeed = async () => {
    setLoading(true);
    setStatus('Running seed...');
    try {
      await seedData();
      setStatus('Seed complete! You can now log in with the dev accounts.');
    } catch (e) {
      setStatus('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAndReseed = async () => {
    setLoading(true);
    setStatus('Clearing all shifts and attendance...');
    try {
      await clearAllData();
      setStatus('Cleared. Seeding fresh data...');
      await seedData();
      setStatus('Done! All data cleared and reseeded fresh.');
    } catch (e) {
      setStatus('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-header">
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🌱</span>
          <h1 style={{ fontSize: '1.3rem', color: '#1e3a5f', margin: '0 0 0.25rem' }}>Developer Seed</h1>
          <p>Populate Firebase with dummy data</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.7 }}>
            <p><strong>Accounts:</strong></p>
            <p>• Admin: admin@skyrouteco.com / Admin@123</p>
            <p>• Alice / Bob / Carol / Dan @skyrouteco.com / Employee@123</p>
            <p><strong>Data:</strong> Current week shifts + 2 weeks attendance history</p>
          </div>

          {status && (
            <div style={{
              background: isError ? '#fef2f2' : '#f0fdf4',
              color: isError ? '#dc2626' : '#16a34a',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {status}
            </div>
          )}

          <button className="btn-primary" onClick={handleSeed} disabled={loading}>
            {loading ? 'Working...' : 'Run Seed'}
          </button>

          <button
            onClick={handleClearAndReseed}
            disabled={loading}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '0.75rem',
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            🗑 Clear All Data & Reseed Fresh
          </button>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#92400e' }}>
            <strong>Warning:</strong> "Clear & Reseed" permanently deletes all shifts and attendance records. User accounts are kept.
          </div>

          <a href="/login" style={{ textAlign: 'center', fontSize: '0.875rem' }}>← Back to Login</a>
        </div>
      </div>
    </div>
  );
}

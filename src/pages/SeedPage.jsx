import { useState } from 'react';
import { seedData } from '../firebase/seed';
import './Auth.css';

export default function SeedPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🌱</span>
          <h1>Developer Seed</h1>
          <p>Populate Firebase with dummy data</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', lineHeight: 1.6 }}>
            <p><strong>This will create:</strong></p>
            <p>• Admin: admin@skyrouteco.com / Admin@123</p>
            <p>• Alice: alice@skyrouteco.com / Employee@123</p>
            <p>• Bob: bob@skyrouteco.com / Employee@123</p>
            <p>• Carol: carol@skyrouteco.com / Employee@123</p>
            <p>• Dan: dan@skyrouteco.com / Employee@123</p>
            <p>• Current week shifts + 2 weeks attendance history</p>
          </div>
          {status && (
            <div style={{ background: status.startsWith('Error') ? '#fef2f2' : '#f0fdf4', color: status.startsWith('Error') ? '#dc2626' : '#16a34a', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
              {status}
            </div>
          )}
          <button className="btn-primary" onClick={handleSeed} disabled={loading}>
            {loading ? 'Seeding...' : 'Run Seed'}
          </button>
          <a href="/login" style={{ textAlign: 'center', fontSize: '0.875rem' }}>← Back to Login</a>
        </div>
      </div>
    </div>
  );
}

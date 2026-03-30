import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profileDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (profileDoc.exists()) {
        const role = profileDoc.data().role;
        navigate(role === 'admin' ? '/admin' : '/employee');
      }
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Have you run the seed at /seed?');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password auth is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection.');
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.jpeg" alt="SkyRoute" className="auth-logo-img" />
          <p>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-footer">
          New employee? <Link to="/register">Create an account</Link>
        </div>
        <div className="dev-credentials">
          <p><strong>Dev Accounts:</strong></p>
          <p>Admin: admin@skyrouteco.com / Admin@123</p>
          <p>Employee: alice@skyrouteco.com / Employee@123</p>
        </div>
      </div>
    </div>
  );
}

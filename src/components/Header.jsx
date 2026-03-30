import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">✈</span>
        <span className="header-title">SkyRoute Schedule</span>
      </div>
      <nav className="header-nav">
        {userProfile?.role === 'admin' && (
          <>
            <Link to="/admin">Schedule</Link>
            <Link to="/admin/reports">Reports</Link>
          </>
        )}
        {userProfile?.role === 'employee' && (
          <Link to="/employee">My Dashboard</Link>
        )}
      </nav>
      <div className="header-user">
        <span className="header-username">{userProfile?.name}</span>
        <span className="header-role-badge">{userProfile?.role}</span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </header>
  );
}

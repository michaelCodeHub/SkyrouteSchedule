import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="header">
        <div className="header-brand">
          <img src="/logo.jpeg" alt="SkyRoute" className="header-logo-img" />
        </div>
        <nav className="header-nav">
          {userProfile?.role === 'admin' && (
            <>
              <Link to="/admin" className={isActive('/admin') ? 'active' : ''}>Schedule</Link>
              <Link to="/admin/reports" className={isActive('/admin/reports') ? 'active' : ''}>Reports</Link>
            </>
          )}
          {userProfile?.role === 'employee' && (
            <Link to="/employee" className={isActive('/employee') ? 'active' : ''}>My Dashboard</Link>
          )}
        </nav>
        <div className="header-user">
          <span className="header-username">{userProfile?.name}</span>
          <span className="header-role-badge">{userProfile?.role}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      {/* Mobile bottom nav — only shown on small screens */}
      {userProfile && (
        <nav className="bottom-nav">
          {userProfile.role === 'admin' && (
            <>
              <Link to="/admin" className={`bottom-nav-item ${isActive('/admin') ? 'bottom-nav-active' : ''}`}>
                <span className="bottom-nav-icon">📅</span>
                <span className="bottom-nav-label">Schedule</span>
              </Link>
              <Link to="/admin/reports" className={`bottom-nav-item ${isActive('/admin/reports') ? 'bottom-nav-active' : ''}`}>
                <span className="bottom-nav-icon">📊</span>
                <span className="bottom-nav-label">Reports</span>
              </Link>
              <button onClick={handleLogout} className="bottom-nav-item bottom-nav-logout">
                <span className="bottom-nav-icon">🚪</span>
                <span className="bottom-nav-label">Logout</span>
              </button>
            </>
          )}
          {userProfile.role === 'employee' && (
            <>
              <Link to="/employee" className={`bottom-nav-item ${isActive('/employee') ? 'bottom-nav-active' : ''}`}>
                <span className="bottom-nav-icon">🏠</span>
                <span className="bottom-nav-label">Dashboard</span>
              </Link>
              <button onClick={handleLogout} className="bottom-nav-item bottom-nav-logout">
                <span className="bottom-nav-icon">🚪</span>
                <span className="bottom-nav-label">Logout</span>
              </button>
            </>
          )}
        </nav>
      )}
    </>
  );
}

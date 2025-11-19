import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Home } from './pages/Home';
import { Doctor } from './pages/Doctor';
// import { Receptionist } from './pages/Receptionist';
import { User } from './pages/User'; 
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';


function Navigation() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: '100%',
      gap: '15px',
      position: 'relative'
    }}>
      {/* Navigation buttons */}
      <Link 
        to="/" 
        className={`btn ${isActive('/') ? '' : 'btn-outline'}`}
        style={{ 
          padding: '8px 14px',
          backgroundColor: isActive('/') ? 'var(--btn-bg)' : 'transparent',
        }}
      >
        Home
      </Link>

      {/*
      <Link 
        to="/receptionist" 
        className={`btn ${isActive('/receptionist') ? '' : 'btn-outline'}`}
        style={{ 
          padding: '8px 14px',
          backgroundColor: isActive('/receptionist') ? 'var(--btn-bg)' : 'transparent',
        }}
      >
        Receptionist
      </Link>
      */}

      {/** User Page button disabled **/}
      {false && (
        <Link 
          to="/user" 
          className={`btn ${isActive('/user') ? '' : 'btn-outline'}`}
          style={{ 
            padding: '8px 14px',
            backgroundColor: isActive('/user') ? 'var(--btn-bg)' : 'transparent',
          }}
        >
          User Page
        </Link>
      )}
      
      <Link 
        to="/doctor" 
        className={`btn ${isActive('/doctor') ? '' : 'btn-outline'}`}
        style={{ 
          padding: '8px 14px',
          backgroundColor: isActive('/doctor') ? 'var(--btn-bg)' : 'transparent',
        }}
      >
        Doctor Page
      </Link>

      {/* Account Dropdown */}
      {isAuthenticated && user && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="btn btn-outline"
            style={{ 
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {user.picture && (
              <img 
                src={user.picture} 
                alt={user.name}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}
              />
            )}
            <span>Account</span>
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>

          {/* Dropdown Menu */}
          {showAccountDropdown && (
            <>
              {/* Backdrop to close dropdown when clicking outside */}
              <div
                onClick={() => setShowAccountDropdown(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 998
                }}
              />
              
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                backgroundColor: 'var(--card-bg)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                minWidth: '280px',
                zIndex: 999,
                padding: '16px',
                animation: 'slideDown 0.2s ease-out'
              }}>
                {/* User Info Section */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '16px'
                }}>
                  {user.picture && (
                    <img 
                      src={user.picture} 
                      alt={user.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255, 255, 255, 0.2)'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '16px',
                      marginBottom: '4px',
                      color: 'var(--text-color)'
                    }}>
                      {user.name}
                    </div>
                    <div style={{ 
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      wordBreak: 'break-word'
                    }}>
                      {user.email}
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px'
                  }}>
                    Account Details
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Email</div>
                      <div style={{ color: 'var(--text-color)' }}>{user.email}</div>
                    </div>
                    
                    <div style={{
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>Name</div>
                      <div style={{ color: 'var(--text-color)' }}>{user.name}</div>
                    </div>

                    
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setShowAccountDropdown(false);
                    logout();
                  }}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontWeight: '500'
                  }}
                >
                  Logout
                </button>
              </div>

              <style>{`
                @keyframes slideDown {
                  from {
                    opacity: 0;
                    transform: translateY(-10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function App() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className="container">
      {!isLoginPage && (
        <header className="header">
          <h1 style={{ margin: 0 }}>
            <Link to="/" className="brand"></Link>
          </h1>
          <Navigation />
        </header>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/doctor" element={
          <ProtectedRoute>
            <Doctor />
          </ProtectedRoute>
        } />
        {/* <Route path="/receptionist" element={<Receptionist />} /> */}
        {/* <Route path="/user" element={<User />} /> */}
      </Routes>
    </div>
  );
}

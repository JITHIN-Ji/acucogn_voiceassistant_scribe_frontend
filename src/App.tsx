import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Doctor } from './pages/Doctor';
// import { Receptionist } from './pages/Receptionist';
import { User } from './pages/User'; 

function Navigation() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="row" style={{ gap: '20px' }}>
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
    </div>
  );
}

export function App() {
  return (
    <div className="container">
      <header className="header">
        <h1 style={{ margin: 0 }}>
          <Link to="/" className="brand"></Link>
        </h1>
        <Navigation />
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doctor" element={<Doctor />} />
        {/* <Route path="/receptionist" element={<Receptionist />} /> */}
        {/* <Route path="/user" element={<User />} /> */}
      </Routes>
    </div>
  );
}

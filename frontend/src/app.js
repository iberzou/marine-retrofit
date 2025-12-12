import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './app.css';

// Import pages
import Login from './components/login';
import Dashboard from './components/dashboard';
import Projects from './pages/projects';
import Tasks from './pages/tasks';  
import Blueprints from './components/blueprints';
import Settings from './components/settings';
import Reports from './components/reports';

// Import new pages
import Inventory from './pages/inventory';
import Calendar from './pages/calendar';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [theme, setTheme] = React.useState('light');

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    
    setTheme(savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />;
  }

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <h2>Marine Retrofit</h2>
          </div>
          
          <div className="user-info">
            <div className="avatar">{user?.full_name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <p className="name">{user?.full_name}</p>
              <p className="role">{user?.role}</p>
            </div>
          </div>

          <ul className="nav-links">
            <li>
              <Link to="/dashboard">
                <span className="icon">📊</span>
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/projects">
                <span className="icon">🚢</span>
                Projects
              </Link>
            </li>
            <li>
              <Link to="/tasks">
                <span className="icon">✓</span>
                Tasks
              </Link>
            </li>
            <li>
              <Link to="/calendar">
                <span className="icon">📅</span>
                Schedule
              </Link>
            </li>
            <li>
              <Link to="/inventory">
                <span className="icon">📦</span>
                Inventory
              </Link>
            </li>
            <li>
              <Link to="/blueprints">
                <span className="icon">📄</span>
                Blueprints
              </Link>
            </li>
            <li>
              <Link to="/reports">
                <span className="icon">📈</span>
                Reports
              </Link>
            </li>
            <li>
              <Link to="/settings">
                <span className="icon">⚙️</span>
                Settings
              </Link>
            </li>
          </ul>

          <button onClick={handleLogout} className="logout-btn">
            <span className="icon">🚪</span>
            Logout
          </button>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/blueprints" element={<Blueprints />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings onThemeChange={handleThemeChange} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
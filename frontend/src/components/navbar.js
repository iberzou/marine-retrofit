import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/dashboard" className="navbar-brand">
          Marine Retrofit
        </Link>
        
        <ul className="navbar-nav">
          <li>
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/projects" className={`nav-link ${isActive('/projects')}`}>
              Projects
            </Link>
          </li>
          <li>
            <Link to="/tasks" className={`nav-link ${isActive('/tasks')}`}>
              Tasks
            </Link>
          </li>
          <li>
            <Link to="/inventory" className={`nav-link ${isActive('/inventory')}`}>
              Inventory
            </Link>
          </li>
          <li>
            <span className="nav-link" style={{cursor: 'default'}}>
              {user?.full_name || user?.username}
            </span>
          </li>
          <li>
            <button onClick={onLogout} className="btn btn-secondary">
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
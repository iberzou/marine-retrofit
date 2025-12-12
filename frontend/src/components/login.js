import React, { useState } from 'react';
import axios from 'axios';
import { getErrorMessage } from '../utils/errorHandler';
import '../styles/login.css';

const API_BASE_URL = 'http://localhost:8000/api';

function Login({ setIsAuthenticated, setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('technician');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/token`, formData);
      
      // Store token
      localStorage.setItem('token', response.data.access_token);
      
      // Get user info
      const userResponse = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${response.data.access_token}` }
      });
      
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      setUser(userResponse.data);
      setIsAuthenticated(true);
      try { window.location.assign('/dashboard'); } catch (e) { window.location.href = '/dashboard'; }
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const registerData = {
        username,
        email,
        password,
        full_name: fullName,
        phone: phone || null,
        role
      };

      await axios.post(`${API_BASE_URL}/register`, registerData);
      
      setSuccess('Registration successful! Please login.');
      // Clear form
      setUsername('');
      setPassword('');
      setEmail('');
      setFullName('');
      setPhone('');
      setRole('technician');
      
      // Switch to login mode after 2 seconds
      setTimeout(() => {
        setIsLogin(true);
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setUsername('');
    setPassword('');
    setEmail('');
    setFullName('');
    setPhone('');
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Marine Retrofit</h1>
          <p>Project Management System</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
            type="button"
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
            type="button"
          >
            Register
          </button>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Choose a username"
              />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Choose a password"
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label>Phone (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group">
              <label>Role *</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="technician">Technician</option>
                <option value="engineer">Engineer</option>
                <option value="project_manager">Project Manager</option>
              </select>
              <small>Note: Admin role can only be assigned by existing admins</small>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}

        {isLogin && (
          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Username: admin</p>
            <p>Password: admin123</p>
          </div>
        )}

        <div className="switch-mode">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={switchMode} className="link">
              {isLogin ? 'Register here' : 'Login here'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
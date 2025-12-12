import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/settings.css';

const API_BASE_URL = 'http://localhost:8000/api';

function Settings({ onThemeChange }) {
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD',
    notifications_enabled: true,
    email_notifications: true,
    items_per_page: 10
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [userInfo, setUserInfo] = useState(null);

  const token = localStorage.getItem('token');
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    fetchSettings();
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me`, config);
      setUserInfo(response.data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/me`, config);
      setSettings(response.data);
      // Apply theme from saved settings
      if (response.data.theme && onThemeChange) {
        onThemeChange(response.data.theme);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Apply theme immediately when changed
    if (name === 'theme' && onThemeChange) {
      onThemeChange(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.put(`${API_BASE_URL}/settings/me`, settings, config);
      setMessage('Settings saved successfully!');
      
      // Apply theme
      if (onThemeChange) {
        onThemeChange(settings.theme);
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving settings: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all settings to defaults?')) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_BASE_URL}/settings/reset`, {}, config);
      setSettings(response.data);
      if (onThemeChange) {
        onThemeChange(response.data.theme || 'light');
      }
      setMessage('Settings reset to defaults!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error resetting settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <h1>User Settings</h1>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {userInfo && (
        <div className="user-info-card">
          <h2>User Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Username:</label>
              <span>{userInfo.username}</span>
            </div>
            <div className="info-item">
              <label>Full Name:</label>
              <span>{userInfo.full_name}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{userInfo.email}</span>
            </div>
            <div className="info-item">
              <label>Role:</label>
              <span className={`role-badge ${userInfo.role}`}>{userInfo.role}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span>{userInfo.phone || 'Not set'}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={userInfo.is_active ? 'status-active' : 'status-inactive'}>
                {userInfo.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-section">
          <h3>Appearance</h3>
          
          <div className="form-group">
            <label htmlFor="theme">Theme</label>
            <select 
              id="theme"
              name="theme" 
              value={settings.theme} 
              onChange={handleChange}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
            <small>Choose your preferred color theme - changes apply immediately</small>
          </div>
        </div>

        <div className="settings-section">
          <h3>Localization</h3>
          
          <div className="form-group">
            <label htmlFor="language">Language</label>
            <select 
              id="language"
              name="language" 
              value={settings.language} 
              onChange={handleChange}
            >
              <option value="en">English</option>
              <option value="es">Spanish (Coming Soon)</option>
              <option value="fr">French (Coming Soon)</option>
              <option value="de">German (Coming Soon)</option>
              <option value="ar">Arabic (Coming Soon)</option>
            </select>
            <small style={{ color: '#ff9800' }}>
              Note: Multi-language support is currently in development. Only English is fully supported at this time.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select 
              id="timezone"
              name="timezone" 
              value={settings.timezone} 
              onChange={handleChange}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Dubai">Dubai</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="date_format">Date Format</label>
            <select 
              id="date_format"
              name="date_format" 
              value={settings.date_format} 
              onChange={handleChange}
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY (31.12.2024)</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>Notifications</h3>
          <small style={{ 
            display: 'block', 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '16px',
            border: '1px solid #ffeaa7'
          }}>
            ⚠️ <strong>Note:</strong> This feature is currently under development. Notification settings will be functional in a future release.
          </small>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="notifications_enabled"
                checked={settings.notifications_enabled}
                onChange={handleChange}
              />
              <span>Enable Notifications</span>
            </label>
            <small>Receive in-app notifications for updates</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="email_notifications"
                checked={settings.email_notifications}
                onChange={handleChange}
              />
              <span>Email Notifications</span>
            </label>
            <small>Receive email alerts for important updates</small>
          </div>
        </div>

        <div className="settings-section">
          <h3>Display Preferences</h3>
          
          <div className="form-group">
            <label htmlFor="items_per_page">Items Per Page</label>
            <select 
              id="items_per_page"
              name="items_per_page" 
              value={settings.items_per_page} 
              onChange={handleChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <small>Number of items to display per page in lists</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-save">
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button 
            type="button" 
            onClick={handleReset} 
            disabled={loading}
            className="btn-reset"
          >
            Reset to Defaults
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
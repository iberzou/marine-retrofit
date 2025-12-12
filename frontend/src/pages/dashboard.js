import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '24px' }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: 'var(--sea-green)', fontSize: '36px', marginBottom: '8px' }}>
            {stats?.pending_tasks || 0}
          </h3>
          <p style={{ color: 'var(--dark-gray)', fontSize: '14px' }}>Pending Tasks</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: 'var(--sea-green)', fontSize: '36px', marginBottom: '8px' }}>
            {stats?.completed_tasks || 0}
          </h3>
          <p style={{ color: 'var(--dark-gray)', fontSize: '14px' }}>Completed Tasks</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: 'var(--sea-green)', fontSize: '36px', marginBottom: '8px' }}>
            {stats?.total_inventory || 0}
          </h3>
          <p style={{ color: 'var(--dark-gray)', fontSize: '14px' }}>Inventory Items</p>
          {stats?.low_stock_items > 0 && (
            <p style={{ color: 'var(--error-red)', fontSize: '18px', marginTop: '8px' }}>
              {stats.low_stock_items} Low Stock
            </p>
          )}
        </div>
      </div>

    

      {stats?.low_stock_items > 0 && (
        <div className="alert alert-warning" style={{ marginTop: '20px' }}>
          <strong>Warning:</strong> You have {stats.low_stock_items} inventory item(s) running low on stock. 
          <a href="/inventory" style={{ color: 'var(--navy-blue)', marginLeft: '8px' }}>View Inventory</a>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { projectsAPI, tasksAPI, inventoryAPI } from '../api';

const API_BASE_URL = 'http://localhost:8000/api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});

  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const computeScopedStats = (allProjects, allTasks, user) => {
    if (!user) return { total_projects: 0, total_tasks: 0, completed_tasks: 0 };

    const uid = user.user_id;
    const role = user.role;

    const assignedList = (p) => {
      // Normalize to an array of numeric user_ids
      const raw = Array.isArray(p.assigned_users) ? p.assigned_users
                : (Array.isArray(p.assigned_user_ids) ? p.assigned_user_ids : []);
      return raw.map(x => {
        if (typeof x === 'number') return x;
        if (typeof x === 'string') {
          const n = parseInt(x, 10);
          return Number.isNaN(n) ? x : n;
        }
        // object form { user_id, ... }
        if (x && typeof x === 'object' && 'user_id' in x) return x.user_id;
        return x;
      }).filter(v => typeof v === 'number');
    };

    let projectIds = [];
    if (role === 'technician' || role === 'engineer') {
      projectIds = (allProjects || [])
        .filter(p => assignedList(p).includes(uid))
        .map(p => p.project_id);
    } else if (role === 'project_manager') {
      projectIds = (allProjects || [])
        .filter(p => p.created_by === uid)
        .map(p => p.project_id);
    } else {
      // admin sees all
      projectIds = (allProjects || []).map(p => p.project_id);
    }

    const tasksInScope = (allTasks || []).filter(t => projectIds.includes(t.project_id));

    let myTasks = tasksInScope;
    if (role === 'technician' || role === 'engineer') {
      myTasks = tasksInScope.filter(t => t.assigned_to === uid);
    }

    const completed = myTasks.filter(t => String(t.status || '').toLowerCase() === 'completed').length;
    const pending = myTasks.filter(t => String(t.status || '').toLowerCase() !== 'completed').length;
    const totalProjects = Array.from(new Set(projectIds)).length;

    return { total_projects: totalProjects, total_tasks: pending, completed_tasks: completed };
  };

  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login', { replace: true }); return; }

      if (user && (user.role === 'technician' || user.role === 'engineer' || user.role === 'project_manager')) {
        const [projectsRes, tasksRes, lowStockRes] = await Promise.all([
          projectsAPI.getAll(),
          tasksAPI.getAll(),
          inventoryAPI.getLowStock().catch(() => ({ data: [] }))
        ]);
        const lowStock = Array.isArray(lowStockRes.data) ? lowStockRes.data.length : (lowStockRes.data?.count ?? 0);
        const scoped = computeScopedStats(projectsRes.data, tasksRes.data, user);
        setStats(prev => ({ ...prev, ...scoped, low_stock_items: lowStock }));
      } else {
        const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const lowStockRes = await inventoryAPI.getLowStock().catch(() => ({ data: [] }));
        const lowStock = Array.isArray(lowStockRes.data) ? lowStockRes.data.length : (lowStockRes.data?.count ?? 0);
        setStats({ ...response.data, low_stock_items: lowStock });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({ total_projects: 0, total_tasks: 0, completed_tasks: 0, low_stock_items: 0 });
    }
  }, [navigate, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

    

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#1e3a5f', marginBottom: '2rem' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Projects</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e3a5f' }}>{stats.total_projects || 0}</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Pending Tasks</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff8c42' }}>
            {stats.total_tasks || 0}
          </p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Completed Tasks</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{stats.completed_tasks || 0}</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Low Stock Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>{stats.low_stock_items || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
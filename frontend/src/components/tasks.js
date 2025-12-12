import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/tasks.css';

const API_BASE_URL = 'http://localhost:8000/api';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUserRole();
    fetchTasks();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const markTaskDone = async (taskId) => {
    try {
      await axios.patch(`${API_BASE_URL}/tasks/${taskId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks(); // Refresh the task list
    } catch (error) {
      console.error('Error marking task as done:', error);
      alert(error.response?.data?.detail || 'Failed to mark task as done');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#20b2aa';
      case 'pending': return '#ffc107';
      case 'blocked': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Separate tasks based on type
  const regularTasks = tasks.filter(task => !task.is_maintenance);
  const maintenanceTasks = tasks.filter(task => task.is_maintenance);

  // Admins, project managers, engineers and technicians can mark tasks done (backend also enforces permissions)
  const canMarkDone = ['admin', 'project_manager', 'engineer', 'technician'].includes(userRole);
  const showActions = ['admin', 'project_manager'].includes(userRole);

  const renderTaskTable = (taskList, title) => (
    <div className="tasks-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ color: '#1e3a5f', marginBottom: '1rem' }}>{title}</h2>
      {taskList.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No {title.toLowerCase()} found</p>
      ) : (
        <div className="table-wrapper">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                {canMarkDone && <th>Done</th>}
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {taskList.map(task => (
                <tr key={task.task_id} className={task.status === 'completed' ? 'task-completed' : ''}>
                  <td className="task-name">{task.task_name}</td>
                  <td className="task-meta">
                    <span style={{
                      backgroundColor: getStatusBadgeColor(task.status),
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '15px',
                      fontSize: '0.875rem'
                    }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="task-meta">
                    <span style={{
                      backgroundColor: getPriorityBadgeColor(task.priority),
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '15px',
                      fontSize: '0.875rem'
                    }}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="task-meta">{task.due_date || 'N/A'}</td>
                  {canMarkDone && (
                    <td className="complete-cell">
                      {task.status !== 'completed' ? (
                        <button
                          onClick={async () => {
                            const proceed = window.confirm('Mark this task as completed? This action cannot be undone. Are you sure you want to proceed?');
                            if (!proceed) return;
                            await markTaskDone(task.task_id);
                          }}
                          className="btn btn-primary"
                        >
                          Complete
                        </button>
                      ) : (
                        <span style={{ color: '#28a745', fontSize: '1.1rem' }}>✓ Completed</span>
                      )}
                    </td>
                  )}
                  {showActions && (
                    <td className="actions-cell">
                      <button
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer'
                        }}
                        onClick={() => window.location.href = `/tasks/${task.task_id}`}
                      >
                        View Details
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="tasks-page">
      <h1 className="tasks-title">Tasks</h1>
      {userRole === 'engineer' || userRole === 'technician' ? (
        <>
          {renderTaskTable(regularTasks, 'Regular Tasks')}
          {renderTaskTable(maintenanceTasks, 'Maintenance Tasks')}
        </>
      ) : (
        renderTaskTable(tasks, 'All Tasks')
      )}
    </div>
  );
}

export default Tasks;
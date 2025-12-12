import React, { useState, useEffect } from 'react';
import { tasksAPI, projectsAPI, usersAPI } from '../api';
import { getErrorMessage } from '../utils/errorHandler';
import '../styles/tasks.css';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showMaintenanceOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    project_id: '',
    task_name: '',
    description: '',
    assigned_to: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    is_maintenance: false,
  });

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    
    fetchProjects();
    fetchTasks();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (filterProject) {
      fetchTasks(filterProject);
    } else {
      fetchTasks();
    }
  }, [filterProject]);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (err) {
      console.error('Failed to load projects');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchTasks = async (projectId = null) => {
    try {
      const response = await tasksAPI.getAll(projectId);
      setTasks(response.data);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If project is changed, clear the assigned_to field
    if (name === 'project_id') {
      setFormData({
        ...formData,
        [name]: value,
        assigned_to: '', // Reset assignment when project changes
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Prepare submit data. Do NOT override priority when is_maintenance is checked.
      // Persist is_maintenance to the backend (backend schema supports it).
      const submitData = {
        ...formData,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        project_id: parseInt(formData.project_id),
        due_date: formData.due_date || null,
        description: formData.description || null,
      };

      if (editingTask) {
        await tasksAPI.update(editingTask.task_id, submitData);
      } else {
        await tasksAPI.create(submitData);
      }
      fetchTasks();
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err, 'Operation failed'));
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    // Determine if task is maintenance based on explicit flag from backend
    const isMaintenance = !!task.is_maintenance;
    setFormData({
      project_id: task.project_id,
      task_name: task.task_name,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      is_maintenance: isMaintenance,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await tasksAPI.delete(id);
        fetchTasks();
      } catch (err) {
        setError('Failed to delete task');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      task_name: '',
      description: '',
      assigned_to: '',
      status: 'pending',
      priority: 'medium',
      due_date: '',
      is_maintenance: false,
    });
    setEditingTask(null);
    setShowForm(false);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'planning',
      in_progress: 'in-progress',
      completed: 'completed',
      blocked: 'cancelled',
    };
    return <span className={`badge badge-${statusMap[status]}`}>{status.replace('_', ' ').toUpperCase()}</span>;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'var(--success-green)',
      medium: 'var(--warning-orange)',
      high: 'var(--error-red)',
      critical: 'var(--error-red)',
    };
    return colors[priority] || 'var(--dark-gray)';
  };

  const getUserName = (task) => {
    // Use the assigned_to_name from the API response if available
    if (task.assigned_to_name) {
      return task.assigned_to_name;
    }
    // Fallback to looking up in users array (for backwards compatibility)
    if (!task.assigned_to) return 'Unassigned';
    const user = users.find(u => u.user_id === task.assigned_to);
    return user ? user.full_name : 'Unknown';
  };

  const getProjectName = (task) => {
    // Use the project_name from the API response if available
    if (task.project_name) {
      return task.project_name;
    }
    // Fallback to looking up in projects array (for backwards compatibility)
    const project = projects.find(p => p.project_id === task.project_id);
    return project ? project.project_name : 'Unknown';
  };

  const canMarkComplete = (task) => {
    if (!currentUser) return false;
    const role = currentUser.role;
    if (role === 'admin' || role === 'project_manager') return true;
    if ((role === 'engineer' || role === 'technician') && task.assigned_to === currentUser.user_id) return true;
    return false;
  };

  // Get users assignable to the selected project
  // Only show users who are part of the selected project's team
  const getAssignableUsers = () => {
    if (!formData.project_id) {
      // If no project is selected, return empty array
      return [];
    }

    // Find the selected project
    const selectedProject = projects.find(p => p.project_id === parseInt(formData.project_id));
    
    if (!selectedProject || !selectedProject.team_members) {
      // If project not found or has no team members, return empty array
      return [];
    }

    // Return the team members of the selected project
    // team_members already includes user_id, full_name, and role
    return selectedProject.team_members;
  };

  const assignableUsers = getAssignableUsers();

  const canCreateTask = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');
  const canDeleteTask = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');

  // Filter tasks based on user role and filters
  const getFilteredTasks = () => {
    let filtered = [...tasks];

    // Apply role-based filtering
    if (currentUser) {
      const role = currentUser.role;
      if (role === 'engineer' || role === 'technician') {
        // Engineers and technicians only see tasks assigned to them
        filtered = filtered.filter(task => task.assigned_to === currentUser.user_id);
      }
    }

    // Apply maintenance filter
    if (showMaintenanceOnly) {
      filtered = filtered.filter(task => task.is_maintenance);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <div className="container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Tasks</h1>
        {canCreateTask && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && canCreateTask && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Task Information */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Project *</label>
              <select
                name="project_id"
                className="form-input"
                value={formData.project_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Task Name *</label>
              <input
                type="text"
                name="task_name"
                className="form-input"
                value={formData.task_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Description</label>
              <textarea
                name="description"
                className="form-input"
                rows="3"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Assignment and Status Section */}
            <div style={{ 
              borderTop: '1px solid var(--light-gray)', 
              paddingTop: '24px', 
              marginTop: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--navy-blue)' }}>
                Assignment & Status
              </h3>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Assigned To</label>
                {!formData.project_id ? (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '6px',
                    color: 'var(--dark-gray)',
                    fontSize: '14px',
                    border: '1px solid var(--light-gray)'
                  }}>
                    ℹ️ Please select a project first to see available team members
                  </div>
                ) : assignableUsers.length === 0 ? (
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#fff3cd', 
                    borderRadius: '6px',
                    color: '#856404',
                    fontSize: '14px',
                    border: '1px solid #ffeaa7'
                  }}>
                    ⚠️ No team members assigned to this project yet. Add team members to the project first.
                  </div>
                ) : (
                  <select
                    name="assigned_to"
                    className="form-input"
                    value={formData.assigned_to}
                    onChange={handleChange}
                  >
                    <option value="">Unassigned</option>
                    {assignableUsers.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.full_name} ({user.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-input"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <div style={{ 
                marginBottom: '20px', 
                padding: '12px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '6px',
                border: '1px solid var(--light-gray)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    name="is_maintenance"
                    checked={formData.is_maintenance}
                    onChange={handleChange}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Mark as Maintenance Task</span>
                </label>
                <small style={{ color: 'var(--dark-gray)', marginTop: '4px', display: 'block', marginLeft: '24px' }}>
                  Maintenance tasks are flagged with a special indicator and can be filtered
                </small>
              </div>
            </div>

            {/* Priority and Due Date Section */}
            <div style={{ 
              borderTop: '1px solid var(--light-gray)', 
              paddingTop: '24px', 
              marginTop: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--navy-blue)' }}>
                Priority & Timeline
              </h3>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Priority</label>
                <select
                  name="priority"
                  className="form-input"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  className="form-input"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
              <button type="submit" className="btn btn-primary">
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar" style={{ marginBottom: '24px' }}>
        <div className="filter-item" style={{ minWidth: '180px' }}>
          <label className="filter-label">Project</label>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="form-select"
          >
          <option value="">All Projects</option>
          {projects.map((project) => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </option>
          ))}
          </select>
        </div>

        <div className="filter-item" style={{ minWidth: '150px' }}>
          <label className="filter-label">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select"
          >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          </select>
        </div>

      </div>

      {filteredTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ color: 'var(--dark-gray)' }}>No tasks found</h3>
          {canCreateTask ? (
            <p>Click "New Task" to create your first task</p>
          ) : (
            <p>No tasks assigned to you yet</p>
          )}
        </div>
      ) : (
        <div className="card">
          {/* Horizontal scroll wrapper */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="tasks-table" style={{ width: '100%', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '200px' }}>Task</th>
                  <th style={{ minWidth: '150px' }}>Project</th>
                  <th style={{ minWidth: '130px' }}>Assigned To</th>
                  <th style={{ minWidth: '120px' }}>Status</th>
                  <th style={{ minWidth: '100px' }}>Priority</th>
                  <th style={{ minWidth: '120px' }}>Due Date</th>
                  <th style={{ minWidth: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.task_id} className={task.status === 'completed' ? 'task-completed' : ''}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {task.is_maintenance && (
                          <span style={{ 
                            backgroundColor: 'var(--error-red)', 
                            color: '#ffffff', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}>
                            MAINT
                          </span>
                        )}
                        <div>
                          <strong>{task.task_name}</strong>
                          {task.description && (
                            <div style={{ fontSize: '12px', color: 'var(--dark-gray)', marginTop: '4px' }}>
                              {task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{getProjectName(task)}</td>
                    <td>{getUserName(task)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>
                      <span style={{ color: getPriorityColor(task.priority), fontWeight: 'bold', fontSize: '13px' }}>
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="actions-cell">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!canCreateTask ? (
                          // Engineers and technicians can only mark tasks as complete
                          <>
                            {task.status !== 'completed' && (
                              <button
                                onClick={async () => {
                                  const proceed = window.confirm('Mark this task as completed?');
                                  if (!proceed) return;
                                  try {
                                    await tasksAPI.update(task.task_id, { status: 'completed' });
                                    fetchTasks();
                                  } catch (err) {
                                    setError(getErrorMessage(err, 'Failed to mark task as completed'));
                                  }
                                }}
                                className="btn btn-success"
                                style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                              >
                                Complete
                              </button>
                            )}
                            {task.status === 'completed' && (
                              <span style={{ color: 'var(--sea-green)', fontSize: '13px', fontWeight: '500' }}>
                                ✓ Completed
                              </span>
                            )}
                          </>
                        ) : (
                          // Admins and project managers can edit the full task
                          <>
                            <button onClick={() => handleEdit(task)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                              Edit
                            </button>
                            {canDeleteTask && (
                              <button onClick={() => handleDelete(task.task_id)} className="btn btn-delete" style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                Delete
                              </button>
                            )}
                            {canMarkComplete(task) && task.status !== 'completed' && (
                              <button
                                onClick={async () => {
                                  const proceed = window.confirm('Mark this task as completed? This action will set the task status to Completed. Are you sure?');
                                  if (!proceed) return;
                                  try {
                                    await tasksAPI.update(task.task_id, { status: 'completed' });
                                    fetchTasks();
                                  } catch (err) {
                                    setError(getErrorMessage(err, 'Failed to mark task as completed'));
                                  }
                                }}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                              >
                                Complete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
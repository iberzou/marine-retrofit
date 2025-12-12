import React, { useState, useEffect } from 'react';
import { projectsAPI, usersAPI } from '../api';
import { getErrorMessage } from '../utils/errorHandler';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    vessel_name: '',
    vessel_type: '',
    owner_name: '',
    status: 'planning',
    start_date: '',
    end_date: '',
    budget: '',
    spending: '',
    assigned_user_ids: [],
  });

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
      // Don't show error to user, just log it
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUserSelection = (userId) => {
    const currentIds = formData.assigned_user_ids || [];
    if (currentIds.includes(userId)) {
      setFormData({
        ...formData,
        assigned_user_ids: currentIds.filter(id => id !== userId),
      });
    } else {
      setFormData({
        ...formData,
        assigned_user_ids: [...currentIds, userId],
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Clean the form data: convert empty strings to null for optional fields
      // Handle numeric fields specially to preserve 0 values
      const cleanedData = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget === '' || formData.budget === null ? null : parseFloat(formData.budget),
        spending: formData.spending === '' || formData.spending === null ? null : parseFloat(formData.spending),
        vessel_name: formData.vessel_name || null,
        vessel_type: formData.vessel_type || null,
        owner_name: formData.owner_name || null,
        description: formData.description || null,
      };

      if (editingProject) {
        await projectsAPI.update(editingProject.project_id, cleanedData);
      } else {
        await projectsAPI.create(cleanedData);
      }
      fetchProjects();
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err, 'Operation failed'));
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      project_name: project.project_name,
      description: project.description || '',
      vessel_name: project.vessel_name || '',
      vessel_type: project.vessel_type || '',
      owner_name: project.owner_name || '',
      status: project.status,
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      end_date: project.end_date ? project.end_date.split('T')[0] : '',
      budget: project.budget || '',
      spending: project.spending || '',
      assigned_user_ids: project.assigned_users || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectsAPI.delete(id);
        fetchProjects();
      } catch (err) {
        setError('Failed to delete project');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      description: '',
      vessel_name: '',
      vessel_type: '',
      owner_name: '',
      status: 'planning',
      start_date: '',
      end_date: '',
      budget: '',
      spending: '',
      assigned_user_ids: [],
    });
    setEditingProject(null);
    setShowForm(false);
  };

  const getStatusBadge = (status) => {
    return <span className={`badge badge-${status.replace('_', '-')}`}>{status.replace('_', ' ').toUpperCase()}</span>;
  };

  const canCreateProject = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');
  const canEditProject = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');

  const getUserName = (userId) => {
    if (!userId) return 'N/A';
    const user = users.find(u => u.user_id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  // Filter users for assignment: only engineers and technicians can be assigned
  const getAssignableUsers = () => {
    return users.filter(user => 
      user.role === 'engineer' || user.role === 'technician'
    );
  };

  const assignableUsers = getAssignableUsers();

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
        <h1>Projects</h1>
        {canCreateProject && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && canCreateProject && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ marginBottom: '24px' }}>
            <h2 className="card-title">{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Project Information */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                name="project_name"
                className="form-input"
                value={formData.project_name}
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

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Status</label>
              <select
                name="status"
                className="form-input"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Vessel Information Section */}
            <div style={{ 
              borderTop: '1px solid var(--light-gray)', 
              paddingTop: '24px', 
              marginTop: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--navy-blue)' }}>
                Vessel Information
              </h3>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Vessel Name</label>
                <input
                  type="text"
                  name="vessel_name"
                  className="form-input"
                  value={formData.vessel_name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Vessel Type</label>
                <input
                  type="text"
                  name="vessel_type"
                  className="form-input"
                  placeholder="e.g., Cargo Ship, Tanker, Container Ship"
                  value={formData.vessel_type}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Owner Name</label>
                <input
                  type="text"
                  name="owner_name"
                  className="form-input"
                  value={formData.owner_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Timeline and Budget Section */}
            <div style={{ 
              borderTop: '1px solid var(--light-gray)', 
              paddingTop: '24px', 
              marginTop: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--navy-blue)' }}>
                Timeline & Budget
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Budget ($) <span style={{ color: 'var(--dark-gray)', fontWeight: 'normal', fontSize: '12px' }}>(Optional)</span></label>
                <input
                  type="number"
                  name="budget"
                  className="form-input"
                  value={formData.budget}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Enter total budget"
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Project Spending ($) <span style={{ color: 'var(--dark-gray)', fontWeight: 'normal', fontSize: '12px' }}>(Optional)</span></label>
                <input
                  type="number"
                  name="spending"
                  className="form-input"
                  value={formData.spending}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Leave blank if not tracked yet"
                />
                <small style={{ color: 'var(--dark-gray)', marginTop: '4px', display: 'block' }}>
                  Current spending on this project. Can be updated later.
                </small>
              </div>
            </div>

            {/* Team Assignment Section */}
            <div style={{ 
              borderTop: '1px solid var(--light-gray)', 
              paddingTop: '24px', 
              marginTop: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'var(--navy-blue)' }}>
                Team Assignment
              </h3>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Assign Team Members (Engineers & Technicians)</label>
                <div style={{ 
                  border: '1px solid var(--light-gray)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: 'white'
                }}>
                  {assignableUsers.length === 0 ? (
                    <p style={{ color: 'var(--dark-gray)', margin: 0 }}>No engineers or technicians available</p>
                  ) : (
                    assignableUsers.map(user => (
                      <div key={user.user_id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '4px',
                        backgroundColor: formData.assigned_user_ids.includes(user.user_id) ? '#e8f5f1' : 'transparent'
                      }}>
                        <input
                          type="checkbox"
                          id={`user-${user.user_id}`}
                          checked={formData.assigned_user_ids.includes(user.user_id)}
                          onChange={() => handleUserSelection(user.user_id)}
                          style={{ marginRight: '8px' }}
                        />
                        <label 
                          htmlFor={`user-${user.user_id}`} 
                          style={{ 
                            cursor: 'pointer', 
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%'
                          }}
                        >
                          <span style={{ fontWeight: '500' }}>{user.full_name}</span>
                          <span style={{ 
                            marginLeft: '8px', 
                            color: 'var(--dark-gray)',
                            fontSize: '12px'
                          }}>
                            ({user.role.replace('_', ' ')})
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <small style={{ color: 'var(--dark-gray)', marginTop: '4px', display: 'block' }}>
                  Selected: {formData.assigned_user_ids.length} team member(s)
                </small>
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px' }}>
              <button type="submit" className="btn btn-primary">
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{ color: 'var(--dark-gray)' }}>No projects yet</h3>
          {canCreateProject ? (
            <p>Click "New Project" to create your first project</p>
          ) : (
            <p>You don't have any assigned projects yet</p>
          )}
        </div>
      ) : (
        <div className="card">
          {/* Horizontal scroll wrapper */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="tasks-table" style={{ width: '100%', minWidth: '1200px' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '200px' }}>Project Name</th>
                  <th style={{ minWidth: '120px' }}>Vessel</th>
                  <th style={{ minWidth: '120px' }}>Status</th>
                  <th style={{ minWidth: '140px' }}>Project Owner</th>
                  <th style={{ minWidth: '160px' }}>Team Members</th>
                  <th style={{ minWidth: '120px' }}>Budget</th>
                  <th style={{ minWidth: '120px' }}>Spending</th>
                  <th style={{ minWidth: '120px' }}>Start Date</th>
                  {canEditProject && <th style={{ minWidth: '150px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.project_id}>
                    <td>
                      <div>
                        <strong>{project.project_name}</strong>
                        {project.description && (
                          <div style={{ fontSize: '12px', color: 'var(--dark-gray)', marginTop: '4px' }}>
                            {project.description.substring(0, 80)}{project.description.length > 80 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{project.vessel_name || 'N/A'}</td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td>
                      {project.owner_name ? (
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>
                          {project.owner_name}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--dark-gray)', fontSize: '13px' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      {project.team_members && project.team_members.length > 0 ? (
                        <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                          {project.team_members.slice(0, 2).map((member, index) => (
                            <div key={member.user_id} style={{ marginBottom: index === 0 && project.team_members.length > 1 ? '4px' : '0' }}>
                              {member.full_name}
                            </div>
                          ))}
                          {project.team_members.length > 2 && (
                            <div style={{ color: 'var(--dark-gray)', fontSize: '12px', marginTop: '4px' }}>
                              +{project.team_members.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--dark-gray)', fontSize: '13px' }}>None</span>
                      )}
                    </td>
                    <td>
                      {project.budget ? `$${Number(project.budget).toLocaleString()}` : 'N/A'}
                    </td>
                    <td>
                      {project.spending !== null && project.spending !== undefined 
                        ? `$${Number(project.spending).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                        : <span style={{ color: 'var(--dark-gray)', fontSize: '13px', fontStyle: 'italic' }}>Not tracked</span>}
                    </td>
                    <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
                    {canEditProject && (
                      <td className="actions-cell">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button onClick={() => handleEdit(project)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            Edit
                          </button>
                          {canCreateProject && (
                            <button onClick={() => handleDelete(project.project_id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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

export default Projects;
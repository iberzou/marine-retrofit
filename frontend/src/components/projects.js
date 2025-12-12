import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/projects.css';
import '../styles/tasks.css';

const API_BASE_URL = 'http://localhost:8000/api';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const toggleProjectDetails = (projectId) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
  };

  return (
    <div className="projects-page">
      <h1 style={{ color: '#1e3a5f', marginBottom: '1rem' }}>Projects</h1>
      <div className="projects-container">
        {projects.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>No projects found</p>
        ) : (
          <div className="tasks-card">
            <div className="table-wrapper">
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Vessel</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Budget</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.project_id}>
                      <td className="task-name truncate" title={project.project_name}>{project.project_name}</td>
                      <td className="task-meta truncate" title={project.vessel_name || 'N/A'}>{project.vessel_name || 'N/A'}</td>
                      <td className="task-meta truncate" title={project.owner_name || 'N/A'}>{project.owner_name || 'N/A'}</td>
                      <td className="task-meta">
                        <span className={`badge status-${project.status}`}>{project.status}</span>
                      </td>
                      <td className="task-meta">{project.start_date || 'N/A'}</td>
                      <td className="task-meta">{project.end_date || 'N/A'}</td>
                      <td className="task-meta budget-cell">{project.budget ? `$${parseFloat(project.budget).toLocaleString()}` : 'N/A'}</td>
                      <td className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => window.location.href = `/projects/${project.project_id}`}>View</button>
                        <button className="btn btn-primary btn-sm" onClick={() => window.location.href = `/projects/edit/${project.project_id}`}>Edit</button>
                        <button className="btn btn-delete btn-sm" onClick={async () => {
                          if (window.confirm('Delete project?')) {
                            try {
                              await axios.delete(`${API_BASE_URL}/projects/${project.project_id}`, { headers: { Authorization: `Bearer ${token}` } });
                              fetchProjects();
                            } catch (err) { console.error(err); alert('Failed to delete project'); }
                          }
                        }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Projects;
import React, { useState, useEffect } from 'react';
import { blueprintsAPI, projectsAPI, usersAPI } from '../api';
import { getErrorMessage } from '../utils/errorHandler';
import '../styles/blueprints.css';

function Blueprints() {
  const [blueprints, setBlueprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  
  // Filter state
  const [filterProject, setFilterProject] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchBlueprints();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    }
  };

  const fetchBlueprints = async (projectId = null) => {
    setLoading(true);
    setError('');
    try {
      const response = await blueprintsAPI.getAll(projectId);
      setBlueprints(response.data);
    } catch (err) {
      console.error('Error fetching blueprints:', err);
      setError('Failed to load blueprints');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile || !selectedProject) {
      setError('Please select a project and file');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('project_id', selectedProject);
      formData.append('version', version);
      if (description) {
        formData.append('description', description);
      }

      await blueprintsAPI.upload(formData);
      
      setSuccess('Blueprint uploaded successfully!');
      setShowUploadForm(false);
      
      // Reset form
      setSelectedFile(null);
      setSelectedProject('');
      setVersion('1.0');
      setDescription('');
      
      // Refresh blueprints list
      fetchBlueprints(filterProject);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error uploading blueprint:', err);
      setError(getErrorMessage(err, 'Failed to upload blueprint'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (blueprintId) => {
    if (!window.confirm('Are you sure you want to delete this blueprint?')) {
      return;
    }

    try {
      await blueprintsAPI.delete(blueprintId);
      setSuccess('Blueprint deleted successfully!');
      fetchBlueprints(filterProject);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting blueprint:', err);
      setError(getErrorMessage(err, 'Failed to delete blueprint'));
    }
  };

  const handleDownload = async (blueprint) => {
    try {
      const response = await blueprintsAPI.download(blueprint.blueprint_id);
      
      // Create blob and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = blueprint.original_name || blueprint.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading blueprint:', err);
      setError('Failed to download blueprint');
    }
  };

  const handleFilterChange = (projectId) => {
    setFilterProject(projectId);
    fetchBlueprints(projectId || null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="blueprints-container">
      <div className="blueprints-header">
        <h1>Blueprints & Documents</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          {showUploadForm ? 'Cancel' : '📤 Upload Blueprint'}
        </button>
      </div>

      <br></br>
      <br></br>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showUploadForm && (
        <div className="upload-form-card">
          <h2>Upload New Blueprint</h2>
          <br></br>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>Project *</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                required
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>File *</label>
              <input
                type="file"
                onChange={handleFileSelect}
                required
                accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
              />
              {selectedFile && (
                <p className="file-info">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.0, 2.1, Rev A"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description or notes"
                rows="3"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Uploading...' : 'Upload Blueprint'}
            </button>
          </form>
        </div>
      )}
      <br></br>
      <br></br>

      <div className="filter-section">
        <label>Filter by Project:</label>
        <select
          value={filterProject}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(project => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </option>
          ))}
        </select>
      </div>

      <div className="blueprints-grid">
        {loading && !blueprints.length ? (
          <p className="loading-message">Loading blueprints...</p>
        ) : blueprints.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📄</span>
            <p>No blueprints found</p>
            <p className="empty-hint">Upload your first blueprint to get started</p>
          </div>
        ) : (
          blueprints.map(blueprint => {
            const project = projects.find(p => p.project_id === blueprint.project_id);
            return (
              <div key={blueprint.blueprint_id} className="blueprint-card">
                <div className="blueprint-icon">
                  {blueprint.file_type?.includes('pdf') ? '📕' : 
                   blueprint.file_type?.includes('image') ? '🖼️' : '📄'}
                </div>
                <div className="blueprint-info">
                  <h3>{blueprint.original_name || blueprint.file_name}</h3>
                  <p className="blueprint-project">
                    Project: {project?.project_name || 'Unknown'}
                  </p>
                  <p className="blueprint-details">
                    Version: {blueprint.version} | Size: {formatFileSize(blueprint.file_size)}
                  </p>
                  {blueprint.description && (
                    <p className="blueprint-description">{blueprint.description}</p>
                  )}
                  {blueprint.created_at && (
                    <p className="blueprint-meta">
                      Uploaded: {formatDate(blueprint.created_at)}
                    </p>
                  )}
                  <p className="blueprint-uploader">
                    Uploaded by: {blueprint.uploader_name || '[User deleted]'}
                  </p>
                </div>
                <br></br>
                <div className="blueprint-actions">
                  <button
                    className="btn-download"
                    onClick={() => handleDownload(blueprint)}
                    title="Download"
                  >
                    Download
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(blueprint.blueprint_id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
                <br></br><br></br>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Blueprints;
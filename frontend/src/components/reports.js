import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/reports.css';

const API_BASE_URL = 'http://localhost:8000/api';

function Reports() {
  // Step 1: Project selection, Step 2: Report type selection
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [reportType, setReportType] = useState('');
  const [reportName, setReportName] = useState('');
  const [projects, setProjects] = useState([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [generatedReports, setGeneratedReports] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const token = localStorage.getItem('token');
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    
    fetchProjects();
    fetchGeneratedReports();
  }, []);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      // Use the new endpoint that filters projects based on user role
      const response = await axios.get(`${API_BASE_URL}/reports/available-projects`, config);
      if (Array.isArray(response.data)) {
        setProjects(response.data);
        if (response.data.length === 0) {
          setMessage('No available projects. You do not have permission to generate reports for any projects.');
        }
      } else {
        console.error('Invalid projects data format:', response.data);
        setMessage('Error: Invalid project data received');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setMessage('Error loading projects. Please try again.');
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchGeneratedReports = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/reports`, config);
      setGeneratedReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleProjectSelection = (projectId) => {
    setSelectedProjectId(projectId);
    setMessage('');
  };

  const handleProceedToStep2 = () => {
    if (!selectedProjectId) {
      setMessage('Please select a project first');
      return;
    }
    setCurrentStep(2);
    setMessage('');
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setReportType('');
    setReportName('');
    setMessage('');
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!reportName.trim()) {
      setMessage('Please enter a report name');
      return;
    }

    if (!reportType) {
      setMessage('Please select a report type');
      return;
    }

    setLoading(true);
    setMessage('');

    // Construct report data based on report type
    const reportData = {
      report_name: reportName,
      report_type: reportType,
      project_id: reportType !== 'inventory' && selectedProjectId ? selectedProjectId : null,
      project_ids: reportType !== 'inventory' && selectedProjectId ? [selectedProjectId] : null,
      custom_filters: {
        low_stock_only: reportType === 'inventory' ? lowStockOnly : undefined
      }
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/reports/generate`, reportData, config);
      setMessage('Report generated successfully!');
      
      // Download the report immediately
      handleDownload(response.data.report_id);
      
      // Refresh the list
      fetchGeneratedReports();
      
      // Reset form
      resetForm();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      if (errorMessage.includes('Only admins and project managers')) {
        setMessage('Error: Only admins and project managers can generate reports');
      } else {
        setMessage('Error generating report: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedProjectId(null);
    setReportType('');
    setReportName('');
    setLowStockOnly(false);
  };

  const handleDownload = async (reportId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/reports/${reportId}/download`,
        {
          ...config,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setMessage('Error downloading report');
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/reports/${reportId}`, config);
      setMessage('Report deleted successfully');
      fetchGeneratedReports();
    } catch (error) {
      setMessage('Error deleting report');
    }
  };

  const getSelectedProjectName = () => {
    const project = projects.find(p => p.project_id === selectedProjectId);
    return project ? project.project_name : '';
  };

  // Check if user can generate reports
  const canGenerateReports = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');
  const canDeleteReports = currentUser && (currentUser.role === 'admin' || currentUser.role === 'project_manager');

  return (
    <div className="reports-container">
      <h1>Report Generation</h1>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {canGenerateReports ? (
        <div className="report-generator">
          <h2>Generate New Report</h2>
          
          {currentStep === 1 ? (
            // Step 1: Project Selection
            <div className="step-container">
              <h3>Step 1: Select a Project</h3>
              <p style={{ color: 'var(--dark-gray)', marginBottom: '20px' }}>
                Choose the project for which you want to generate a report.
              </p>
              
              <div className="form-group">
                <div className="project-selection">
                  {projectsLoading ? (
                    <p className="loading">Loading projects...</p>
                  ) : projects.length === 0 ? (
                    <p className="no-data">No available projects. You do not have permission to generate reports for any projects.</p>
                  ) : (
                    <>
                      {projects.map(project => (
                        <label 
                          key={project.project_id} 
                          className={`radio-label ${selectedProjectId === project.project_id ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="project"
                            checked={selectedProjectId === project.project_id}
                            onChange={() => handleProjectSelection(project.project_id)}
                          />
                          <span className="project-info">
                            <span className="project-name">{project.project_name}</span>
                            {project.vessel_name && (
                              <span className="vessel-name">Vessel: {project.vessel_name}</span>
                            )}
                          </span>
                          <span className={`status-badge ${project.status}`}>{project.status}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button"
                  onClick={handleProceedToStep2}
                  disabled={!selectedProjectId}
                  className="btn-generate"
                >
                  Next: Select Report Type
                </button>
              </div>
            </div>
          ) : (
            // Step 2: Report Type Selection
            <form onSubmit={handleGenerateReport}>
              <div className="step-container">
                <h3>Step 2: Select Report Type</h3>
                <p style={{ color: 'var(--dark-gray)', marginBottom: '10px' }}>
                  Project: <strong>{getSelectedProjectName()}</strong>
                </p>
                
                <div className="form-group">
                  <label>Report Name *</label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Enter report name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Report Type *</label>
                  <select 
                    value={reportType} 
                    onChange={(e) => setReportType(e.target.value)}
                    required
                  >
                    <option value="">-- Select Report Type --</option>
                    <option value="project">Project Overview Report</option>
                    <option value="task">Tasks-Only Report</option>
                    <option value="inventory">Inventory-Only Report</option>
                    <option value="financial">Finances Report</option>
                  </select>
                </div>

                {reportType === 'inventory' && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                      />
                      <span>Low Stock Items Only</span>
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button 
                    type="button"
                    onClick={handleBackToStep1}
                    className="btn-secondary"
                  >
                    Back to Projects
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || !reportType}
                    className="btn-generate"
                  >
                    {loading ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="report-generator">
          <div className="info-box">
            <h3>Report Generation</h3>
            <p>Only administrators and project managers can generate reports.</p>
            <p>You can view reports related to your assigned projects below.</p>
          </div>
        </div>
      )}

      <div className="generated-reports">
        <h2>Generated Reports</h2>
        
        {generatedReports.length === 0 ? (
          <p className="no-data">No reports available</p>
        ) : (
          <table className="reports-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Project Name</th>
                <th>Type</th>
                <th>Generated Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {generatedReports.map(report => (
                <tr key={report.report_id}>
                  <td data-label="Report Name">{report.report_name}</td>
                  <td data-label="Project Name">
                    {report.project_name || 'N/A'}
                  </td>
                  <td data-label="Type">
                    <span className={`type-badge ${report.report_type}`}>
                      {report.report_type}
                    </span>
                  </td>
                  <td data-label="Generated Date">{new Date(report.generated_at).toLocaleString()}</td>
                  <td data-label="Actions" className="actions">
                    <button 
                      onClick={() => handleDownload(report.report_id)}
                      className="btn-download"
                    >
                      Download
                    </button>
                    {canDeleteReports && (
                      <button 
                        onClick={() => handleDelete(report.report_id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Reports;
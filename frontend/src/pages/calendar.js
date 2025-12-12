import React, { useState, useEffect } from 'react';
import { projectsAPI, tasksAPI } from '../api';
import '../styles/calendar.css';

function Calendar() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, tasksRes] = await Promise.all([
        projectsAPI.getAll(),
        tasksAPI.getAll()
      ]);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    const events = [];
    
    // Check project deadlines
    projects.forEach(project => {
      if (project.end_date === dateStr) {
        events.push({
          type: 'project',
          title: project.project_name,
          status: project.status,
          data: project
        });
      }
    });
    
    // Check task deadlines
    tasks.forEach(task => {
      if (task.due_date === dateStr) {
        events.push({
          type: 'task',
          title: task.task_name,
          priority: task.priority,
          status: task.status,
          data: task
        });
      }
    });
    
    return events;
  };

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return <div className="loading">Loading calendar...</div>;
  }

  return (
    <div className="calendar-container">
      <div className="page-header">
        <h1>📅 Project Schedule</h1><br></br>
        <div className="calendar-controls">
          <button className="btn-secondary" onClick={() => changeMonth(-1)}>
            ◀ Previous
          </button>
          <h2>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className="btn-secondary" onClick={() => changeMonth(1)}>
            Next ▶
          </button>
        </div>
      </div>

      <br></br>

      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot project"></span>
          <span>Project Deadline</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot task-high"></span>
          <span>High Priority Task</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot task-medium"></span>
          <span>Medium Priority Task</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot task-low"></span>
          <span>Low Priority Task</span>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-header">
          {dayNames.map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>
        <div className="calendar-body">
          {getDaysInMonth(currentDate).map((date, index) => {
            const events = date ? getEventsForDate(date) : [];
            return (
              <div
                key={index}
                className={`calendar-day ${!date ? 'empty' : ''} ${isToday(date) ? 'today' : ''}`}
                onClick={() => date && setSelectedDate(date)}
              >
                {date && (
                  <>
                    <div className="day-number">{date.getDate()}</div>
                    <div className="day-events">
                      {events.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={`event-dot ${event.type === 'project' ? 'project' : `task-${event.priority || 'medium'}`}`}
                          title={event.title}
                        />
                      ))}
                      {events.length > 3 && (
                        <div className="more-events">+{events.length - 3}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="date-details-modal" onClick={() => setSelectedDate(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h2>
              <button className="close-btn" onClick={() => setSelectedDate(null)}>×</button>
            </div>
            <div className="modal-body">
              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="no-events">No events scheduled for this date</p>
              ) : (
                <div className="events-list">
                  {getEventsForDate(selectedDate).map((event, i) => (
                    <div key={i} className={`event-item ${event.type}`}>
                      <div className="event-header">
                        <h3>{event.title}</h3>
                        <span className={`status-badge ${event.status || event.priority}`}>
                          {event.status || event.priority}
                        </span>
                      </div>
                      {event.type === 'project' && (
                        <div className="event-details">
                          <p><strong>Type:</strong> Project Deadline</p>
                          <p><strong>Vessel:</strong> {event.data.vessel_name || 'N/A'}</p>
                        </div>
                      )}
                      {event.type === 'task' && (
                        <div className="event-details">
                          <p><strong>Type:</strong> Task Due Date</p>
                          <p><strong>Priority:</strong> {event.priority}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="upcoming-deadlines">
        <h2>Upcoming Deadlines</h2><br></br>
        <div className="deadlines-list">
          {projects
            .filter(p => p.end_date && new Date(p.end_date) >= new Date())
            .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
            .slice(0, 5)
            .map(project => (
              <div key={project.project_id} className="deadline-item project">
                <div className="deadline-date">
                  {new Date(project.end_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="deadline-info">
                  <h4>{project.project_name}</h4>
                  <p className="deadline-type">Project Deadline</p>
                </div>
                <span className={`status-badge ${project.status}`}>
                  {project.status}
                </span>
              </div>
            ))}
          {tasks
            .filter(t => t.due_date && new Date(t.due_date) >= new Date())
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
            .slice(0, 5)
            .map(task => (
              <div key={task.task_id} className="deadline-item task">
                <div className="deadline-date">
                  {new Date(task.due_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="deadline-info">
                  <h4>{task.task_name}</h4>
                  <p className="deadline-type">Task Deadline</p>
                </div>
                <span className={`priority-badge ${task.priority}`}>
                  {task.priority}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Calendar;
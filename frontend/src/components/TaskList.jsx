import React from 'react';

function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(tasks) {
  return tasks.reduce((acc, task) => {
    const key = task.scheduled_date || 'unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});
}

export default function TaskList({ tasks }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>No tasks yet.</p>
        <span>Try saying "Create a task for team sync at 10 AM"</span>
      </div>
    );
  }

  const grouped = groupByDate(tasks);

  return (
    <div className="task-list">
      {Object.entries(grouped).map(([date, dateTasks]) => (
        <div key={date} className="task-group">
          <div className="task-group-header">{formatDate(date)}</div>
          {dateTasks.map(task => (
            <div key={task.id} className={`task-item ${task.status}`}>
              <div className="task-dot" />
              <div className="task-info">
                <span className="task-title">{task.title}</span>
                {task.scheduled_time && (
                  <span className="task-time">{formatTime(task.scheduled_time)}</span>
                )}
              </div>
              <span className={`task-status status-${task.status}`}>{task.status}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
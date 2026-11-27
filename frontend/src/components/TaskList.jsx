import React from 'react';

function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

// Local calendar date as YYYY-MM-DD (toISOString() would give the UTC date).
function localISODate(date) {
  return date.toLocaleDateString('en-CA');
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'unscheduled') return 'Unscheduled';
  const now = new Date();
  const today = localISODate(now);
  const tomorrow = localISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  // Parse as a local date: new Date('YYYY-MM-DD') is UTC and can show the previous day.
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(tasks) {
  return tasks.reduce((acc, task) => {
    // Accept both 'YYYY-MM-DD' and full ISO timestamps from older backends.
    const key = task.scheduled_date ? String(task.scheduled_date).slice(0, 10) : 'unscheduled';
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
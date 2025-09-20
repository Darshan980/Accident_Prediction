import React from 'react';

const AlertFilters = ({ filter, setFilter, alerts, unreadCount }) => {
  const highPriorityCount = alerts.filter(a => a.severity === 'high').length;

  const filters = [
    {
      key: 'all',
      label: 'All Alerts',
      count: alerts.length,
      className: ''
    },
    {
      key: 'unread',
      label: 'Unread',
      count: unreadCount,
      className: 'unread'
    },
    {
      key: 'high_priority',
      label: 'High Priority',
      count: highPriorityCount,
      className: 'priority'
    }
  ];

  return (
    <div className="filters-card">
      <div className="filters-container">
        <div className="filters-scroll">
          {filters.map(({ key, label, count, className }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`filter-button ${filter === key ? `active ${className}` : ''}`}
              aria-pressed={filter === key}
            >
              <span className="filter-label">{label}</span>
              <span className="filter-count">({count})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlertFilters;

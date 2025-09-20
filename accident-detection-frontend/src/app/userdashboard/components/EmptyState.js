import React from 'react';
import { Bell, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

const EmptyState = ({ filter }) => {
  const getEmptyStateContent = () => {
    switch (filter) {
      case 'unread':
        return {
          icon: <CheckCircle className="empty-icon success" />,
          title: 'All Caught Up!',
          subtitle: 'No unread alerts at the moment',
          description: 'Great job staying on top of your alerts'
        };
      case 'high_priority':
        return {
          icon: <AlertTriangle className="empty-icon warning" />,
          title: 'No High Priority Alerts',
          subtitle: 'All critical issues have been addressed',
          description: 'System is operating normally'
        };
      default:
        return {
          icon: <Bell className="empty-icon" />,
          title: 'No Alerts',
          subtitle: 'No alerts to display at this time',
          description: 'New alerts will appear here when detected'
        };
    }
  };

  const { icon, title, subtitle, description } = getEmptyStateContent();

  return (
    <div className="empty-state">
      <div className="empty-state-content">
        {icon}
        <h3 className="empty-title">{title}</h3>
        <p className="empty-subtitle">{subtitle}</p>
        <p className="empty-description">{description}</p>
        <div className="live-monitoring">
          <Activity className="activity-icon" />
          <span>System monitoring active</span>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;

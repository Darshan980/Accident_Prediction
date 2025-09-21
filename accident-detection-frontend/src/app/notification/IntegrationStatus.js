import React from 'react';

const IntegrationStatus = () => {
  const integrations = [
    {
      icon: '📹',
      title: 'Live Detection',
      description: 'Ready to receive alert from live camera feed',
      status: 'ready'
    },
    {
      icon: '📁',
      title: 'File Upload',
      description: 'Ready to receive alerts from uploaded files',
      status: 'ready'
    },
    {
      icon: '💾',
      title: 'Persistent Storage',
      description: 'All alerts saved to localStorage permanently',
      status: 'active'
    }
  ];

  return (
    <div className="mobile-integration">
      <h4>🔗 Integration Status</h4>
      <div className="mobile-integration-grid">
        {integrations.map((integration, index) => (
          <div
            key={index}
            className="mobile-integration-item"
          >
            <div className="mobile-integration-header">
              <span>{integration.icon}</span>
              {integration.title}
              {integration.status === 'active' && (
                <div className="mobile-status-indicator" />
              )}
            </div>
            <div className="mobile-integration-description">
              {integration.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationStatus;

import React from 'react';

const IntegrationStatus = () => {
  const integrations = [
    {
      icon: '📹',
      title: 'Live Detection',
      description: 'Ready to receive alerts from live camera feed',
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
    <div style={{
      backgroundColor: '#e8f4fd',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #b3d9ff',
      marginTop: '20px',
      textAlign: 'center'
    }}>
      <h4 style={{ marginBottom: '12px', color: '#0056b3' }}>🔗 Integration Status</h4>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '12px' 
      }}>
        {integrations.map((integration, index) => (
          <div
            key={index}
            style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #b3d9ff'
            }}
          >
            <div style={{ 
              fontWeight: 'bold', 
              color: '#0056b3', 
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>{integration.icon}</span>
              {integration.title}
              {integration.status === 'active' && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#28a745',
                  borderRadius: '50%',
                  marginLeft: '4px'
                }} />
              )}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {integration.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntegrationStatus;

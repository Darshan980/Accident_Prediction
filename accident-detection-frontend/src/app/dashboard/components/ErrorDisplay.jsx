// app/dashboard/components/ErrorDisplay.jsx
import React from 'react';

const ErrorDisplay = ({ error, showLoginButton = false }) => {
  const handleLoginRedirect = () => {
    window.location.href = '/auth/admin';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{
        backgroundColor: '#fee',
        borderLeft: '4px solid #dc3545',
        padding: '2rem',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>
          {showLoginButton ? 'Authentication Error' : 'Error'}
        </h2>
        <p style={{ color: '#721c24', marginBottom: '1rem' }}>{error}</p>
        {showLoginButton && (
          <button
            onClick={handleLoginRedirect}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Admin Login
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;

// app/dashboard/components/Pagination.jsx
import React from 'react';

const Pagination = ({ currentPage, setCurrentPage, totalPages }) => {
  if (totalPages <= 1) return null;

  const buttonStyle = {
    padding: '0.5rem 1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer'
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#f8f9fa',
    cursor: 'not-allowed'
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      gap: '1rem',
      marginBottom: '2rem' 
    }}>
      <button
        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
        style={currentPage === 1 ? disabledButtonStyle : buttonStyle}
      >
        Previous
      </button>
      
      <span style={{ fontSize: '0.9rem', color: '#666' }}>
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
        style={currentPage === totalPages ? disabledButtonStyle : buttonStyle}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;

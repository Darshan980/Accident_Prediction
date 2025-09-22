// app/dashboard/components/mobile/MobileFilters.jsx
import React from 'react';

const MobileFilters = ({ filter, setFilter, filteredCount, totalCount, onClose }) => {
  const filterOptions = [
    { value: 'all', label: 'All Logs', icon: '📋', description: 'View all detection logs' },
    { value: 'accidents', label: 'Accidents Only', icon: '🚨', description: 'Only accident detections' },
    { value: 'normal', label: 'Normal Only', icon: '✅', description: 'Only normal traffic' },
    { value: 'unresolved', label: 'Unresolved', icon: '⏳', description: 'Pending review' },
    { value: 'high_confidence', label: 'High Confidence', icon: '🎯', description: 'Confidence 80%+' }
  ];

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
          🔍 Filters
        </h3>
        <button
          onClick={onClose}
          style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Apply & Close
        </button>
      </div>

      {/* Current Selection Info */}
      <div style={{
        backgroundColor: '#e3f2fd',
        border: '1px solid #bbdefb',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ 
          fontSize: '0.9rem', 
          fontWeight: 'bold', 
          color: '#1976d2',
          marginBottom: '0.25rem' 
        }}>
          Current Filter Results
        </div>
        <div style={{ fontSize: '0.8rem', color: '#666' }}>
          Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> total logs
        </div>
      </div>

      {/* Filter Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filterOptions.map((option) => (
          <FilterOption
            key={option.value}
            option={option}
            isSelected={filter === option.value}
            onSelect={() => setFilter(option.value)}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e5e5e5'
      }}>
        <h4 style={{ 
          margin: '0 0 1rem 0', 
          fontSize: '1rem',
          color: '#333'
        }}>
          ⚡ Quick Actions
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setFilter('unresolved')}
            style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '6px',
              padding: '0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.9rem'
            }}
          >
            ⏳ Review Pending Items
          </button>
          
          <button
            onClick={() => setFilter('accidents')}
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              padding: '0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.9rem'
            }}
          >
            🚨 Check Recent Accidents
          </button>
        </div>
      </div>

      {/* Filter Tips */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f0f9ff',
        border: '1px solid #e0f2fe',
        borderRadius: '8px'
      }}>
        <h4 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '0.9rem',
          color: '#0369a1'
        }}>
          💡 Tips
        </h4>
        <ul style={{ 
          margin: 0, 
          paddingLeft: '1rem',
          fontSize: '0.8rem',
          color: '#666',
          lineHeight: 1.4
        }}>
          <li>Use "High Confidence" to review most reliable detections</li>
          <li>"Unresolved" shows items that need your attention</li>
          <li>Swipe or tap cards to expand for more details</li>
        </ul>
      </div>
    </div>
  );
};

const FilterOption = ({ option, isSelected, onSelect }) => (
  <div
    onClick={onSelect}
    style={{
      backgroundColor: isSelected ? '#e3f2fd' : 'white',
      border: isSelected ? '2px solid #1976d2' : '1px solid #e5e5e5',
      borderRadius: '8px',
      padding: '1rem',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: isSelected ? '0 2px 8px rgba(25, 118, 210, 0.1)' : '0 1px 3px rgba(0,0,0,0.1)'
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    }}>
      <span style={{ fontSize: '1.5rem' }}>
        {option.icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 'bold',
          fontSize: '1rem',
          color: isSelected ? '#1976d2' : '#333',
          marginBottom: '0.25rem'
        }}>
          {option.label}
        </div>
        <div style={{
          fontSize: '0.8rem',
          color: '#666',
          lineHeight: 1.3
        }}>
          {option.description}
        </div>
      </div>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: isSelected ? '#1976d2' : 'transparent',
        border: isSelected ? 'none' : '2px solid #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {isSelected && (
          <span style={{ color: 'white', fontSize: '0.8rem' }}>✓</span>
        )}
      </div>
    </div>
  </div>
);

export default MobileFilters;

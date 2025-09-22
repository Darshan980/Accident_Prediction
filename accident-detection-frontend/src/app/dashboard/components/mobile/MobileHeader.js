// app/dashboard/components/mobile/MobileHeader.jsx
import React, { useState } from 'react';

const MobileHeader = ({ user, onRefresh, isRefreshing, onShowFilters }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <div style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e5e5',
        padding: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              margin: 0, 
              color: '#333' 
            }}>
              Admin Panel
            </h1>
            <p style={{ 
              fontSize: '0.8rem', 
              color: '#666', 
              margin: '0.25rem 0 0 0' 
            }}>
              Welcome, {user?.username}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                backgroundColor: isRefreshing ? '#f8f9fa' : '#0070f3',
                color: isRefreshing ? '#666' : 'white',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span style={{ 
                fontSize: '1.2rem',
                transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ⟳
              </span>
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0.5rem',
                cursor: 'pointer',
                fontSize: '1.5rem'
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setShowMenu(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              width: '250px',
              height: '100vh',
              padding: '2rem 1rem',
              boxShadow: '-2px 0 10px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>
                {user?.username}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                Role: {user?.role}
              </p>
            </div>

            <button
              onClick={() => {
                setShowMenu(false);
                onShowFilters();
              }}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                marginBottom: '1rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              🔍 Filters & Search
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeader;

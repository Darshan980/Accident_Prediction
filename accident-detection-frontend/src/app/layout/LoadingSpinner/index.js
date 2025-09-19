'use client';
import React from 'react';
import '../../../styles/animations.css';

const LoadingSpinner = ({ size = 40, minHeight = '50vh' }) => (
  <div style={{
    minHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div 
      className="spinner"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '3px solid #f3f4f6',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%'
      }} 
    />
  </div>
);

export default LoadingSpinner;

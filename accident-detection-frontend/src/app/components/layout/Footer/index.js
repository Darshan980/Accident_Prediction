
import React from 'react';

const Footer = () => (
  <footer style={{ 
    backgroundColor: '#f8f9fa', 
    padding: '2rem 0',
    textAlign: 'center',
    borderTop: '1px solid #e5e7eb',
    color: '#6c757d'
  }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
      <p style={{ margin: 0 }}>
        © 2025 Accident Detection App. Built with Next.js and FastAPI
      </p>
    </div>
  </footer>
);

export default Footer;

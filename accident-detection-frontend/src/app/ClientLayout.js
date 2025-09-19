'use client';
import React from 'react';
import Navigation from './components/layout/Navigation';
import Footer from './components/layout/Footer';
import RouteHandler from './components/routing/RouteHandler';
import './../styles/animations.css';

export default function ClientLayout({ children }) {
  return (
    <>
      <Navigation />
      
      <main style={{ minHeight: 'calc(100vh - 80px)' }}>
        <RouteHandler>
          {children}
        </RouteHandler>
      </main>
      
      <Footer />
    </>
  );
}

// Export commonly used components
export { default as ProtectedRoute } from './components/common/ProtectedRoute';

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Hero from './components/hero';
import UploadOptions from './components/UploadOptions';
import UploadImage from './components/UploadImage';
import UploadVideo from './components/UploadVideo';
import Navbar from './components/navbar';
import Steps from './components/steps';
import CTA from './components/cta';
import Footer from './components/footer';
import Contact from './components/contact';
import './App.css';
const AppContent = () => {
  const location = useLocation();

  // Determine if the current route is the Contact page
  const isContactPage = location.pathname === '/contact';

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/upload-options" element={<UploadOptions />} />
        <Route path="/upload-image" element={<UploadImage />} />
        <Route path="/upload-video" element={<UploadVideo />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      {!isContactPage && <Steps />}
      {!isContactPage && <CTA />}
      <Footer />
    </>
  );
};

function App() {
  return (
    
    <Router>
      <AppContent />
    </Router>
  );
}



export default App;

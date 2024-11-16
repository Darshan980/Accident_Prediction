import React from 'react';
import { Link } from 'react-router-dom';
import { FaUpload, FaVideo } from 'react-icons/fa';
import './UploadOptions.css';

function UploadOptions() {
  return (
      <div className="upload-options-container">
        <h2>Select an Option</h2>
        <div className="options">
          <Link to="/upload-image" className="option">
            <FaUpload size={50} />
            <p>Upload Image</p>
          </Link>
          <Link to="/upload-video" className="option">
            <FaVideo size={50} />
            <p>Upload Video</p>
          </Link>
        </div>
      </div>
  );
}

export default UploadOptions;

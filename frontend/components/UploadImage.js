import React, { useState } from 'react';
import axios from 'axios';
import './UploadImage.css';

function UploadImage() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setResult('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!image) {
      setError('Please select an image to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', image);

    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/predict/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Response:', response); // Log response for debugging
      setResult(response.data.result);
    } catch (error) {
      console.error('Error:', error); // Log full error to console for debugging
      if (error.response && error.response.data) {
        setError(`Error: ${error.response.data.detail}`);
      } else {
        setError('Error uploading image. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="upload-container">
        <h2>Upload Image</h2>
        <input type="file" onChange={handleImageChange} accept="image/*" />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Processing...' : 'Predict'}
        </button>
        {error && <p className="error">{error}</p>}
        {result && <p className="result">Prediction: {result}</p>}
        {result === 'Accident' && imagePreview && (
          <div className="image-preview">
            <h3>Accident Image</h3>
            <img src={imagePreview} alt="Uploaded" className="large-image" />
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadImage;

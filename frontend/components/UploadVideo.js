import React, { useState } from 'react';
import axios from 'axios';
import './UploadVideo.css';

function UploadVideo() {
  const [video, setVideo] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVideoChange = (e) => {
    setVideo(e.target.files[0]);
    setResult('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!video) {
      setError('Please select a video to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', video);

    setLoading(true);
    setError('');
    setResult('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/predict-video/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data.result);
    } catch (error) {
      setError('Error uploading video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-video-container">
      <h2>Upload Video</h2>
      <input type="file" onChange={handleVideoChange} accept="video/*" />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Predicting...' : 'Predict'}
      </button>
      {error && <p className="error">{error}</p>}
      {result && <p className="result">Prediction: {result}</p>}
    </div>
  );
}

export default UploadVideo;
// app/upload/components/UploadProgress.js
const UploadProgress = ({ isUploading, uploadProgress }) => {
  if (!isUploading) return null

  return (
    <div className="progress-container">
      <div className="progress-header">
        <div className="progress-spinner"></div>
        <span className="progress-text">Processing your file...</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${uploadProgress}%` }}
        ></div>
      </div>
      <p className="progress-label">{uploadProgress}% complete</p>

      <style jsx>{`
        .progress-container {
          margin-bottom: 2rem;
          padding: 1rem;
          background-color: #eff6ff;
          border-radius: 0.5rem;
          border: 1px solid #bfdbfe;
        }
        
        .progress-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        
        .progress-spinner {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid #2563eb;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .progress-text {
          color: #1e40af;
          font-weight: 600;
        }
        
        .progress-bar {
          width: 100%;
          background-color: #bfdbfe;
          border-radius: 9999px;
          height: 0.5rem;
        }
        
        .progress-fill {
          background-color: #2563eb;
          height: 0.5rem;
          border-radius: 9999px;
          transition: all 0.3s;
        }
        
        .progress-label {
          color: #1d4ed8;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default UploadProgress

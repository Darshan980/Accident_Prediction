// app/upload/components/UploadHistory.js
const UploadHistory = ({ uploadHistory }) => {
  if (uploadHistory.length === 0) return null

  return (
    <div className="history-container">
      <h3 className="history-title">Recent Uploads</h3>
      <div className="history-list">
        {uploadHistory.slice(0, 5).map((item) => (
          <div key={item.id} className="history-item">
            <div>
              <p className="history-filename">{item.filename}</p>
              <p className="history-timestamp">
                {new Date(item.timestamp).toLocaleString()}
              </p>
            </div>
            <div className="history-result">
              <span className={`history-badge ${
                item.accident_detected ? 'accident' : 'safe'
              }`}>
                {item.accident_detected ? 'ACCIDENT' : 'SAFE'}
              </span>
              <p className="history-confidence">
                {(item.confidence * 100).toFixed(1)}% confidence
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {uploadHistory.length > 5 && (
        <div className="view-all-button">
          <a href="/dashboard" className="view-all-link">
            View All History →
          </a>
        </div>
      )}

      <style jsx>{`
        .history-container {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: white;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .history-title {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
        
        .history-filename {
          font-weight: 600;
          font-size: 0.875rem;
          margin: 0;
        }
        
        .history-timestamp {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
        }
        
        .history-result {
          text-align: right;
        }
        
        .history-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .history-badge.accident {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .history-badge.safe {
          background-color: #dcfce7;
          color: #166534;
        }
        
        .history-confidence {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
        }
        
        .view-all-button {
          text-align: center;
          margin-top: 1rem;
        }
        
        .view-all-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .view-all-link:hover {
          color: #1d4ed8;
        }
      `}</style>
    </div>
  )
}

export default UploadHistory

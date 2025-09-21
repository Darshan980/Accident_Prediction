// app/upload/components/AnalysisResults.js
import { Target, FileText, Clock } from 'lucide-react'
import { formatFileSize } from '../utils/fileUtils'

const AnalysisResults = ({ analysisResult }) => {
  if (!analysisResult) return null

  return (
    <div className="results-container">
      <h3 className="results-title">
        <Target className="status-icon" />
        Analysis Results
      </h3>
      
      <div className={`result-alert ${
        analysisResult.accident_detected ? 'accident' : 'safe'
      }`}>
        <div className="result-content">
          <div className="result-emoji">
            {analysisResult.accident_detected ? '⚠️' : '✅'}
          </div>
          <div>
            <h4 className={`result-status ${
              analysisResult.accident_detected ? 'accident' : 'safe'
            }`}>
              {analysisResult.accident_detected ? 'ACCIDENT DETECTED' : 'NO ACCIDENT DETECTED'}
            </h4>
            <p className={`result-confidence ${
              analysisResult.accident_detected ? 'accident' : 'safe'
            }`}>
              Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
      
      <div className="result-grid">
        <div className="result-card">
          <div className="result-card-header">
            <FileText style={{width: '1rem', height: '1rem', color: '#6b7280'}} />
            <span className="result-card-title">File Details</span>
          </div>
          <p className="result-card-content">
            <strong>Name:</strong> {analysisResult.filename}<br/>
            <strong>Size:</strong> {formatFileSize(analysisResult.file_size)}<br/>
            <strong>Type:</strong> {analysisResult.content_type}
          </p>
        </div>
        
        <div className="result-card">
          <div className="result-card-header">
            <Clock style={{width: '1rem', height: '1rem', color: '#6b7280'}} />
            <span className="result-card-title">Processing Info</span>
          </div>
          <p className="result-card-content">
            <strong>Time:</strong> {analysisResult.processing_time?.toFixed(2)}s<br/>
            <strong>Class:</strong> {analysisResult.predicted_class}<br/>
            <strong>Frames:</strong> {analysisResult.frames_analyzed || 1}
          </p>
        </div>
      </div>
      
      {analysisResult.details && (
        <div className="result-details">
          <p className="result-card-content">
            <strong>Details:</strong> {analysisResult.details}
          </p>
        </div>
      )}

      <style jsx>{`
        .results-container {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: white;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .results-title {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        
        .result-alert {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid;
        }
        
        .result-alert.accident {
          background-color: #fef2f2;
          border-color: #fecaca;
        }
        
        .result-alert.safe {
          background-color: #f0fdf4;
          border-color: #bbf7d0;
        }
        
        .result-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .result-emoji {
          font-size: 1.875rem;
        }
        
        .result-status {
          font-size: 1.125rem;
          font-weight: bold;
        }
        
        .result-status.accident {
          color: #991b1b;
        }
        
        .result-status.safe {
          color: #166534;
        }
        
        .result-confidence {
          font-size: 0.875rem;
        }
        
        .result-confidence.accident {
          color: #b91c1c;
        }
        
        .result-confidence.safe {
          color: #15803d;
        }
        
        .result-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        @media (min-width: 768px) {
          .result-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        .result-card {
          padding: 0.75rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
        
        .result-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        
        .result-card-title {
          font-weight: 600;
          color: #374151;
        }
        
        .result-card-content {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .result-details {
          margin-top: 1rem;
          padding: 0.75rem;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
      `}</style>
    </div>
  )
}

export default AnalysisResults

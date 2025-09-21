// app/upload/components/ErrorDisplay.js
import { XCircle } from 'lucide-react'

const ErrorDisplay = ({ error }) => {
  if (!error) return null

  return (
    <div className="error-display">
      <div className="error-content">
        <XCircle style={{width: '1.25rem', height: '1.25rem', color: '#dc2626'}} />
        <span className="error-text">{error}</span>
      </div>

      <style jsx>{`
        .error-display {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background-color: #fef2f2;
          border-radius: 0.5rem;
          border: 1px solid #fecaca;
        }
        
        .error-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .error-text {
          color: #991b1b;
        }
      `}</style>
    </div>
  )
}

export default ErrorDisplay

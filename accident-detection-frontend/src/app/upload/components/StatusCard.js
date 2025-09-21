// app/upload/components/StatusCard.js
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const StatusCard = ({ title, status, icon: Icon, message, color }) => {
  return (
    <div className={`status-card ${color}`}>
      <div className="status-card-content">
        <Icon className="status-icon" />
        <div className="status-text">
          <h3 className="status-title">{title}</h3>
          <p className="status-message">{message}</p>
        </div>
        <div className="status-indicator">
          {status === 'success' && <CheckCircle className="status-icon-success" />}
          {status === 'error' && <XCircle className="status-icon-error" />}
          {status === 'warning' && <AlertCircle className="status-icon-warning" />}
        </div>
      </div>

      <style jsx>{`
        .status-card {
          padding: 1rem;
          border-radius: 0.5rem;
          border: 2px solid;
        }
        
        .status-card.success {
          border-color: #bbf7d0;
          background-color: #f0fdf4;
        }
        
        .status-card.warning {
          border-color: #fef3c7;
          background-color: #fffbeb;
        }
        
        .status-card-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .status-icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        
        .status-text {
          flex: 1;
        }
        
        .status-title {
          font-weight: 600;
          font-size: 1.125rem;
          margin: 0 0 0.25rem 0;
        }
        
        .status-message {
          font-size: 0.875rem;
          opacity: 0.8;
          margin: 0;
        }
        
        .status-indicator {
          margin-left: auto;
        }
        
        .status-icon-success {
          width: 1.5rem;
          height: 1.5rem;
          color: #059669;
        }
        
        .status-icon-error {
          width: 1.5rem;
          height: 1.5rem;
          color: #dc2626;
        }
        
        .status-icon-warning {
          width: 1.5rem;
          height: 1.5rem;
          color: #d97706;
        }
      `}</style>
    </div>
  )
}

export default StatusCard

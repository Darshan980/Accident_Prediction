import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle, Download, X } from 'lucide-react'
import { formatFileSize, truncateFilename } from '../utils/resultUtils'
import styles from '../styles/ResultModal.css'

const ResultModal = ({ result, onClose, onDownload }) => {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden' // Prevent background scroll

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getResultIcon = () => {
    if (result.accident_detected) {
      return <AlertTriangle className={`${styles.resultIcon} ${styles.resultIconDanger}`} />
    }
    return <CheckCircle className={`${styles.resultIcon} ${styles.resultIconSuccess}`} />
  }

  const getResultColorClass = () => {
    if (result.accident_detected) {
      return result.confidence > 0.8 ? styles.resultStatusHighDanger : styles.resultStatusMediumDanger
    }
    return styles.resultStatusSafe
  }

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Analysis Details</h2>
          <button
            onClick={onClose}
            className={styles.modalClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalContent}>
          {/* Result Status */}
          <div className={`${styles.resultStatus} ${getResultColorClass()}`}>
            <div className={styles.resultStatusContent}>
              {getResultIcon()}
              <div className={styles.resultStatusInfo}>
                <h3 className={styles.resultStatusTitle}>
                  {result.accident_detected ? 'ACCIDENT DETECTED' : 'NO ACCIDENT DETECTED'}
                </h3>
                <p className={styles.resultStatusConfidence}>
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* File Information */}
          <div className={styles.detailSection}>
            <h4 className={styles.detailSectionTitle}>File Information</h4>
            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailFieldLabel}>Filename:</span>
                <div className={styles.detailFieldValue} title={result.filename}>
                  {result.filename ? truncateFilename(result.filename, 40) : 'Live Detection'}
                </div>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailFieldLabel}>Source:</span>
                <div className={styles.detailFieldValue}>
                  <span className={`${styles.sourceBadge} ${result.source === 'live' ? styles.sourceBadgeLive : styles.sourceBadgeUpload}`}>
                    {result.source === 'live' ? '📹 Live Detection' : '📤 File Upload'}
                  </span>
                </div>
              </div>
              {result.file_size && (
                <div className={styles.detailField}>
                  <span className={styles.detailFieldLabel}>File Size:</span>
                  <div className={styles.detailFieldValue}>{formatFileSize(result.file_size)}</div>
                </div>
              )}
              {result.content_type && (
                <div className={styles.detailField}>
                  <span className={styles.detailFieldLabel}>Type:</span>
                  <div className={styles.detailFieldValue}>{result.content_type}</div>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Results */}
          <div className={styles.detailSection}>
            <h4 className={styles.detailSectionTitle}>Analysis Results</h4>
            <div className={styles.detailGrid}>
              <div className={styles.detailField}>
                <span className={styles.detailFieldLabel}>Predicted Class:</span>
                <div className={styles.detailFieldValue}>{result.predicted_class || 'Unknown'}</div>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailFieldLabel}>Processing Time:</span>
                <div className={styles.detailFieldValue}>
                  {result.processing_time ? `${result.processing_time.toFixed(2)}s` : 'N/A'}
                </div>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailFieldLabel}>Analysis Date:</span>
                <div className={styles.detailFieldValue}>
                  {new Date(result.timestamp).toLocaleDateString()} {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className={styles.detailField}>
                <span className={styles.detailFieldLabel}>Analysis ID:</span>
                <div className={`${styles.detailFieldValue} ${styles.detailFieldValueSmall}`}>
                  {result.id}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {result.details && (
            <div className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>Additional Details</h4>
              <p className={styles.detailSectionDescription}>
                {result.details}
              </p>
            </div>
          )}

          {/* Confidence Breakdown */}
          <div className={styles.detailSection}>
            <h4 className={styles.detailSectionTitle}>Confidence Level</h4>
            <div className={styles.confidenceBar}>
              <div 
                className={styles.confidenceBarFill} 
                style={{ 
                  width: `${result.confidence * 100}%`,
                  backgroundColor: result.accident_detected 
                    ? (result.confidence > 0.8 ? '#ef4444' : '#f59e0b')
                    : '#10b981'
                }}
              ></div>
            </div>
            <div className={styles.confidenceLabels}>
              <span>0%</span>
              <span className={styles.confidenceValue}>
                {(result.confidence * 100).toFixed(1)}%
              </span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button
            onClick={() => onDownload(result)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            <Download size={16} />
            <span className={styles.btnTextDesktop}>Download Report</span>
            <span className={styles.btnTextMobile}>Download</span>
          </button>
          <button
            onClick={onClose}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultModal

import React from 'react'
import { AlertTriangle, CheckCircle, Clock, FileText, Download } from 'lucide-react'
import { formatFileSize, truncateFilename } from '../utils/resultUtils'
import styles from '../styles/ResultCard.module.css'

const ResultCard = ({ result, onViewDetails, onDownload }) => {
  const getResultIcon = () => {
    if (result.accident_detected) {
      return <AlertTriangle className={`${styles.resultIcon} ${styles.resultIconDanger}`} />
    }
    return <CheckCircle className={`${styles.resultIcon} ${styles.resultIconSuccess}`} />
  }

  const getResultColorClass = () => {
    if (result.accident_detected) {
      return result.confidence > 0.8 ? styles.resultCardHighDanger : styles.resultCardMediumDanger
    }
    return styles.resultCardSafe
  }

  const displayFilename = result.filename 
    ? truncateFilename(result.filename, 25) // Truncate for mobile
    : `${result.source} Detection`

  return (
    <div className={`${styles.resultCard} ${getResultColorClass()}`}>
      <div className={styles.resultCardContent}>
        <div className={styles.resultCardMain}>
          {getResultIcon()}
          <div className={styles.resultCardInfo}>
            <div className={styles.resultCardHeader}>
              <h3 className={styles.resultCardTitle} title={result.filename || displayFilename}>
                {displayFilename}
              </h3>
              <div className={styles.badgeContainer}>
                <span className={`${styles.badge} ${result.source === 'live' ? styles.badgeOrange : styles.badgeBlue}`}>
                  {result.source === 'live' ? 'Live' : 'Upload'}
                </span>
                <span className={`${styles.badge} ${result.accident_detected ? styles.badgeRed : styles.badgeGreen}`}>
                  {result.accident_detected ? 'ACCIDENT' : 'SAFE'}
                </span>
              </div>
            </div>
            
            <div className={styles.resultCardDetails}>
              <div className={styles.detailItem}>
                <Clock className={styles.detailIcon} />
                <span className={styles.detailText}>
                  {new Date(result.timestamp).toLocaleDateString()} {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={styles.detailItem}>
                <div className={styles.detailIcon}>📊</div>
                <span className={styles.detailText}>
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
              {result.file_size && (
                <div className={styles.detailItem}>
                  <FileText className={styles.detailIcon} />
                  <span className={styles.detailText}>
                    {formatFileSize(result.file_size)}
                  </span>
                </div>
              )}
            </div>
            
            {result.details && (
              <p className={styles.resultCardDescription}>
                {result.details.length > 100 
                  ? `${result.details.substring(0, 100)}...` 
                  : result.details
                }
              </p>
            )}
          </div>
        </div>
        
        <div className={styles.resultCardActions}>
          <button
            onClick={() => onViewDetails(result)}
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
          >
            <span className={styles.btnTextDesktop}>View Details</span>
            <span className={styles.btnTextMobile}>View</span>
          </button>
          <button
            onClick={() => onDownload(result)}
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm} ${styles.btnIcon}`}
            title="Download Report"
          >
            <Download />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultCard

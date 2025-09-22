// result/components/NoResults.js
import React from 'react'
import styles from '../styles/NoResults.css'

const NoResults = ({ results }) => {
  return (
    <div className={styles.noResults}>
      <div className={styles.noResultsIcon}>📊</div>
      <h3 className={styles.noResultsTitle}>No Results Found</h3>
      <p className={styles.noResultsText}>
        {results.length === 0 
          ? "You haven't performed any analyses yet. Try uploading a file or using live detection."
          : "No results match your current filters. Try adjusting your search criteria."
        }
      </p>
      <div className={styles.noResultsActions}>
        <button
          onClick={() => window.location.href = '/upload'}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          📤 Upload File
        </button>
        <button
          onClick={() => window.location.href = '/live'}
          className={`${styles.btn} ${styles.btnSuccess}`}
        >
          📹 Live Detection
        </button>
      </div>
    </div>
  )
}

export default NoResults

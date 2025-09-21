// result/components/StatsCards.js
import React from 'react'
import { FileText, AlertTriangle, CheckCircle, Camera } from 'lucide-react'
import styles from '../styles/StatsCards.module.css'

const StatsCards = ({ results }) => {
  const stats = [
    {
      icon: FileText,
      value: results.length,
      label: 'Total Analyses',
      color: 'blue'
    },
    {
      icon: AlertTriangle,
      value: results.filter(r => r.accident_detected).length,
      label: 'Accidents Detected',
      color: 'red'
    },
    {
      icon: CheckCircle,
      value: results.filter(r => !r.accident_detected).length,
      label: 'Safe Results',
      color: 'green'
    },
    {
      icon: Camera,
      value: results.filter(r => r.source === 'live').length,
      label: 'Live Detections',
      color: 'purple'
    }
  ]

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat, index) => (
        <div key={index} className={styles.statCard}>
          <div className={styles.statCardContent}>
            <div className={`${styles.statCardIcon} ${styles[`statCardIcon${stat.color.charAt(0).toUpperCase() + stat.color.slice(1)}`]}`}>
              <stat.icon />
            </div>
            <div className={styles.statCardInfo}>
              <div className={styles.statCardValue}>{stat.value}</div>
              <div className={styles.statCardLabel}>{stat.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCards

// result/components/NoResults.js
import React from 'react'
import styles from '../styles/NoResults.module.css'

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

// result/components/QuickActions.js
import React from 'react'
import styles from '../styles/QuickActions.module.css'

const QuickActions = () => {
  const actions = [
    {
      href: '/upload',
      className: `${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`,
      text: '📤 Upload New File'
    },
    {
      href: '/live',
      className: `${styles.btn} ${styles.btnSuccess} ${styles.btnLg}`,
      text: '📹 Live Detection'
    },
    {
      href: '/notification',
      className: `${styles.btn} ${styles.btnWarning} ${styles.btnLg}`,
      text: '🔔 View Alerts'
    }
  ]

  return (
    <div className={styles.quickActions}>
      <div className={styles.quickActionsContent}>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => window.location.href = action.href}
            className={action.className}
          >
            {action.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuickActions

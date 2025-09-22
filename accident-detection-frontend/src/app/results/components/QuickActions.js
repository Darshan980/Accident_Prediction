
// result/components/QuickActions.js
import React from 'react'
import styles from '../styles/QuickActions.css'

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

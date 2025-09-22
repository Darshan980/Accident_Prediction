// result/components/StatsCards.js
import React from 'react'
import { FileText, AlertTriangle, CheckCircle, Camera } from 'lucide-react'
import styles from '../styles/StatsCards.css'

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


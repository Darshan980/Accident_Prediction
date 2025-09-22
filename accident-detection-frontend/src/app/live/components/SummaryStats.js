// app/live/components/SummaryStats.js
import React from 'react';
import styles from '../styles/SummaryStats.module.css';

const SummaryStats = ({ savedCount, alertsTriggered }) => {
  if (savedCount === 0 && alertsTriggered === 0) return null;

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statItem}>
        <div className={styles.statValue}>{savedCount}</div>
        <div className={styles.statLabel}>Results Saved</div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statValue}>{alertsTriggered}</div>
        <div className={styles.statLabel}>Alerts Triggered</div>
      </div>
    </div>
  );
};


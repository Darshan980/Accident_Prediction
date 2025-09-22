// app/live/components/Navigation.js
import React from 'react';
import Link from 'next/link';
import styles from '../styles/Navigation.module.css';

const Navigation = ({ alertsTriggered }) => {
  return (
    <div className={styles.navContainer}>
      <Link href="/results" className={styles.navButton}>
        📊 View All Results
      </Link>

      <Link 
        href="/notification" 
        className={`${styles.navButton} ${
          alertsTriggered > 0 ? styles.alertActive : styles.alertInactive
        }`}
      >
        🔔 Notifications
      </Link>

      <Link href="/" className={styles.homeLink}>
        ← Back to Home
      </Link>
    </div>
  );
};

// app/live/components/ErrorDisplay.js
import React from 'react';
import styles from '../styles/ErrorDisplay.module.css';

const ErrorDisplay = ({ error }) => {
  if (!error) return null;

  return (
    <div className={styles.errorContainer}>
      <strong>⚠️ {error}</strong>
    </div>
  );
};

export { ConnectionStatus, SummaryStats, Navigation, ErrorDisplay };

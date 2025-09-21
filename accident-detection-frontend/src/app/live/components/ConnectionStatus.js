// app/live/components/ConnectionStatus.js
import React from 'react';
import styles from '../styles/ConnectionStatus.module.css';

const ConnectionStatus = ({ apiConnected, onRetryConnection }) => {
  if (apiConnected) return null;

  return (
    <div className={styles.statusContainer}>
      <div className={styles.statusMessage}>
        ⚠️ Detection Service Unavailable
      </div>
      <button onClick={onRetryConnection} className={styles.retryButton}>
        Retry Connection
      </button>
    </div>
  );
};

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

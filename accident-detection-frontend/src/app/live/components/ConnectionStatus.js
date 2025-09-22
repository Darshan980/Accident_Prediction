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


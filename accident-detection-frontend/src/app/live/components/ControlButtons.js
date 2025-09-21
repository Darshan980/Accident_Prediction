// app/live/components/ControlButtons.js
import React from 'react';
import styles from '../styles/ControlButtons.module.css';

const ControlButtons = ({ 
  isDetectionActive, 
  isLoading, 
  apiConnected, 
  onStart, 
  onStop 
}) => {
  const startDisabled = isDetectionActive || isLoading || !apiConnected;
  const stopDisabled = !isDetectionActive;

  return (
    <div className={styles.controlContainer}>
      <button 
        onClick={onStart}
        disabled={startDisabled}
        className={`${styles.controlButton} ${styles.startButton} ${
          startDisabled ? styles.disabled : ''
        }`}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner}>🔄</span>
            Starting...
          </>
        ) : isDetectionActive ? (
          <>
            ✅ Detection Active
          </>
        ) : (
          <>
            🚀 Start Detection
          </>
        )}
      </button>
      
      <button 
        onClick={onStop}
        disabled={stopDisabled}
        className={`${styles.controlButton} ${styles.stopButton} ${
          stopDisabled ? styles.disabled : ''
        }`}
      >
        🛑 Stop Detection
      </button>
    </div>
  );
};

export default ControlButtons;

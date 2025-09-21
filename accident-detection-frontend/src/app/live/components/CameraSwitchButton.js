// app/live/components/CameraSwitchButton.js
import React from 'react';
import styles from '../styles/CameraSwitchButton.module.css';

const CameraSwitchButton = ({ 
  onSwitchCamera, 
  hasMultipleCameras, 
  isSwitchingCamera, 
  isDetectionActive,
  currentCameraInfo 
}) => {
  // Don't show button if only one camera or detection is not active
  if (!hasMultipleCameras || !isDetectionActive) return null;

  return (
    <button
      onClick={onSwitchCamera}
      disabled={isSwitchingCamera}
      className={`${styles.switchButton} ${isSwitchingCamera ? styles.switching : ''}`}
      title={`Switch to ${currentCameraInfo.name === 'Front Camera' ? 'Back' : 'Front'} Camera`}
    >
      {isSwitchingCamera ? (
        <>
          <span className={styles.spinner}>🔄</span>
          <span className={styles.buttonText}>Switching...</span>
        </>
      ) : (
        <>
          <span className={styles.cameraIcon}>{currentCameraInfo.icon}</span>
          <span className={styles.buttonText}>Switch Camera</span>
        </>
      )}
    </button>
  );
};

export default CameraSwitchButton;

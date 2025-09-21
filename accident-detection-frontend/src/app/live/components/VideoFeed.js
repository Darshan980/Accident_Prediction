// app/live/components/VideoFeed.js - Updated with camera switch
import React from 'react';
import CameraSwitchButton from './CameraSwitchButton';
import styles from '../styles/VideoFeed.module.css';

const VideoFeed = ({ 
  videoRef, 
  isDetectionActive, 
  isLoading, 
  currentDetection, 
  frameCount,
  // New camera switch props
  hasMultipleCameras,
  isSwitchingCamera,
  onSwitchCamera,
  currentCameraInfo
}) => {
  return (
    <div className={styles.videoContainer}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`${styles.video} ${isDetectionActive ? styles.active : styles.hidden}`}
      />
      
      {!isDetectionActive && (
        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>📹</div>
          <h3 className={styles.placeholderTitle}>Camera Preview</h3>
          <p className={styles.placeholderText}>
            {isLoading ? 'Starting detection...' : 'Click Start Detection to begin monitoring'}
          </p>
          {isSwitchingCamera && (
            <p className={styles.switchingText}>
              🔄 Switching camera...
            </p>
          )}
        </div>
      )}
      
      {/* Live Status Badge */}
      {isDetectionActive && (
        <div className={styles.liveStatus}>
          <div className={styles.pulseDot}></div>
          LIVE
        </div>
      )}

      {/* Current Camera Info */}
      {isDetectionActive && hasMultipleCameras && (
        <div className={styles.cameraInfo}>
          <span className={styles.cameraInfoIcon}>{currentCameraInfo.icon}</span>
          <span className={styles.cameraInfoText}>{currentCameraInfo.name}</span>
        </div>
      )}

      {/* Detection Result Overlay */}
      {currentDetection && isDetectionActive && (
        <div className={`${styles.detectionOverlay} ${
          currentDetection.accident_detected ? styles.accident : styles.normal
        }`}>
          <div className={styles.detectionHeader}>
            <span>{currentDetection.accident_detected ? '🚨' : '✅'}</span>
            {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
          </div>
          <div className={styles.confidenceText}>
            Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Frame Counter */}
      {isDetectionActive && (
        <div className={styles.frameCounter}>
          Frames: {frameCount}
        </div>
      )}

      {/* Camera Switch Button */}
      <CameraSwitchButton
        onSwitchCamera={onSwitchCamera}
        hasMultipleCameras={hasMultipleCameras}
        isSwitchingCamera={isSwitchingCamera}
        isDetectionActive={isDetectionActive}
        currentCameraInfo={currentCameraInfo}
      />

      {/* Camera switching overlay */}
      {isSwitchingCamera && isDetectionActive && (
        <div className={styles.switchingOverlay}>
          <div className={styles.switchingContent}>
            <div className={styles.switchingSpinner}>🔄</div>
            <div className={styles.switchingText}>Switching Camera...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;

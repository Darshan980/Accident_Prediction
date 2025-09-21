// app/live/components/VideoFeed.js
import React from 'react';
import styles from '../styles/VideoFeed.module.css';

const VideoFeed = ({ 
  videoRef, 
  isDetectionActive, 
  isLoading, 
  currentDetection, 
  frameCount 
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
        </div>
      )}
      
      {/* Live Status Badge */}
      {isDetectionActive && (
        <div className={styles.liveStatus}>
          <div className={styles.pulseDot}></div>
          LIVE
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
    </div>
  );
};

export default VideoFeed;

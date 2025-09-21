// app/live/components/DetectionPanel.js
import React from 'react';
import styles from '../styles/DetectionPanel.module.css';

const DetectionPanel = ({ 
  currentDetection, 
  isDetectionActive, 
  frameCount, 
  detectionResults 
}) => {
  return (
    <div className={styles.panelContainer}>
      {/* Current Detection Status */}
      <div className={`${styles.statusCard} ${
        currentDetection 
          ? (currentDetection.accident_detected ? styles.accident : styles.normal)
          : styles.inactive
      }`}>
        {currentDetection ? (
          <>
            <div className={styles.statusIcon}>
              {currentDetection.accident_detected ? '🚨' : '✅'}
            </div>
            <div className={`${styles.statusTitle} ${
              currentDetection.accident_detected ? styles.accidentText : styles.normalText
            }`}>
              {currentDetection.accident_detected ? 'ACCIDENT DETECTED' : 'NORMAL TRAFFIC'}
            </div>
            <div className={styles.confidence}>
              Confidence: {(currentDetection.confidence * 100).toFixed(1)}%
            </div>
            <div className={styles.frameInfo}>
              Frame: {currentDetection.frame_id}
            </div>
          </>
        ) : (
          <>
            <div className={styles.statusIcon}>🤖</div>
            <div className={styles.statusTitle}>
              {isDetectionActive ? 'Analyzing video feed...' : 'Detection inactive'}
            </div>
            {isDetectionActive && (
              <div className={styles.frameInfo}>
                Frames processed: {frameCount}
              </div>
            )}
          </>
        )}
      </div>

      {/* Recent Results */}
      <div className={styles.resultsCard}>
        <h4 className={styles.resultsTitle}>Recent Results</h4>
        
        <div className={styles.resultsList}>
          {detectionResults.length === 0 ? (
            <div className={styles.noResults}>
              No results yet
            </div>
          ) : (
            detectionResults.map((result) => (
              <div 
                key={result.id} 
                className={`${styles.resultItem} ${
                  result.type === 'Accident' ? styles.resultAccident : styles.resultNormal
                }`}
              >
                <div className={styles.resultHeader}>
                  <span className={styles.resultType}>
                    {result.type === 'Accident' ? '🚨' : '✅'} {result.type}
                  </span>
                  <span className={styles.resultConfidence}>
                    {result.confidence}%
                  </span>
                </div>
                <div className={styles.resultTimestamp}>
                  {result.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DetectionPanel;

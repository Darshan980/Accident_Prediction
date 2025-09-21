'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'

// Components
import StatsCards from './components/StatsCards'
import FilterBar from './components/FilterBar'
import ResultCard from './components/ResultCard'
import ResultModal from './components/ResultModal'
import NoResults from './components/NoResults'
import QuickActions from './components/QuickActions'

// Hooks
import { useUserResults } from './hooks/useUserResults'

// Styles
import styles from './styles/page.module.css'

const UserResultsPage = () => {
  const { user, isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  
  const {
    results,
    filteredResults,
    loading,
    error,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    selectedResult,
    setSelectedResult,
    handleDownloadReport
  } = useUserResults(user, isAuthenticated, searchParams)

  // Authentication check
  if (!isAuthenticated) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.authRequired}>
          <div className={styles.authRequiredIcon}>🔒</div>
          <h1 className={styles.authRequiredTitle}>Authentication Required</h1>
          <p className={styles.authRequiredText}>Please log in to view your analysis results.</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading your results...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.error}>
          <div className={styles.errorIcon}>⚠️</div>
          <h1 className={styles.errorTitle}>Error Loading Results</h1>
          <p className={styles.errorText}>{error}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContent}>
        {/* Header */}
        <div className={styles.header}>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className={styles.backBtn}
          >
            <ArrowLeft className={styles.backBtnIcon} />
            <span className={styles.backBtnText}>Back to Dashboard</span>
          </button>
          
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <h1 className={styles.headerTitle}>My Analysis Results</h1>
              <p className={styles.headerSubtitle}>Your personal accident detection analysis history</p>
            </div>
            
            <div className={styles.headerRight}>
              <div className={styles.userInfo}>
                <div className={styles.userInfoLabel}>Logged in as</div>
                <div className={styles.userInfoName}>{user.username}</div>
                <div className={styles.userInfoRole}>{user.role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards results={results} />

        {/* Filters and Search */}
        <FilterBar 
          results={results}
          filter={filter}
          setFilter={setFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* Results List */}
        {filteredResults.length === 0 ? (
          <NoResults results={results} />
        ) : (
          <div className={styles.resultsList}>
            {filteredResults.map((result, index) => (
              <ResultCard
                key={result.id || index}
                result={result}
                onViewDetails={setSelectedResult}
                onDownload={handleDownloadReport}
              />
            ))}
          </div>
        )}

        {/* Result Detail Modal */}
        {selectedResult && (
          <ResultModal
            result={selectedResult}
            onClose={() => setSelectedResult(null)}
            onDownload={handleDownloadReport}
          />
        )}

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  )
}

export default UserResultsPage

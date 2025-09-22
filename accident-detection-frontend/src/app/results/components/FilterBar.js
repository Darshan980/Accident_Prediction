import React from 'react'
import { Search } from 'lucide-react'
import styles from '../styles/FilterBar.css'

const FilterBar = ({ results, filter, setFilter, searchTerm, setSearchTerm }) => {
  const filterOptions = [
    { 
      key: 'all', 
      label: 'All', 
      count: results.length,
      className: ''
    },
    { 
      key: 'accidents', 
      label: 'Accidents', 
      count: results.filter(r => r.accident_detected).length,
      className: styles.filterBtnRed
    },
    { 
      key: 'safe', 
      label: 'Safe', 
      count: results.filter(r => !r.accident_detected).length,
      className: styles.filterBtnGreen
    },
    { 
      key: 'upload', 
      label: 'Uploads', 
      count: results.filter(r => r.source === 'upload').length,
      className: styles.filterBtnPurple
    },
    { 
      key: 'live', 
      label: 'Live', 
      count: results.filter(r => r.source === 'live').length,
      className: styles.filterBtnOrange
    }
  ]

  return (
    <div className={styles.filtersCard}>
      <div className={styles.filtersContent}>
        {/* Filter Buttons */}
        <div className={styles.filterButtons}>
          {filterOptions.map(option => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key)}
              className={`
                ${styles.filterBtn} 
                ${option.className} 
                ${filter === option.key ? styles.filterBtnActive : ''}
              `}
            >
              <span className={styles.filterBtnLabel}>{option.label}</span>
              <span className={styles.filterBtnCount}>({option.count})</span>
            </button>
          ))}
        </div>
        
        {/* Search Container */}
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search results..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className={styles.searchClear}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilterBar

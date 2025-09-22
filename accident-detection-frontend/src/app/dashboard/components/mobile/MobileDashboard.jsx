// app/dashboard/components/mobile/MobileDashboard.jsx
import React, { useState } from 'react';
import MobileHeader from './MobileHeader';
import MobileStats from './MobileStats';
import MobileFilters from './MobileFilters';
import MobileLogsList from './MobileLogsList';
import MobileBottomNav from './MobileBottomNav';

const MobileDashboard = ({ 
  user, 
  logs, 
  stats, 
  filter, 
  setFilter,
  currentPage,
  setCurrentPage,
  totalPages,
  paginatedLogs,
  filteredLogs,
  onUpdateStatus,
  onRefresh,
  isRefreshing 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      paddingBottom: '80px' // Space for bottom navigation
    }}>
      <MobileHeader 
        user={user}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        onShowFilters={() => setShowFilters(true)}
      />

      {/* Tab Content */}
      <div style={{ padding: '1rem' }}>
        {activeTab === 'overview' && (
          <MobileStats stats={stats} />
        )}
        
        {activeTab === 'logs' && (
          <>
            <MobileLogsList 
              logs={paginatedLogs}
              onUpdateStatus={onUpdateStatus}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              filteredCount={filteredLogs.length}
            />
          </>
        )}

        {activeTab === 'filters' && (
          <MobileFilters 
            filter={filter}
            setFilter={setFilter}
            filteredCount={filteredLogs.length}
            totalCount={logs.length}
            onClose={() => setActiveTab('logs')}
          />
        )}
      </div>

      <MobileBottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unresolvedCount={stats?.status_breakdown?.unresolved || 0}
      />
    </div>
  );
};

export default MobileDashboard;

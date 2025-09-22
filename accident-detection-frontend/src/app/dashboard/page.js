// app/dashboard/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import StatsOverview from './components/StatsOverview';
import ChartsSection from './components/ChartsSection';
import LogsTable from './components/LogsTable';
import DashboardHeader from './components/DashboardHeader';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorDisplay from './components/ErrorDisplay';
import MobileDashboard from './components/mobile/MobileDashboard';
import { useAuth } from './hooks/useAuth';
import { useDashboardData } from './hooks/useDashboardData';
import { useLogFilters } from './hooks/useLogFilters';
import { useResponsive } from './hooks/useResponsive';

const AccidentDashboard = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const { 
    logs, 
    stats, 
    loading: dataLoading, 
    error: dataError, 
    refreshData,
    updateLogStatus 
  } = useDashboardData();
  
  const {
    filter,
    setFilter,
    filteredLogs,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedLogs
  } = useLogFilters(logs);

  const loading = authLoading || dataLoading;
  const error = authError || dataError;

  if (loading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  if (error && error.includes('Authentication')) {
    return <ErrorDisplay error={error} showLoginButton={true} />;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh' }}>
      <DashboardHeader user={user} onRefresh={refreshData} isRefreshing={dataLoading} />
      
      <StatsOverview stats={stats} />
      
      <ChartsSection stats={stats} />
      
      <LogsTable 
        logs={paginatedLogs}
        filter={filter}
        setFilter={setFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        filteredLogsCount={filteredLogs.length}
        totalLogsCount={logs.length}
        onUpdateStatus={updateLogStatus}
        onRefresh={refreshData}
        isRefreshing={dataLoading}
      />
    </div>
  );
};

export default AccidentDashboard;

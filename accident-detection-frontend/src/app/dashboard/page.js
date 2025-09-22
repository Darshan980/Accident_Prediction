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
import { useDashboardData } from './hooks/useDashboardData'; // This now uses the updated service
import { useLogFilters } from './hooks/useLogFilters';
import { useResponsive } from './hooks/useResponsive';

const AccidentDashboard = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const { isMobile } = useResponsive();
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

  // Only show loading if auth is actually loading AND we don't have user data
  const loading = authLoading && !user;
  const error = authError || dataError;

  // Show loading only if we're actually waiting for authentication
  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (error && error.includes('Authentication')) {
    return <ErrorDisplay error={error} showLoginButton={true} />;
  }

  // If no user but no loading, redirect to login
  if (!user && !authLoading) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/admin';
    }
    return <LoadingSpinner message="Redirecting to login..." />;
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileDashboard
        user={user}
        logs={logs}
        stats={stats}
        filter={filter}
        setFilter={setFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        paginatedLogs={paginatedLogs}
        filteredLogs={filteredLogs}
        onUpdateStatus={updateLogStatus}
        onRefresh={refreshData}
        isRefreshing={dataLoading}
      />
    );
  }

  // Desktop Layout
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

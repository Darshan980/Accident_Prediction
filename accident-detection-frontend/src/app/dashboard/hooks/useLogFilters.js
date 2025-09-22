// app/dashboard/hooks/useLogFilters.js
import { useState, useMemo } from 'react';

export const useLogFilters = (logs, logsPerPage = 10) => {
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort logs
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        if (filter === 'accidents') return log.accident_detected;
        if (filter === 'normal') return !log.accident_detected;
        if (filter === 'unresolved') return log.status === 'unresolved';
        if (filter === 'high_confidence') return log.confidence >= 0.8;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [logs, filter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const startIndex = (currentPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  // Reset to first page when filter changes
  const setFilterWithReset = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  return {
    filter,
    setFilter: setFilterWithReset,
    filteredLogs,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedLogs
  };
};

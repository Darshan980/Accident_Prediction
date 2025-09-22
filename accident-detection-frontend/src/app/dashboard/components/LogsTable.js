// app/dashboard/components/LogsTable.jsx
import React from 'react';
import TableControls from './TableControls';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import Pagination from './Pagination';
import TableFooter from './TableFooter';

const LogsTable = ({ 
  logs, 
  filter, 
  setFilter, 
  currentPage, 
  setCurrentPage, 
  totalPages,
  filteredLogsCount,
  totalLogsCount,
  onUpdateStatus,
  onRefresh,
  isRefreshing 
}) => {
  return (
    <>
      <TableControls 
        filter={filter}
        setFilter={setFilter}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        filteredCount={filteredLogsCount}
        totalCount={totalLogsCount}
      />

      <div style={{ 
        backgroundColor: '#fff', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        overflow: 'hidden',
        marginBottom: '2rem'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <TableHeader />
          <TableBody logs={logs} onUpdateStatus={onUpdateStatus} />
        </table>
      </div>

      <Pagination 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
      />

      <TableFooter 
        totalLogs={totalLogsCount}
        filteredLogs={filteredLogsCount}
      />
    </>
  );
};

export default LogsTable;

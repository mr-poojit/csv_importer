'use client';

import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';

const CRM_COLUMNS = [
  'created_at', 'name', 'email', 'country_code',
  'mobile_without_country_code', 'company', 'city', 'state',
  'country', 'lead_owner', 'crm_status', 'crm_note',
  'data_source', 'possession_time', 'description'
];

function StatusBadge({ status }) {
  const map = {
    GOOD_LEAD_FOLLOW_UP: { cls: 'good', label: 'Good Lead' },
    DID_NOT_CONNECT: { cls: 'dnc', label: 'Not Dialed' },
    BAD_LEAD: { cls: 'bad', label: 'Bad Lead' },
    SALE_DONE: { cls: 'sale', label: 'Sale Done' },
  };
  const info = map[status] || { cls: '', label: status || '—' };
  return <span className={`status-badge ${info.cls}`}>{info.label}</span>;
}

export default function ImportResult({ totalImported, totalSkipped, records }) {
  const totalRecords = totalImported + totalSkipped;

  const downloadCSV = useCallback(() => {
    if (!records || records.length === 0) return;
    const headers = CRM_COLUMNS.join(',');
    const rows = records.map((r) =>
      CRM_COLUMNS.map((col) => {
        const val = String(r[col] || '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_import_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [records]);

  const downloadJSON = useCallback(() => {
    if (!records || records.length === 0) return;
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_import_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [records]);

  // Virtualization state
  const listRef = useRef(null);
  const [listWidth, setListWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      setListWidth(containerRef.current.offsetWidth);
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setListWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [records]);

  const colWidth = 180;
  const tableWidth = Math.max(listWidth, CRM_COLUMNS.length * colWidth + 60);

  const Row = ({ index, style }) => {
    const row = records[index];
    return (
      <div style={{ ...style, display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', alignItems: 'center' }} className="table-row-hover">
        <div className="row-num" style={{ minWidth: 48, padding: '0 8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>{index + 1}</div>
        {CRM_COLUMNS.map((col) => (
          <div key={col} style={{ width: colWidth, padding: '0 16px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row[col] || ''}>
            {col === 'crm_status' ? <StatusBadge status={row[col]} /> : (row[col] || '—')}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <h2 className="section-title">Import Complete 🎉</h2>
      <p className="section-subtitle">
        Your data has been successfully mapped into CRM format.
      </p>

      {/* Summary Cards */}
      <div className="result-summary" id="result-summary">
        <div className="stat-card fade-in">
          <div className="stat-icon total">📊</div>
          <div className="stat-value">{totalRecords}</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon imported">✅</div>
          <div className="stat-value">{totalImported}</div>
          <div className="stat-label">Imported</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon skipped">⚠️</div>
          <div className="stat-value">{totalSkipped}</div>
          <div className="stat-label">Skipped</div>
        </div>
      </div>

      {/* Action Row */}
      <div className="action-row" style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {totalSkipped > 0 && (
            <span>⚠️ {totalSkipped} record(s) skipped — missing both email and phone number.</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={downloadJSON} id="download-json-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download JSON
          </button>
          <button className="btn btn-primary" onClick={downloadCSV} id="download-csv-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>

      {/* Results Table */}
      {records && records.length > 0 && (
        <div className="table-container" id="result-table-container">
          <div className="table-header-bar">
            <div className="table-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              CRM Records
            </div>
            <span className="table-count">{records.length} imported</span>
          </div>

          <div className="table-scroll-wrapper" style={{ overflowX: 'auto', overflowY: 'visible' }} ref={containerRef}>
            <div style={{ width: tableWidth, paddingBottom: 8 }}>
              {/* Header */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '12px 0' }}>
                <div className="row-num" style={{ minWidth: 48, padding: '0 8px', textAlign: 'center' }}>#</div>
                {CRM_COLUMNS.map((col) => {
                  const displayCol = col === 'mobile_without_country_code' ? 'mobile' : col;
                  return (
                    <div key={col} style={{ width: colWidth, padding: '0 16px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayCol}>
                      {displayCol}
                    </div>
                  );
                })}
              </div>

              {/* Virtualized Rows */}
              {listWidth > 0 && (
                <List
                  ref={listRef}
                  height={Math.min(records.length * 44, 400)}
                  itemCount={records.length}
                  itemSize={44}
                  width={tableWidth}
                >
                  {Row}
                </List>
              )}
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .table-row-hover:hover {
          background: var(--bg-glass-strong);
        }
      `}} />
    </div>
  );
}

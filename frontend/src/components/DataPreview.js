'use client';

import { FixedSizeList as List } from 'react-window';
import { useRef, useState, useEffect } from 'react';

export default function DataPreview({ records, columns }) {
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
  }, []);

  if (!records || records.length === 0) return null;

  // Approximate width per column
  const colWidth = 200;
  const tableWidth = Math.max(listWidth, columns.length * colWidth + 60);

  const Row = ({ index, style }) => {
    const row = records[index];
    return (
      <div style={{ ...style, display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', alignItems: 'center' }} className="table-row-hover">
        <div className="row-num" style={{ minWidth: 48, padding: '0 8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>{index + 1}</div>
        {columns.map((col) => (
          <div key={col} style={{ width: colWidth, padding: '0 16px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row[col] || ''}>
            {row[col] || '—'}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fade-in">
      <h2 className="section-title">Preview Your Data</h2>
      <p className="section-subtitle">
        Review the parsed data below before running AI extraction. No AI processing has occurred yet.
      </p>

      <div className="table-container" id="preview-table-container">
        <div className="table-header-bar">
          <div className="table-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Raw CSV Data
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="table-count">{records.length} rows</span>
            <span className="table-count">{columns.length} columns</span>
          </div>
        </div>

        <div className="table-scroll-wrapper" style={{ overflowX: 'auto', overflowY: 'hidden' }} ref={containerRef}>
          <div style={{ width: tableWidth }}>
            {/* Header */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '12px 0' }}>
              <div className="row-num" style={{ minWidth: 48, padding: '0 8px', textAlign: 'center' }}>#</div>
              {columns.map((col) => {
                const displayCol = col.toLowerCase() === 'mobile_without_country_code' ? 'mobile' : col;
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
                height={400}
                itemCount={records.length}
                itemSize={40}
                width={tableWidth}
              >
                {Row}
              </List>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .table-row-hover:hover {
          background: var(--bg-glass-strong);
        }
      `}} />
    </div>
  );
}

'use client';

import { useRef, useState, useCallback } from 'react';

export default function FileUpload({ onFileSelected }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  const validateFile = useCallback((file) => {
    setError('');
    if (!file) return false;
    
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const isCSV = validTypes.includes(file.type) || file.name.endsWith('.csv');
    
    if (!isCSV) {
      setError('Please upload a valid CSV file.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.');
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback((file) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  }, [validateFile, onFileSelected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setError('');
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [onFileSelected]);

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fade-in">
      <h2 className="section-title">Upload Your CSV</h2>
      <p className="section-subtitle">
        Drag & drop your CSV file or click to browse. We support any column layout — our AI will handle the mapping.
      </p>

      {error && (
        <div className="error-banner" id="upload-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      <div
        id="upload-dropzone"
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !selectedFile && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
      >
        <input
          ref={inputRef}
          id="csv-file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          <>
            <div className="upload-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="upload-title">
              {dragOver ? 'Drop your file here!' : 'Drag & Drop your CSV'}
            </div>
            <div className="upload-subtitle">or click anywhere to browse files</div>
            <button className="upload-btn" type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Browse Files
            </button>
            <div className="upload-formats">
              Supports: .csv • Max 10MB • Any column layout
            </div>
          </>
        ) : (
          <div className="file-info" onClick={(e) => e.stopPropagation()}>
            <div className="file-info-left">
              <div className="file-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{formatSize(selectedFile.size)}</div>
              </div>
            </div>
            <button className="file-remove" onClick={removeFile} title="Remove file" id="remove-file-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

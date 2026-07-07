'use client';

import { useState, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import StepIndicator from '@/components/StepIndicator';
import FileUpload from '@/components/FileUpload';
import DataPreview from '@/components/DataPreview';
import ProgressIndicator from '@/components/ProgressIndicator';
import ImportResult from '@/components/ImportResult';
import { parseCSV, importRecordsStream } from '@/lib/api';

export default function HomePage() {
  // Step state: 1=Upload, 2=Preview, 3=Processing, 4=Results
  const [step, setStep] = useState(1);

  // File & data
  const [file, setFile] = useState(null);
  const [rawRecords, setRawRecords] = useState([]);
  const [columns, setColumns] = useState([]);

  // Upload / Parse
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Import progress
  const [progress, setProgress] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [logs, setLogs] = useState([]);

  // Result
  const [result, setResult] = useState(null);
  const [importError, setImportError] = useState('');

  // ---- Step 1: File selected ----
  const handleFileSelected = useCallback((selectedFile) => {
    setFile(selectedFile);
    setParseError('');
    setRawRecords([]);
    setColumns([]);
    setResult(null);
    setImportError('');
    if (!selectedFile) setStep(1);
  }, []);

  // ---- Step 1 → 2: Parse CSV ----
  const handleParse = useCallback(async () => {
    if (!file) return;
    setParsing(true);
    setParseError('');

    try {
      const data = await parseCSV(file);
      if (!data.records || data.records.length === 0) {
        setParseError('No data rows found in the CSV file. Please check the file and try again.');
        setParsing(false);
        return;
      }
      const cols = Object.keys(data.records[0]);
      setRawRecords(data.records);
      setColumns(cols);
      setStep(2);
    } catch (err) {
      setParseError(err.message || 'Failed to parse CSV. Please ensure the backend server is running.');
    } finally {
      setParsing(false);
    }
  }, [file]);

  // ---- Step 2 → 3: Confirm & Import ----
  const handleImport = useCallback(async () => {
    setStep(3);
    setProgress(0);
    setCurrentBatch(0);
    setTotalBatches(0);
    setLogs([]);
    setImportError('');
    setResult(null);

    const allRecords = [];

    try {
      await importRecordsStream(rawRecords, {
        onBatchStart: (event) => {
          setTotalBatches(event.totalBatches);
          setCurrentBatch(event.batchIndex + 1);
          setLogs((prev) => [
            ...prev,
            { message: `⏳ Processing batch ${event.batchIndex + 1} of ${event.totalBatches}...`, processing: true },
          ]);
        },
        onBatchComplete: (event) => {
          const pct = ((event.batchIndex + 1) / event.totalBatches) * 100;
          setProgress(pct);
          if (event.records) {
            allRecords.push(...event.records);
          }
          setLogs((prev) => {
            const updated = prev.map((l) =>
              l.processing ? { ...l, processing: false } : l
            );
            return [
              ...updated,
              {
                message: `✅ Batch ${event.batchIndex + 1} complete — ${event.importedCount} imported, ${event.skippedCount} skipped`,
                processing: false,
              },
            ];
          });
        },
        onComplete: (event) => {
          setProgress(100);
          setResult({
            totalImported: event.totalImported,
            totalSkipped: event.totalSkipped,
            records: event.records || allRecords,
          });
          setLogs((prev) => [
            ...prev.map((l) => ({ ...l, processing: false })),
            { message: `🎉 Import complete! ${event.totalImported} records imported.`, processing: false },
          ]);
          // Transition to results after a brief moment so the user can see 100%
          setTimeout(() => setStep(4), 800);
        },
        onError: (event) => {
          setImportError(event.message || 'An error occurred during import.');
          setLogs((prev) => [
            ...prev.map((l) => ({ ...l, processing: false })),
            { message: `❌ Error: ${event.message}`, processing: false },
          ]);
        },
      });
    } catch (err) {
      setImportError(err.message || 'Failed to connect to the import server.');
      setLogs((prev) => [
        ...prev.map((l) => ({ ...l, processing: false })),
        { message: `❌ Connection error: ${err.message}`, processing: false },
      ]);
    }
  }, [rawRecords]);

  // ---- Step 4 → 1: Start Over ----
  const handleReset = useCallback(() => {
    setStep(1);
    setFile(null);
    setRawRecords([]);
    setColumns([]);
    setResult(null);
    setImportError('');
    setParseError('');
    setProgress(0);
    setLogs([]);
  }, []);

  return (
    <>
      <Header />
      <main className="app-container page-content">
        <StepIndicator currentStep={step} />

        {/* ==================== STEP 1: Upload ==================== */}
        {step === 1 && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <FileUpload onFileSelected={handleFileSelected} />

            {parseError && (
              <div className="error-banner" style={{ marginTop: '16px' }} id="parse-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {parseError}
              </div>
            )}

            <div className="btn-group">
              <button
                id="parse-upload-btn"
                className="btn btn-primary"
                disabled={!file || parsing}
                onClick={handleParse}
              >
                {parsing ? (
                  <>
                    <div className="spinner" />
                    Parsing CSV...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    Parse & Preview
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: Preview ==================== */}
        {step === 2 && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <DataPreview records={rawRecords} columns={columns} />

            <div className="btn-group">
              <button
                className="btn btn-secondary"
                onClick={handleReset}
                id="back-to-upload-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
              </button>
              <button
                className="btn btn-success"
                onClick={handleImport}
                id="confirm-import-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Confirm & Import with AI
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3: Processing ==================== */}
        {step === 3 && (
          <div className="glass-card">
            <ProgressIndicator
              progress={progress}
              totalBatches={totalBatches}
              currentBatch={currentBatch}
              logs={logs}
            />

            {importError && (
              <div className="error-banner" style={{ margin: '0 40px 24px' }} id="import-error">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {importError}
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 4: Results ==================== */}
        {step === 4 && result && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <ImportResult
              totalImported={result.totalImported}
              totalSkipped={result.totalSkipped}
              records={result.records}
            />

            <div className="btn-group" style={{ marginTop: '32px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleReset}
                id="import-another-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Import Another CSV
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

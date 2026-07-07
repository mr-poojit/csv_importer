'use client';

export default function ProgressIndicator({ progress, totalBatches, currentBatch, logs }) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="progress-section fade-in">
      <h2 className="section-title">AI Extraction in Progress</h2>
      <p className="section-subtitle" style={{ marginBottom: '32px' }}>
        Our AI is mapping your data into CRM format. This may take a moment.
      </p>

      <div className="progress-ring-container">
        <svg className="progress-ring" width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle className="progress-ring-bg" cx="80" cy="80" r={radius} />
          <circle
            className="progress-ring-fill"
            cx="80"
            cy="80"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="progress-text">
          <div className="progress-percent">{Math.round(progress)}%</div>
          <div className="progress-label">Complete</div>
        </div>
      </div>

      <div className="progress-status">
        Processing Batch {currentBatch} of {totalBatches}
      </div>
      <div className="progress-detail">
        Mapping fields using AI intelligence...
      </div>

      {logs && logs.length > 0 && (
        <div className="batch-log" id="batch-log">
          {logs.map((log, i) => (
            <div key={i} className={`batch-log-entry ${log.processing ? 'processing' : ''}`}>
              <span className="dot" />
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { mapBatchWithAI } from './services/aiService.js';
import { getDb, insertRecords } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Next.js application
app.use(cors({
  origin: '*', // In production, replace with specific frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase JSON request payload size for large CSV JSON transfers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup multer for memory storage file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Root check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mode: (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) ? 'AI Active' : 'Fallback Smart Parser Active',
    timestamp: new Date()
  });
});

// 1. CSV Parse Endpoint (Takes file and returns raw array of records)
app.post('/api/parse', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please upload a valid CSV file.' });
  }

  const results = [];
  // Read CSV from buffer as a UTF-8 stream
  const csvContent = req.file.buffer.toString('utf-8');
  const stream = Readable.from(csvContent);

  stream
    .pipe(csv({
      mapHeaders: ({ header }) => header.trim() // Trim header names
    }))
    .on('data', (data) => {
      // Filter out empty rows
      const hasValues = Object.values(data).some(val => val !== null && String(val).trim() !== '');
      if (hasValues) {
        results.push(data);
      }
    })
    .on('end', () => {
      console.log(`[Parser] Successfully parsed ${results.length} rows from CSV`);
      res.json({ records: results });
    })
    .on('error', (err) => {
      console.error('[Parser] CSV parsing error:', err);
      res.status(500).json({ error: 'Failed to parse CSV file: ' + err.message });
    });
});

// 2. Standard Sync Import Endpoint
app.post('/api/import', async (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Invalid payload. "records" must be an array of objects.' });
  }

  console.log(`[Import] Received request to process ${records.length} records`);
  
  const batchSize = 10;
  let totalImported = 0;
  let totalSkipped = 0;
  const processedRecords = [];

  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);
      
      const mappedBatch = await mapBatchWithAI(batch, batchIndex);

      for (const record of mappedBatch) {
        const hasEmail = record.email && record.email.trim().length > 0;
        const hasMobile = record.mobile_without_country_code && record.mobile_without_country_code.trim().length > 0;

        if (!hasEmail && !hasMobile) {
          totalSkipped++;
        } else {
          totalImported++;
          processedRecords.push(record);
        }
      }

      // Save valid imported records to SQLite Database
      const batchImported = processedRecords.slice(- (totalImported - (processedRecords.length - batch.length))); 
      if (batchImported.length > 0) {
        await insertRecords(batchImported);
      }
    }

    res.json({
      success: true,
      totalImported,
      totalSkipped,
      records: processedRecords
    });
  } catch (error) {
    console.error('[Import] Error in sync processing:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Streaming Server-Sent Events Import Endpoint (Highly recommended for progress tracking)
app.post('/api/import-stream', async (req, res) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Invalid payload. "records" must be an array of objects.' });
  }

  console.log(`[Import-Stream] Initiating streaming import for ${records.length} records`);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const batchSize = 10;
  let totalImported = 0;
  let totalSkipped = 0;
  const processedRecords = [];

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);
      const totalBatches = Math.ceil(records.length / batchSize);

      sendEvent('batch-start', { batchIndex, totalBatches });

      const mappedBatch = await mapBatchWithAI(batch, batchIndex);
      const batchImported = [];
      let batchSkipped = 0;

      for (const record of mappedBatch) {
        const hasEmail = record.email && record.email.trim().length > 0;
        const hasMobile = record.mobile_without_country_code && record.mobile_without_country_code.trim().length > 0;

        if (!hasEmail && !hasMobile) {
          totalSkipped++;
          batchSkipped++;
        } else {
          totalImported++;
          batchImported.push(record);
          processedRecords.push(record);
        }
      }

      // Save valid imported records to SQLite Database
      if (batchImported.length > 0) {
        await insertRecords(batchImported);
      }

      sendEvent('batch-complete', {
        batchIndex,
        totalBatches,
        importedCount: batchImported.length,
        skippedCount: batchSkipped,
        records: batchImported
      });
    }

    sendEvent('complete', {
      totalImported,
      totalSkipped,
      records: processedRecords
    });
  } catch (error) {
    console.error('[Import-Stream] Error in streaming process:', error);
    sendEvent('error', { message: error.message });
  } finally {
    res.end();
  }
});

// Start server
getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 CRM CSV Importer Backend Running`);
    console.log(`🔗 Port: ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  Database: SQLite (crm.db) Connected`);
    console.log(`===============================================`);
  });
}).catch(err => {
  console.error("Failed to initialize database", err);
});

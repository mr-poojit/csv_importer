import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;
  
  dbInstance = await open({
    filename: './crm.db',
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT,
      name TEXT,
      email TEXT,
      country_code TEXT,
      mobile_without_country_code TEXT,
      company TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      lead_owner TEXT,
      crm_status TEXT,
      crm_note TEXT,
      data_source TEXT,
      possession_time TEXT,
      description TEXT
    );
  `);

  return dbInstance;
}

export async function insertRecords(records) {
  if (!records || records.length === 0) return;
  const db = await getDb();
  
  // Use a transaction for bulk insert
  await db.exec('BEGIN TRANSACTION');
  
  const stmt = await db.prepare(`
    INSERT INTO leads (
      created_at, name, email, country_code, mobile_without_country_code, 
      company, city, state, country, lead_owner, crm_status, crm_note, 
      data_source, possession_time, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const record of records) {
    await stmt.run(
      record.created_at || '',
      record.name || '',
      record.email || '',
      record.country_code || '',
      record.mobile_without_country_code || '',
      record.company || '',
      record.city || '',
      record.state || '',
      record.country || '',
      record.lead_owner || '',
      record.crm_status || 'GOOD_LEAD_FOLLOW_UP',
      record.crm_note || '',
      record.data_source || '',
      record.possession_time || '',
      record.description || ''
    );
  }

  await stmt.finalize();
  await db.exec('COMMIT');
}

import { mapBatchWithAI } from '../services/aiService.js';
import { getDb, insertRecords } from '../db.js';

// Clean up environment variables for tests so it forces fallback
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

describe('AI Service Fallback Mapper', () => {
  it('maps column names correctly using heuristic parser', async () => {
    const rawRecords = [{
      "Full Name": "John Doe",
      "Email Address": "john@test.com",
      "Contact Number": "9876543210",
      "Organization": "Tech Corp",
      "Town": "Mumbai"
    }];

    const result = await mapBatchWithAI(rawRecords, 1, 0);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("John Doe");
    expect(result[0].email).toBe("john@test.com");
    expect(result[0].mobile_without_country_code).toBe("9876543210");
    expect(result[0].company).toBe("Tech Corp");
    expect(result[0].city).toBe("Mumbai");
    expect(result[0].country_code).toBe("+91"); // Indian default heuristic
  });
});

describe('Database Integration', () => {
  it('initializes DB and inserts records', async () => {
    const db = await getDb();
    expect(db).toBeDefined();

    const mockRecords = [{
      created_at: '2026-01-01 10:00:00',
      name: 'Jane Smith',
      email: 'jane@example.com',
      country_code: '+1',
      mobile_without_country_code: '5551234567',
      company: 'Testing LLC',
      city: 'NY',
      state: 'NY',
      country: 'USA',
      lead_owner: 'agent',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: '',
      data_source: '',
      possession_time: '',
      description: ''
    }];

    await insertRecords(mockRecords);

    const rows = await db.all('SELECT * FROM leads WHERE email = ?', ['jane@example.com']);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].name).toBe('Jane Smith');
    expect(rows[0].company).toBe('Testing LLC');
  });
});

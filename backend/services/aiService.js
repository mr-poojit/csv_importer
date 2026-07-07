import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Helper to delay execution for retries
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Smart Heuristic Fallback Parser when AI is unavailable
function fallbackMapRecord(record, index) {
  const result = {
    created_at: '',
    name: '',
    email: '',
    country_code: '',
    mobile_without_country_code: '',
    company: '',
    city: '',
    state: '',
    country: '',
    lead_owner: '',
    crm_status: 'GOOD_LEAD_FOLLOW_UP',
    crm_note: '',
    data_source: '',
    possession_time: '',
    description: '',
  };

  // Convert keys to lowercase for easier matching
  const recordLower = {};
  for (const key in record) {
    recordLower[key.toLowerCase().trim()] = String(record[key] || '').trim();
  }

  // Find date
  const dateKey = Object.keys(recordLower).find(k => k.includes('date') || k.includes('create') || k.includes('time'));
  if (dateKey && recordLower[dateKey]) {
    try {
      const parsedDate = new Date(recordLower[dateKey]);
      if (!isNaN(parsedDate.getTime())) {
        result.created_at = parsedDate.toISOString().replace('T', ' ').substring(0, 19);
      }
    } catch (e) {
      // ignore
    }
  }
  if (!result.created_at) {
    result.created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  // Find Name
  const nameKey = Object.keys(recordLower).find(k => k === 'name' || k.includes('full name') || k.includes('lead name') || k.includes('customer') || k.includes('client'));
  if (nameKey) {
    result.name = recordLower[nameKey];
  } else {
    const firstNameKey = Object.keys(recordLower).find(k => k.includes('first'));
    const lastNameKey = Object.keys(recordLower).find(k => k.includes('last'));
    if (firstNameKey) {
      result.name = (recordLower[firstNameKey] + ' ' + (lastNameKey ? recordLower[lastNameKey] : '')).trim();
    }
  }

  // Find Email
  const emailKeys = Object.keys(recordLower).filter(k => k.includes('email') || k.includes('mail'));
  if (emailKeys.length > 0) {
    const emails = emailKeys.map(k => recordLower[k]).filter(Boolean).join(',').split(/[\s,;]+/);
    if (emails.length > 0) {
      result.email = emails[0];
      if (emails.length > 1) {
        result.crm_note += `Extra Emails: ${emails.slice(1).join(', ')}. `;
      }
    }
  }

  // Find Mobile / Phone
  const phoneKeys = Object.keys(recordLower).filter(k => k.includes('phone') || k.includes('mobile') || k.includes('contact') || k.includes('tel') || k.includes('num'));
  if (phoneKeys.length > 0) {
    const phones = phoneKeys.map(k => recordLower[k]).filter(Boolean).join(',').split(/[\s,;]+/);
    if (phones.length > 0) {
      let mainPhone = phones[0];

      // Try to parse country code
      if (mainPhone.startsWith('+')) {
        const match = mainPhone.match(/^(\+\d{1,4})/);
        if (match) {
          result.country_code = match[1];
          result.mobile_without_country_code = mainPhone.substring(match[1].length).replace(/\D/g, '');
        } else {
          result.mobile_without_country_code = mainPhone.replace(/\D/g, '');
        }
      } else {
        result.mobile_without_country_code = mainPhone.replace(/\D/g, '');
        // If it looks like a standard Indian 10-digit number and has 12 digits starting with 91
        if (result.mobile_without_country_code.length === 12 && result.mobile_without_country_code.startsWith('91')) {
          result.country_code = '+91';
          result.mobile_without_country_code = result.mobile_without_country_code.substring(2);
        } else if (result.mobile_without_country_code.length === 10) {
          result.country_code = '+91'; // default lead country code for CRM
        }
      }

      if (phones.length > 1) {
        result.crm_note += `Extra Phones: ${phones.slice(1).join(', ')}. `;
      }
    }
  }

  // Find Company
  const companyKey = Object.keys(recordLower).find(k => k.includes('company') || k.includes('org') || k.includes('firm') || k.includes('business'));
  if (companyKey) result.company = recordLower[companyKey];

  // Find City/State/Country
  const cityKey = Object.keys(recordLower).find(k => k === 'city' || k.includes('town'));
  if (cityKey) result.city = recordLower[cityKey];

  const stateKey = Object.keys(recordLower).find(k => k === 'state' || k.includes('province') || k.includes('region'));
  if (stateKey) result.state = recordLower[stateKey];

  const countryKey = Object.keys(recordLower).find(k => k === 'country' || k.includes('nation'));
  if (countryKey) result.country = recordLower[countryKey];

  // Find Lead Owner
  const ownerKey = Object.keys(recordLower).find(k => k.includes('owner') || k.includes('assigned') || k.includes('agent'));
  if (ownerKey) result.lead_owner = recordLower[ownerKey];

  // Status mapping
  const statusKey = Object.keys(recordLower).find(k => k.includes('status') || k.includes('stage'));
  if (statusKey) {
    const val = recordLower[statusKey].toUpperCase();
    if (val.includes('FOLLOW') || val.includes('GOOD') || val.includes('INTERESTED')) {
      result.crm_status = 'GOOD_LEAD_FOLLOW_UP';
    } else if (val.includes('NOT CONNECT') || val.includes('BUSY') || val.includes('NO ANSWER')) {
      result.crm_status = 'DID_NOT_CONNECT';
    } else if (val.includes('BAD') || val.includes('JUNK') || val.includes('NOT INTERESTED')) {
      result.crm_status = 'BAD_LEAD';
    } else if (val.includes('SALE') || val.includes('DONE') || val.includes('CLOSED') || val.includes('WON')) {
      result.crm_status = 'SALE_DONE';
    }
  }

  // Data Source mapping
  const sourceKey = Object.keys(recordLower).find(k => k.includes('source') || k.includes('channel') || k.includes('campaign'));
  if (sourceKey) {
    const val = recordLower[sourceKey].toLowerCase();
    const validSources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];
    const matched = validSources.find(src => val.includes(src.replace('_', ' ')) || val.includes(src));
    if (matched) {
      result.data_source = matched;
    }
  }

  // Possession Time
  const possessionKey = Object.keys(recordLower).find(k => k.includes('possession') || k.includes('time') || k.includes('move in'));
  if (possessionKey) result.possession_time = recordLower[possessionKey];

  // Description & General Notes
  const descKey = Object.keys(recordLower).find(k => k.includes('desc') || k.includes('about') || k.includes('msg') || k.includes('message') || k.includes('remark') || k.includes('note'));
  if (descKey) {
    result.description = recordLower[descKey];
  }

  // Gather other extra columns in crm_note
  const mappedKeys = [dateKey, nameKey, emailKeys[0], phoneKeys[0], companyKey, cityKey, stateKey, countryKey, ownerKey, statusKey, sourceKey, possessionKey, descKey].filter(Boolean);
  const extraNotes = [];
  for (const key in record) {
    const keyLower = key.toLowerCase().trim();
    if (!mappedKeys.some(mk => mk.toLowerCase().trim() === keyLower) && record[key]) {
      extraNotes.push(`${key}: ${record[key]}`);
    }
  }
  if (extraNotes.length > 0) {
    result.crm_note += (result.crm_note ? ' | ' : '') + `Additional Info: [${extraNotes.join(', ')}]`;
  }

  result.crm_note = result.crm_note.trim();

  return result;
}

export async function mapBatchWithAI(records, batchIndex, retries = 3) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openAIKey) {
    console.warn(`[AI Service] No API keys detected. Falling back to Heuristic Smart Parser for batch ${batchIndex}.`);
    // Simulate minor delay to mimic network request
    await delay(600);
    return records.map(fallbackMapRecord);
  }

  const prompt = `You are a CRM data cleaning assistant. Map the following array of raw records into the strict CRM format.
You must return a valid JSON object containing a single key "records", which maps to an array of the converted records.
Example output format:
{
  "records": [
    {
      "created_at": "YYYY-MM-DD HH:mm:ss (or any date convertible by JS new Date())",
      "name": "Full name of the lead",
      "email": "Primary email address. If multiple, put the first here, others in crm_note",
      "country_code": "Country calling code, e.g. +91, +1",
      "mobile_without_country_code": "Only the digits, no country code or symbols",
      "company": "Company name",
      "city": "City",
      "state": "State",
      "country": "Country",
      "lead_owner": "Lead owner email or username",
      "crm_status": "Strictly one of: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE",
      "crm_note": "Put remarks, follow-up history, and any extra emails/phones or unmapped columns here",
      "data_source": "Strictly one of: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or empty string \\"\\"",
      "possession_time": "Possession timeline if specified",
      "description": "Any additional descriptive text"
    }
  ]
}

RULES:
1. CRM Status must be exactly one of the four options: GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE.
2. Data Source must be exactly one of the five options: leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots, or \\"\\".
3. If multiple email/phone numbers are present in a record, put the first in the corresponding field and append all others to crm_note.
4. Clean phone numbers: remove symbols, spaces, parentheses. Split country code into country_code and mobile_without_country_code.
5. If both email and mobile numbers are completely missing or empty, you must return them as empty strings ("") for those fields so they can be filtered out.
6. Return ONLY a valid JSON object in the specified format. Do NOT wrap the JSON in markdown code blocks like \`\`\`json. Do NOT output any preamble or chat.

Raw Input Records:
${JSON.stringify(records, null, 2)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (geminiKey) {
        console.log(`[AI Service] Processing batch ${batchIndex} using Gemini (Attempt ${attempt}/${retries})`);

        // Use Google Generative AI SDK
        const genAI = new GoogleGenerativeAI(geminiKey);
        // Using gemini-1.5-flash as it is fast and excellent for structured mapping
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: {
            responseMimeType: 'application/json'
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.records)) return parsed.records;
        if (Array.isArray(parsed)) return parsed;
        throw new Error('Gemini response is not a JSON array or object with records');
      } else if (openAIKey) {
        console.log(`[AI Service] Processing batch ${batchIndex} using OpenAI/OpenRouter (Attempt ${attempt}/${retries})`);

        const isOpenRouter = openAIKey.startsWith('sk-or-');
        const openai = new OpenAI({ 
          apiKey: openAIKey,
          baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined
        });

        const response = await openai.chat.completions.create({
          model: isOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        const text = response.choices[0].message.content;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.records)) return parsed.records;
        if (Array.isArray(parsed)) return parsed;

        // If it parsed as a single object with records inside
        if (typeof parsed === 'object' && parsed !== null) {
          const possibleArray = Object.values(parsed).find(Array.isArray);
          if (possibleArray) return possibleArray;
        }
        throw new Error('OpenAI response could not be parsed into a JSON array or records wrapper');
      }
    } catch (error) {
      console.error(`[AI Service] Error processing batch ${batchIndex} on attempt ${attempt}:`, error.message);
      
      // Fail fast on Auth issues
      if (error.status === 401 || String(error.message).includes('401')) {
        console.warn(`[AI Service] Invalid API Key detected. Falling back to Heuristic Smart Parser immediately.`);
        return records.map(fallbackMapRecord);
      }

      if (attempt === retries) {
        console.warn(`[AI Service] Batch ${batchIndex} exhausted all retries. Falling back to Heuristic Smart Parser.`);
        return records.map(fallbackMapRecord);
      }
      // Wait with exponential backoff (e.g., 1s, 2s, 4s...)
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  return records.map(fallbackMapRecord);
}

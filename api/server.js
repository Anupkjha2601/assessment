/**
 * server.js
 * Simple Express API for assessment
 *
 * Place this file in: assessment/api/server.js
 * Your frontend files (lp1.html, lp2.html) and data/ should be in assessment/ (parent folder).
 *
 * Usage:
 *   cd assessment/api
 *   npm install
 *   PIPEDREAM_ENDPOINT="https://<your-pipedream-url>" node server.js
 *
 * The server will serve static files from the parent folder so you can visit:
 *   http://localhost:3000/../lp1.html  (or just http://localhost:3000/../../lp1.html depending on browser)
 * But recommended: open http://localhost:3000/ and then use direct file paths:
 *   http://localhost:3000/../lp1.html  OR just open lp1.html directly from filesystem for testing.
 *
 * Note: If you deploy the server to a host, update frontend fetch paths to point to the deployed API base URL.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch'); // add this near the other requires


const app = express();
app.use(cors());
app.use(express.json());

// Config
const PORT = process.env.PORT || 3000;
const PIPEDREAM_ENDPOINT = process.env.PIPEDREAM_ENDPOINT || process.env.PIPEDREAM || null;
// Paths: server located in assessment/api -> frontend & data in parent folder
const ROOT_DIR = path.resolve(__dirname); // repository root where server.js now lives
const DATA_DIR = path.join(ROOT_DIR, '../data');

// Helper: load JSON data from data folder with fallback
function loadJson(fileName, fallback = null) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // console.warn(`Failed to read ${filePath}:`, err.message);
    return fallback;
  }
}

// Sample course lists & overviews (used if data files missing)
const UNI1_OVERVIEW = {
  overview: 'Brightfield University - industry aligned programs with strong placement support.'
};
const UNI1_COURSES = {
  courses: [
    { code: 'BTECH_CSE', name: 'B.Tech (CSE)', duration: '4 years' },
    { code: 'MBA', name: 'MBA', duration: '2 years' },
    { code: 'BDES', name: 'B.Des', duration: '4 years' }
  ]
};
const UNI2_OVERVIEW = {
  overview: 'Horizon Institute - practical skills & analytics focused.'
};
const UNI2_COURSES = {
  courses: [
    { code: 'BBA', name: 'BBA', duration: '3 years' },
    { code: 'MSC_DA', name: 'M.Sc Data Analytics', duration: '2 years' }
  ]
};

// Endpoints for University 1
app.get('/api/university1/overview', (req, res) => {
  res.json(UNI1_OVERVIEW);
});
app.get('/api/university1/courses', (req, res) => {
  res.json(UNI1_COURSES);
});
app.get('/api/university1/fees', (req, res) => {
  const data = loadJson('uni1_fees.json', null);
  if (data) return res.json(data);
  // Fallback
  return res.json({
    courses: [
      { name: 'B.Tech (CSE)', fee_range: '₹1.5L - ₹2.5L per year' },
      { name: 'MBA', fee_range: '₹2.0L - ₹3.5L per year' },
      { name: 'B.Des', fee_range: '₹1.2L - ₹1.8L per year' }
    ],
    note: 'Fees shown are indicative and may vary by specialization.'
  });
});

// Endpoints for University 2
app.get('/api/university2/overview', (req, res) => {
  res.json(UNI2_OVERVIEW);
});
app.get('/api/university2/courses', (req, res) => {
  res.json(UNI2_COURSES);
});
app.get('/api/university2/fees', (req, res) => {
  const data = loadJson('uni2_fees.json', null);
  if (data) return res.json(data);
  // Fallback
  return res.json({
    courses: [
      { name: 'BBA', fee_range: '₹60K - ₹1.2L per year' },
      { name: 'M.Sc Data Analytics', fee_range: '₹1.6L - ₹2.8L per year' }
    ],
    note: 'Contact admissions for scholarships and exact fee sheets.'
  });
});

// In-memory leads store
let leads = [];

/**
 * POST /api/leads
 * Accepts JSON:
 * {
 *  university: 'university1' | 'university2',
 *  name, email, phone, state, course, intake, consent, ts
 * }
 *
 * Behavior:
 * - Validates presence of phone
 * - Stores to in-memory array
 * - If PIPEDREAM_ENDPOINT set in environment, forwards payload to that endpoint (best-effort, non-blocking)
 */
app.post('/api/leads', async (req, res) => {
  const lead = req.body || {};
  // basic validation
  if (!lead || !lead.phone) {
    return res.status(400).json({ error: 'Invalid lead payload. phone is required.' });
  }

  // Store lead with timestamp if not provided
  lead.receivedAt = new Date().toISOString();
  leads.push(lead);

  // Try to forward to Pipedream (if configured) but don't fail the request if forward fails
 if (PIPEDREAM_ENDPOINT) {
  try {
    const resp = await fetch(PIPEDREAM_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(lead)
});
    if (!resp.ok) {
      console.warn('Forward to Pipedream returned non-OK:', resp.status);
    }
  } catch (err) {
    console.warn('Failed to forward to Pipedream:', err.message);
  }
}


  return res.json({ ok: true, totalLeads: leads.length });
});

// GET leads (for testing)
app.get('/api/leads', (req, res) => {
  res.json({ count: leads.length, leads });
});

// Serve static files from parent (assessment/) so lp1.html and lp2.html are accessible.
// Note: Static serving of parent directory is deliberate to make local dev simple.
// When deploying to production, consider serving static site from a static host.
app.use('/', express.static(ROOT_DIR, { extensions: ['html', 'htm'] }));

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Serving files from: ${ROOT_DIR}`);
  if (PIPEDREAM_ENDPOINT) console.log('Pipedream forwarding enabled ->', PIPEDREAM_ENDPOINT);
});

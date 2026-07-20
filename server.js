const express = require('express');
const cors = require('cors');
const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

const app = express();
const PORT = process.env.PORT || 8080;

const bigquery = new BigQuery({ projectId: 'ga4-connect-409204' });

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/daily-summary', async (req, res) => {
  try {
    const query = `
      SELECT
        data_date,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions
      FROM \`ga4-connect-409204.searchconsole.searchdata_site_impression\`
      WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
      GROUP BY data_date
      ORDER BY data_date ASC
    `;
    const [rows] = await bigquery.query(query);
    const formatted = rows.map(r => ({
      date: r.data_date,
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) : 0,
      avg_position: 5
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/top-queries', async (req, res) => {
  try {
    const query = `
      SELECT
        query,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions
      FROM \`ga4-connect-409204.searchconsole.searchdata_site_impression\`
      WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
        AND query IS NOT NULL
      GROUP BY query
      ORDER BY clicks DESC
      LIMIT 30
    `;
    const [rows] = await bigquery.query(query);
    const formatted = rows.map(r => ({
      query: r.query,
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) : 0,
      avg_position: 5
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/device-breakdown', async (req, res) => {
  try {
    const query = `
      SELECT
        device,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions
      FROM \`ga4-connect-409204.searchconsole.searchdata_site_impression\`
      WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
      GROUP BY device
      ORDER BY clicks DESC
    `;
    const [rows] = await bigquery.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

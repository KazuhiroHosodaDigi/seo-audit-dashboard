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

// 日次のクリック数・表示回数・CTR・平均順位
app.get('/api/daily-summary', async (req, res) => {
  try {
    const query = `
      SELECT
        data_date AS date,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions,
        SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
        SAFE_DIVIDE(SUM(sum_top_position), SUM(impressions)) AS avg_position
      FROM \`ga4-connect-409204.searchconsole.searchdata_site_impression\`
      WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY)
      GROUP BY data_date
      ORDER BY data_date ASC
    `;
    const options = { useLegacySql: false };
    const [rows] = await bigquery.query({ query, ...options });
    
    const formatted = rows.map(row => ({
      date: row.date.value || row.date,
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      avg_position: (row.avg_position || 0) + 1
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('daily-summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 検索クエリ別ランキング（直近28日）
app.get('/api/top-queries', async (req, res) => {
  try {
    const query = `
      SELECT
        query,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions,
        SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
        SAFE_DIVIDE(SUM(sum_top_position), SUM(impressions)) AS avg_position
      FROM \`ga4-connect-409204.searchconsole.searchdata_site_impression\`
      WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
        AND query IS NOT NULL
      GROUP BY query
      ORDER BY clicks DESC
    `;
    
    const options = { useLegacySql: false, maxResults: 30 };
    const [rows] = await bigquery.query({ query, ...options });
    
    const formatted = rows.map(row => ({
      query: row.query || '(not set)',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      avg_position: (row.avg_position || 0) + 1
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('top-queries error:', err);
    res.status(500).json({ error: err.message });
  }
});

// デバイス別内訳（直近28日）
app.get('/api/device-breakdown', async (req, res) => {
  try {
    const query = `
      SELECT
        device,
        SUM(clicks) AS clicks,
        SUM(impressions) AS impressions
      FROM \`ga4-connect-409204.searchconsole.searchdata_site_impression\`
      WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
      GROUP BY device
      ORDER BY clicks DESC
    `;
    
    const options = { useLegacySql: false };
    const [rows] = await bigquery.query({ query, ...options });
    
    const formatted = rows.map(row => ({
      device: row.device || 'unknown',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('device-breakdown error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  async function redis(cmd) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    return r.json();
  }

  try {
    if (req.method === 'GET') {
      const data = await redis(['ZREVRANGE', 'leaderboard', '0', '19', 'WITHSCORES']);
      const entries = [];
      const result = data.result || [];
      for (let i = 0; i < result.length; i += 2) {
        try {
          const entry = JSON.parse(result[i]);
          entry.score = parseFloat(result[i + 1]);
          entries.push(entry);
        } catch(e) {}
      }
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const { name, score, correct, wrong, skipped } = req.body || {};
      if (!name || score === undefined) return res.status(400).json({ error: 'name and score required' });

      const entry = {
        name: String(name).slice(0, 20),
        correct: Number(correct),
        wrong: Number(wrong),
        skipped: Number(skipped),
        date: Date.now(),
        id: Math.random().toString(36).slice(2, 8)
      };

      await redis(['ZADD', 'leaderboard', String(Number(score)), JSON.stringify(entry)]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

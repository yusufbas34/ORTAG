import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { searchAddress, reverseGeocode } from '../../lib/geocode.js';

export const geocodeRouter = Router();

geocodeRouter.use(requireAuth);

geocodeRouter.get('/search', async (req, res) => {
  const q = req.query.q;
  if (typeof q !== 'string' || q.trim().length < 3) {
    res.status(400).json({ error: 'q parametresi en az 3 karakter olmalıdır.' });
    return;
  }

  try {
    const results = await searchAddress(q);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Adres araması başarısız oldu.' });
  }
});

geocodeRouter.get('/reverse', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({ error: 'lat ve lng parametreleri zorunludur.' });
    return;
  }

  try {
    const result = await reverseGeocode(lat, lng);
    res.json({ result });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Ters adres arama başarısız oldu.' });
  }
});

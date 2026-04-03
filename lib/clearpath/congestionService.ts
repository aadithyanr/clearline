import { getDb } from './mongoClient';
import { mockHospitals } from './mockData';

export const congestionService = {
  async getCongestion(city?: string) {
    try {
      const db = await getDb();

      const query = city ? { city: city.toLowerCase() } : {};
      const hospitals = await db.collection('hospitals').find(query).toArray();
      const hospitalIds = hospitals.map((h: any) => h._id.toString());
      if (hospitalIds.length === 0) throw new Error('No hospitals in DB');

      const snapshots = await db
        .collection('congestion_snapshots')
        .find({ hospitalId: { $in: hospitalIds } })
        .sort({ recordedAt: -1 })
        .toArray();

      const latestByHospital = new Map<string, any>();
      for (const s of snapshots) {
        if (!latestByHospital.has(s.hospitalId)) latestByHospital.set(s.hospitalId, s);
      }

      return hospitalIds.map((id) => latestByHospital.get(id)).filter(Boolean);
    } catch {
      // DB unavailable — generate synthetic congestion for mock hospitals
      const filtered = city
        ? mockHospitals.filter(h => h.city === city.toLowerCase())
        : mockHospitals;
      return filtered.map(h => ({
        hospitalId: h.id,
        occupancyPct: 50 + Math.floor(Math.random() * 40),
        waitMinutes: 10 + Math.floor(Math.random() * 80),
        recordedAt: new Date().toISOString(),
      }));
    }
  }
};


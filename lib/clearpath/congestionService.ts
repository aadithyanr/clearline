import { getDb } from './mongoClient';

export const congestionService = {
  async getCongestion(city?: string) {
    const db = await getDb();

    const query = city ? { city: city.toLowerCase() } : {};
    const hospitals = await db.collection('hospitals').find(query).toArray();
    const hospitalIds = hospitals.map((h: any) => h._id.toString());
    if (hospitalIds.length === 0) return [];

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
  }
};

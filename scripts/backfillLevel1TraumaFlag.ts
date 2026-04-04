import { MongoClient } from 'mongodb';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const isDryRun = process.argv.includes('--dry-run');

function readMongoUriFromEnvFile(): string | undefined {
  const candidates = ['.env.local', '.env'];

  for (const fileName of candidates) {
    const filePath = resolve(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf8');
    const line = content
      .split('\n')
      .map((raw) => raw.trim())
      .find((raw) => raw.startsWith('MONGODB_URI='));

    if (!line) continue;

    const value = line.slice('MONGODB_URI='.length).trim();
    if (!value) continue;

    return value.replace(/^['\"]|['\"]$/g, '');
  }

  return undefined;
}

const uri = process.env.MONGODB_URI || readMongoUriFromEnvFile();

function deriveLevel1TraumaCenter(hospital: any): boolean {
  const specialties = Array.isArray(hospital.specialties) ? hospital.specialties : [];
  const name = String(hospital.name || '').toLowerCase();
  const erBeds = Number(hospital.erBeds || 0);
  const totalBeds = Number(hospital.totalBeds || 0);

  return (
    specialties.includes('trauma') ||
    name.includes('trauma center') ||
    (erBeds >= 30 && totalBeds >= 250)
  );
}

async function run() {
  if (!uri) {
    console.error('MONGODB_URI not set. Pass it as an environment variable.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('clearpath');
    const hospitalsCollection = db.collection('hospitals');

    const docs = await hospitalsCollection
      .find({}, { projection: { _id: 1, name: 1, specialties: 1, erBeds: 1, totalBeds: 1, isLevel1TraumaCenter: 1 } })
      .toArray();

    let changed = 0;
    let level1Count = 0;

    const bulkOps = docs
      .map((doc) => {
        const nextValue = deriveLevel1TraumaCenter(doc);
        if (nextValue) level1Count += 1;

        if (doc.isLevel1TraumaCenter === nextValue) {
          return null;
        }

        changed += 1;
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                isLevel1TraumaCenter: nextValue,
                capabilityUpdatedAt: new Date().toISOString(),
              },
            },
          },
        };
      })
      .filter(Boolean) as any[];

    if (isDryRun) {
      console.log(`Dry run complete: ${docs.length} hospitals scanned.`);
      console.log(`Would update ${changed} hospitals.`);
      console.log(`Derived Level-1 trauma centers: ${level1Count}.`);
      return;
    }

    if (bulkOps.length > 0) {
      await hospitalsCollection.bulkWrite(bulkOps, { ordered: false });
    }

    console.log(`Backfill complete: ${docs.length} hospitals scanned.`);
    console.log(`Updated ${changed} hospitals.`);
    console.log(`Derived Level-1 trauma centers: ${level1Count}.`);
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error('Backfill failed', err);
  process.exit(1);
});

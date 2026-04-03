import CasePageContent from './CasePageContent';
import * as fs from 'fs';
import * as path from 'path';

export default async function CasePage({ params }: any) {
  const resolvedParams = await Promise.resolve(params);
  const caseId = resolvedParams.caseId;

  let initialData = null;
  let initialError = null;

  try {
    const fallbackPath = path.join(process.cwd(), '.next', 'fallback_cases.json');
    if (fs.existsSync(fallbackPath)) {
      const db = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
      if (db[caseId]) {
        initialData = db[caseId];
      } else {
        initialError = "Case not found or expired.";
      }
    } else {
      initialError = "Case database not found.";
    }
  } catch (err) {
    initialError = "Failed to load case data.";
  }
  
  return <CasePageContent caseId={caseId} initialData={initialData} initialError={initialError} />;
}


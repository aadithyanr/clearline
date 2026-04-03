import CasePageContent from './CasePageContent';
import * as fs from 'fs';
import * as path from 'path';

export default async function CasePage({ params }: any) {
  const resolvedParams = await Promise.resolve(params);
  const caseId = resolvedParams.caseId;

  let initialData = null;
  let initialError = null;

  // Determine base URL for API calls (Vercel or local dev)
  const baseUrl = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const apiUrl = `${baseUrl}/api/cases?id=${caseId}`;
  try {
    const res = await fetch(apiUrl);
    if (res.ok) {
      initialData = await res.json();
    } else {
      initialError = `Case not found (status ${res.status})`;
    }
  } catch (err) {
    initialError = 'Failed to load case data.';
  }
  
  return <CasePageContent caseId={caseId} initialData={initialData} initialError={initialError} />;
}


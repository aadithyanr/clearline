import { readCase } from '@/lib/clearpath/caseStore';
import CasePageContent from './CasePageContent';

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  const initialData = await readCase(caseId);
  const initialError = initialData ? null : 'Case not found. It may have expired or the ID is incorrect.';

  return <CasePageContent caseId={caseId} initialData={initialData} initialError={initialError} />;
}

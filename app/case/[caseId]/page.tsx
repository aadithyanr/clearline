import CasePageContent from './CasePageContent';

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <CasePageContent caseId={caseId} initialData={null} initialError={null} />;
}

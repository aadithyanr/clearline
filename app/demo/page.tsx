'use client';

import { useEffect, useMemo, useState } from 'react';

type Scenario =
	| 'closure_reroute'
	| 'hospital_ack'
	| 'hospital_reject'
	| 'intake_packet'
	| 'police_traffic';

type LiveCase = {
	caseId: string;
	status?: string;
	createdAt?: string;
	updatedAt?: string;
	triage?: { severity?: string };
	assignedHospital?: {
		hospital?: { name?: string };
		totalEstimatedMinutes?: number;
		drivingTimeMinutes?: number;
	};
};

type PoliceRegisterEvent = {
	caseId: string;
	ts: number;
	reason: string;
	channel: 'traffic' | 'police_and_traffic';
	severity: 'critical' | 'urgent' | 'non-urgent';
	etaDriftMinutes: number | null;
};

const scenarioOptions: Scenario[] = [
	'closure_reroute',
	'hospital_ack',
	'hospital_reject',
	'intake_packet',
	'police_traffic',
];

function sortLatest(cases: LiveCase[]) {
	return [...cases].sort((a, b) => {
		const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
		const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
		return tb - ta;
	});
}

export default function DemoPage() {
	const [cases, setCases] = useState<LiveCase[]>([]);
	const [casesError, setCasesError] = useState<string | null>(null);
	const [loadingCases, setLoadingCases] = useState(true);

	const [policeEvents, setPoliceEvents] = useState<PoliceRegisterEvent[]>([]);
	const [policeError, setPoliceError] = useState<string | null>(null);

	const [selectedCaseId, setSelectedCaseId] = useState('');
	const [running, setRunning] = useState(false);
	const [actionResult, setActionResult] = useState('Run an action to see output here.');

	async function loadCases(silent = false) {
		if (!silent) setLoadingCases(true);
		try {
			const res = await fetch('/api/dispatch/cases', { cache: 'no-store' });
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload?.error || 'Failed to load cases');
			const list = Array.isArray(payload?.cases) ? payload.cases : [];
			setCases(sortLatest(list));
			setCasesError(null);
		} catch (err) {
			setCasesError(err instanceof Error ? err.message : 'Failed to load cases');
		} finally {
			if (!silent) setLoadingCases(false);
		}
	}

	async function loadPoliceRegister(silent = false) {
		try {
			const res = await fetch('/api/alerts/police-traffic?limit=40', { cache: 'no-store' });
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload?.error || 'Failed to load police register');
			const events = Array.isArray(payload?.events) ? payload.events : [];
			setPoliceEvents(events);
			setPoliceError(null);
		} catch (err) {
			if (!silent) {
				setPoliceError(err instanceof Error ? err.message : 'Failed to load police register');
			}
		}
	}

	useEffect(() => {
		void loadCases(false);
		void loadPoliceRegister(false);

		const casePoll = setInterval(() => void loadCases(true), 5000);
		const policePoll = setInterval(() => void loadPoliceRegister(true), 8000);
		return () => {
			clearInterval(casePoll);
			clearInterval(policePoll);
		};
	}, []);

	const latestSixCases = useMemo(() => sortLatest(cases).slice(0, 6), [cases]);
	const latestFiveHospitalCases = useMemo(() => sortLatest(cases).slice(0, 5), [cases]);

	useEffect(() => {
		if (!latestFiveHospitalCases.length) return;
		const exists = latestFiveHospitalCases.some((c) => c.caseId === selectedCaseId);
		if (!selectedCaseId || !exists) {
			setSelectedCaseId(latestFiveHospitalCases[0].caseId);
		}
	}, [latestFiveHospitalCases, selectedCaseId]);

	async function runAction(scenario: Scenario) {
		if (!selectedCaseId) {
			setActionResult('Select a case first in Hospital Action section.');
			return;
		}

		setRunning(true);
		try {
			const res = await fetch('/api/hospital/simulation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					scenario,
					caseId: selectedCaseId,
					forceTrigger: scenario === 'police_traffic',
				}),
			});

			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload?.error || 'Action failed');

			setActionResult(JSON.stringify(payload, null, 2));

			// Refresh dependent sections after action.
			await Promise.all([loadCases(true), loadPoliceRegister(true)]);
		} catch (err) {
			setActionResult(err instanceof Error ? err.message : 'Action failed');
		} finally {
			setRunning(false);
		}
	}

	return (
		<main className="min-h-screen bg-slate-100 p-6">
			<div className="mx-auto max-w-7xl space-y-6">
				<div>
					<h1 className="text-2xl font-black tracking-tight text-slate-900">Demo Control Room</h1>
					<p className="text-sm text-slate-600 mt-1">
						Cases are sorted by latest update. Demo list shows last 6 only. Hospital action picker shows last 5 only.
					</p>
				</div>

				<section className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
					<h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Latest Cases (Last 6)</h2>
					{loadingCases ? (
						<p className="mt-3 text-sm text-slate-500">Loading cases...</p>
					) : casesError ? (
						<p className="mt-3 text-sm text-red-600">{casesError}</p>
					) : latestSixCases.length === 0 ? (
						<p className="mt-3 text-sm text-slate-500">No active cases found.</p>
					) : (
						<div className="mt-3 overflow-x-auto">
							<table className="min-w-full text-sm">
								<thead className="bg-slate-50 text-slate-600">
									<tr>
										<th className="px-3 py-2 text-left">Case ID</th>
										<th className="px-3 py-2 text-left">Severity</th>
										<th className="px-3 py-2 text-left">Status</th>
										<th className="px-3 py-2 text-left">Hospital</th>
										<th className="px-3 py-2 text-left">ETA</th>
										<th className="px-3 py-2 text-left">Updated</th>
									</tr>
								</thead>
								<tbody>
									{latestSixCases.map((c) => (
										<tr key={c.caseId} className="border-t border-slate-100">
											<td className="px-3 py-2 font-semibold text-slate-800">{c.caseId}</td>
											<td className="px-3 py-2">{String(c.triage?.severity || 'unknown')}</td>
											<td className="px-3 py-2">{String(c.status || 'unknown')}</td>
											<td className="px-3 py-2">{String(c.assignedHospital?.hospital?.name || 'Unknown')}</td>
											<td className="px-3 py-2">~{Number(c.assignedHospital?.drivingTimeMinutes ?? 0)} min</td>
											<td className="px-3 py-2 text-slate-500">{new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleString()}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section className="grid gap-6 lg:grid-cols-2">
					<div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
						<h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Hospital Action (Last 5 Cases)</h2>

						<div className="mt-3 grid gap-3">
							<label className="text-sm font-semibold text-slate-700">
								Select Case
								<select
									value={selectedCaseId}
									onChange={(e) => setSelectedCaseId(e.target.value)}
									className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
								>
									{latestFiveHospitalCases.map((c) => (
										<option key={c.caseId} value={c.caseId}>
											{c.caseId} | {String(c.status || 'unknown')} | {String(c.assignedHospital?.hospital?.name || 'Unknown')}
										</option>
									))}
								</select>
							</label>

								<div>
									<p className="text-sm font-semibold text-slate-700 mb-2">Scenarios</p>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{scenarioOptions.map((s) => (
											<button
												key={s}
												onClick={() => runAction(s)}
												disabled={running || !selectedCaseId}
												className="rounded bg-amber-400 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-900 hover:bg-amber-300 disabled:opacity-50"
											>
												{running ? 'Running...' : s}
											</button>
										))}
									</div>
								</div>
						</div>

						<pre className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 overflow-auto">
{actionResult}
						</pre>
					</div>

					<div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
						<h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Police Case Register</h2>
						<p className="text-xs text-slate-500 mt-1">Shows police/traffic coordination API actions (latest first).</p>

						{policeError ? (
							<p className="mt-3 text-sm text-red-600">{policeError}</p>
						) : policeEvents.length === 0 ? (
							<p className="mt-3 text-sm text-slate-500">No police coordination events yet.</p>
						) : (
							<div className="mt-3 overflow-x-auto max-h-[420px]">
								<table className="min-w-full text-sm">
									<thead className="bg-slate-50 text-slate-600 sticky top-0">
										<tr>
											<th className="px-3 py-2 text-left">Time</th>
											<th className="px-3 py-2 text-left">Case</th>
											<th className="px-3 py-2 text-left">Channel</th>
											<th className="px-3 py-2 text-left">Severity</th>
											<th className="px-3 py-2 text-left">ETA Drift</th>
											<th className="px-3 py-2 text-left">Reason</th>
										</tr>
									</thead>
									<tbody>
										{policeEvents.map((e) => (
											<tr key={`${e.caseId}-${e.ts}-${e.channel}`} className="border-t border-slate-100">
												<td className="px-3 py-2 text-slate-500">{new Date(e.ts).toLocaleString()}</td>
												<td className="px-3 py-2 font-semibold text-slate-800">{e.caseId}</td>
												<td className="px-3 py-2">{e.channel}</td>
												<td className="px-3 py-2">{e.severity}</td>
												<td className="px-3 py-2">{e.etaDriftMinutes ?? '-'}</td>
												<td className="px-3 py-2 text-slate-600">{e.reason}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</section>
			</div>
		</main>
	);
}

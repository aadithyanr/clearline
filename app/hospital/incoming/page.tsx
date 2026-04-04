'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type IncomingCase = {
  caseId: string;
  severity: string;
  status: string;
  hospitalAckStatus: 'pending' | 'acknowledged' | 'rejected' | string;
  hospitalName: string;
  hospitalId?: string;
  updatedAt: string;
  createdAt: string;
};

type IntakePacket = {
  packetId: string;
  caseId: string;
  hospitalName?: string;
  status: 'sent' | 'received';
  sentAt: string;
  receivedAt?: string;
};

export default function HospitalIncomingPage() {
  const [hospitalId, setHospitalId] = useState('');
  const [ackStatus, setAckStatus] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (hospitalId.trim()) params.set('hospitalId', hospitalId.trim());
    if (ackStatus) params.set('ackStatus', ackStatus);
    return `/api/hospital/incoming?${params.toString()}`;
  }, [hospitalId, ackStatus]);

  const { data, error, isLoading, mutate } = useSWR(query, fetcher, { refreshInterval: 5000 });

  const cases = (data?.cases ?? []) as IncomingCase[];
  const counts = data?.counts ?? { total: 0, pending: 0, acknowledged: 0, rejected: 0 };
  const packets = (data?.packets ?? []) as IntakePacket[];
  const packetCounts = data?.packetCounts ?? { total: 0, sent: 0, received: 0 };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Hospital Incoming Monitor</h1>
        <p className="text-sm text-slate-600 mt-1">Live feed for ACK/reject and incoming emergency assignments.</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              placeholder="Filter by hospitalId"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={ackStatus}
              onChange={(e) => setAckStatus(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All ACK states</option>
              <option value="pending">pending</option>
              <option value="acknowledged">acknowledged</option>
              <option value="rejected">rejected</option>
            </select>
            <button
              onClick={() => mutate()}
              className="rounded bg-sky-600 px-3 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Stat label="Total" value={counts.total} />
            <Stat label="Pending" value={counts.pending} />
            <Stat label="Acknowledged" value={counts.acknowledged} />
            <Stat label="Rejected" value={counts.rejected} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Stat label="Packets Total" value={packetCounts.total} />
            <Stat label="Packets Sent" value={packetCounts.sent} />
            <Stat label="Packets Received" value={packetCounts.received} />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading && <p className="p-4 text-sm text-slate-500">Loading incoming feed...</p>}
          {error && <p className="p-4 text-sm text-red-600">Failed to load feed.</p>}
          {!isLoading && !error && cases.length === 0 && (
            <p className="p-4 text-sm text-slate-500">No cases for current filter.</p>
          )}
          {!isLoading && !error && cases.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Case</th>
                    <th className="px-3 py-2 text-left">Severity</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">ACK</th>
                    <th className="px-3 py-2 text-left">Hospital</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.caseId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-800">{c.caseId}</td>
                      <td className="px-3 py-2">{c.severity}</td>
                      <td className="px-3 py-2">{c.status}</td>
                      <td className="px-3 py-2">{c.hospitalAckStatus}</td>
                      <td className="px-3 py-2">{c.hospitalName}</td>
                      <td className="px-3 py-2 text-slate-500">{new Date(c.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Pre-arrival Intake Packets</h2>
          </div>
          {packets.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No intake packets yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Packet</th>
                    <th className="px-3 py-2 text-left">Case</th>
                    <th className="px-3 py-2 text-left">Hospital</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Sent</th>
                    <th className="px-3 py-2 text-left">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {packets.map((p) => (
                    <tr key={p.packetId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-800">{p.packetId}</td>
                      <td className="px-3 py-2">{p.caseId}</td>
                      <td className="px-3 py-2">{p.hospitalName ?? '-'}</td>
                      <td className="px-3 py-2">{p.status}</td>
                      <td className="px-3 py-2 text-slate-500">{new Date(p.sentAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-slate-500">{p.receivedAt ? new Date(p.receivedAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-[0.7rem] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

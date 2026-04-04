import { NextRequest } from 'next/server';
import { readLiveCases } from '@/lib/clearpath/caseStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const pushCases = async () => {
        const cases = await readLiveCases();
        controller.enqueue(
          encoder.encode(`event: cases\ndata: ${JSON.stringify({ cases, ts: Date.now() })}\n\n`),
        );
      };

      await pushCases();

      const intervalId = setInterval(pushCases, 3000);
      const keepAliveId = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        clearInterval(keepAliveId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

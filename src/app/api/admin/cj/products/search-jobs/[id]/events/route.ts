import { NextRequest } from 'next/server';
import { getSearchJob } from '@/lib/db/search-jobs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let lastStatus = '';
      let pollCount = 0;
      const maxPolls = 600;

      const poll = async () => {
        try {
          const job = await getSearchJob(jobId);
          
          if (!job) {
            sendEvent({ 
              type: 'error', 
              message: 'Job not found' 
            });
            controller.close();
            return;
          }

          sendEvent({
            type: 'progress',
            status: job.status,
            found_count: job.found_count,
            processed_count: job.processed_count,
            requested_quantity: job.requested_quantity,
            progress_message: job.progress_message,
            error_message: job.error_message,
          });

          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            sendEvent({
              type: 'complete',
              status: job.status,
              found_count: job.found_count,
              message: job.progress_message,
              error: job.error_message,
            });
            controller.close();
            return;
          }

          pollCount++;
          if (pollCount >= maxPolls) {
            sendEvent({
              type: 'timeout',
              message: 'SSE connection timeout - please refresh',
            });
            controller.close();
            return;
          }

          setTimeout(poll, 2000);
        } catch (e: any) {
          sendEvent({
            type: 'error',
            message: e?.message || 'SSE polling error',
          });
          controller.close();
        }
      };

      poll();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

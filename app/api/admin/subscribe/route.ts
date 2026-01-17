import { adminSettingsSubscribers } from '../settings/route';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        const payload = 'data: ' + JSON.stringify(data) + '\n\n';
        controller.enqueue(new TextEncoder().encode(payload));
      };

      const unsub = adminSettingsSubscribers.subscribe(send);

      const keepAlive = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
      }, 20000);

      controller.enqueue(new TextEncoder().encode('event: connected\n' + 'data: {}\n\n'));

      // When the client disconnects
      // @ts-ignore
      controller.oncancel = () => {
        clearInterval(keepAlive);
        unsub();
        controller.close();
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}

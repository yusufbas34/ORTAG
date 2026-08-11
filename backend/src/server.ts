import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createSocketServer } from './realtime/socket.js';

const PORT = Number(process.env.PORT ?? 4000);

const app = createApp();
const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`TAG backend listening on http://localhost:${PORT}`);
});

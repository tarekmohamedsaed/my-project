const QuickDB = require('quick.db');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();
const notificationsDB = new QuickDB();

wss.on('connection', (ws, req) => {
  const userId = req.url.split('?id=')[1];
  if (userId) {
    clients.set(userId, ws);
    console.log(`Client connected: ${userId}`);

    ws.on('close', () => {
      clients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    });
  }
});

async function sendNotification(userId, type, message) {
  const client = clients.get(userId);
  const notification = { type, message, timestamp: new Date().toISOString() };

  // Save notification to QuickDB
  await notificationsDB.push(`notifications_${userId}`, notification);

  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(notification));
    console.log(`Notification sent to ${userId}: ${message}`);
  } else {
    console.log(`Failed to send notification to ${userId}: Client not connected.`);
  }
}

async function getNotifications(userId) {
  return await notificationsDB.get(`notifications_${userId}`) || [];
}

module.exports = { sendNotification, getNotifications };
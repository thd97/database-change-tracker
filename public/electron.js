const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Require các driver DB
const { MongoClient } = require('mongodb');
const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');
const { Menu } = require('@mui/material');


function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../tequila-logo.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Tải React dev server trong development
  win.loadURL('http://localhost:3000');
//   win.openDevTools();
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC: Nhận yêu cầu connect DB từ renderer
ipcMain.handle('db-connect', async (event, { dbType, connectionInfo }) => {
  try {
    if (dbType === 'mongodb') {
      const client = new MongoClient(connectionInfo.uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const dbs = await client.db().admin().listDatabases();
      await client.close();
      return { success: true, databases: dbs.databases.map(db => db.name) };
    } else if (dbType === 'postgresql') {
      const client = new PgClient({
        host: connectionInfo.host,
        port: connectionInfo.port,
        user: connectionInfo.username,
        password: connectionInfo.password,
        database: connectionInfo.database,
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      const res = await client.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
      await client.end();
      return { success: true, databases: res.rows.map(r => r.datname) };
    } else if (dbType === 'sql') {
      // MySQL
      const conn = await mysql.createConnection({
        host: connectionInfo.host,
        port: connectionInfo.port,
        user: connectionInfo.username,
        password: connectionInfo.password,
      });
      const [rows] = await conn.query('SHOW DATABASES');
      await conn.end();
      return { success: true, databases: rows.map(r => r.Database) };
    }
    return { success: false, error: 'Unknown dbType' };
  } catch (err) {
    return { success: false, error: err.message || 'Kết nối thất bại' };
  }
});

// Helper: Chuyển ObjectId, Date thành string đệ quy cho object
function serializeMongo(obj) {
  if (Array.isArray(obj)) return obj.map(serializeMongo);
  if (obj && typeof obj === 'object') {
    if (obj._bsontype === 'ObjectID' || obj._bsontype === 'ObjectId') return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    const out = {};
    for (const k in obj) out[k] = serializeMongo(obj[k]);
    return out;
  }
  return obj;
}

// Quản lý change stream và client theo channel
const mongoStreams = {};

// IPC: Theo dõi log MongoDB Change Stream, đa channel
ipcMain.on('db-watch-log', async (event, { uri, database, channel }) => {
  if (!channel) return; // Bắt buộc phải có channel
  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db(database);
    const changeStream = db.watch([], { fullDocument: 'updateLookup' });
    mongoStreams[channel] = { changeStream, client };
    changeStream.on('change', (change) => {
      event.sender.send(`${channel}`, {
        operation: change.operationType,
        collection: change.ns.coll,
        _id: change.documentKey && change.documentKey._id
          ? serializeMongo(change.documentKey._id)
          : undefined,
        time: change.clusterTime ? new Date(change.clusterTime.getHighBits() * 1000).toISOString() : new Date().toISOString(),
        fullDocument: serializeMongo(change.fullDocument),
        updateDescription: serializeMongo(change.updateDescription),
      });
    });
    changeStream.on('error', (err) => {
      event.sender.send(`${channel}-error`, err.message || 'Change stream error');
    });
  } catch (err) {
    if (client) await client.close();
    event.sender.send(`${channel}-error`, err.message || 'Không thể mở change stream');
  }
});

// IPC: Unsubscribe change stream cho channel
ipcMain.on('db-log-unsubscribe', async (event, { channel }) => {
  if (channel && mongoStreams[channel]) {
    try {
      await mongoStreams[channel].changeStream.close();
      await mongoStreams[channel].client.close();
    } catch {}
    delete mongoStreams[channel];
  }
});
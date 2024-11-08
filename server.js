const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');

const app = express();
const port = 3000;

// Serve static files
app.use(express.static('public'));

// Connect to SQLite database
let db = new sqlite3.Database('/home/admin/databases/current_database.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log('Connected to the database: current_database.db');
    }
});

// API to fetch table noise levels
app.get('/tables', async (req, res) => {
    try {
        const tables = await getAllTableData();
        res.json(tables);
    } catch (err) {
        console.error('Error fetching table data:', err);
        res.status(500).send(err.message);
    }
});

// Helper function to get table noise data
const getAllTableData = () => {
    return new Promise((resolve, reject) => {
        const tableNames = [
            'Table_1', 'Table_2', 'Table_3', 'Table_4', 'Table_5', 'Table_6',
            'Table_7', 'Table_8', 'Table_9', 'Table_10', 'Table_11', 'Table_12',
            'Table_13', 'Table_14', 'Table_15', 'Table_16', 'Table_17', 'Table_18'
        ];
        const promises = tableNames.map(table => getLatestNoiseLevel(table));
        Promise.all(promises)
            .then(data => resolve(data))
            .catch(err => reject(err));
    });
};

const getLatestNoiseLevel = (tableName) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT mic_reading, date, time FROM ${tableName} ORDER BY date DESC, time DESC LIMIT 1`;
        db.get(sql, [], (err, row) => {
            if (err) {
                console.error(`Error fetching data for ${tableName}:`, err);
                reject(err);
            }
            resolve({
                table_name: tableName,
                noise_level: row ? row.mic_reading : 0,
                timestamp: row ? `${row.date} ${row.time}` : 'N/A'
            });
        });
    });
};

// Start HTTP server
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('New client connected');

    // Function to send table data to the client
    const sendTableData = async () => {
        try {
            const tables = await getAllTableData();
            console.log("Sending data to WebSocket clients:", tables); // Log data being sent to WebSocket
            ws.send(JSON.stringify(tables));
        } catch (error) {
            console.error('Error sending table data:', error);
        }
    };

    // Send table data every 5 seconds
    const interval = setInterval(sendTableData, 100);

    // Clean up when the connection is closed
    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(interval);
    });
});
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const logger = require('pino')();

// Shared state managed by the service
let sock = null;
let currentQR = null;
let connectionStatus = 'disconnected'; // possible values: disconnected, connecting, connected, qr_pending

async function connectToWhatsApp() {
    if (sock) { // If a connection attempt is already in progress or established
        console.log('Connection attempt already in progress or established.');
        // Optionally, you could return the existing sock or a status
        // For now, we prevent re-running the full setup if sock exists.
        // If you need to force a reconnect, sock should be nullified first.
        return sock;
    }

    connectionStatus = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false, // We will handle QR code display via Express
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            currentQR = qr;
            connectionStatus = 'qr_pending';
            console.log('QR code generated. Scan please.');
        }
        if (connection === 'close') {
            currentQR = null;
            const statusCode = (lastDisconnect.error)?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                connectionStatus = 'disconnected (logged out)';
                console.log('Connection closed: Logged out. Please delete auth_info_baileys and restart.');
                // Optional: Clean up auth_info_baileys directory here
                // fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
                sock = null; // Nullify sock so a new connection can be made if desired
            } else {
                connectionStatus = `disconnected (error: ${lastDisconnect.error_reason || statusCode})`;
                console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting...');
                // Nullify sock before attempting to reconnect to ensure fresh setup
                // This is important if connectToWhatsApp is called again externally or internally
                // sock = null; // Be careful with this if you have automatic internal retries.
                // For now, we assume an external mechanism (like in index.js) might retry connectToWhatsApp()
                // or the app needs a restart for critical errors.
                // A robust retry might involve delaying and then calling connectToWhatsApp() again.
                // For simplicity, we'll let the current logic in index.js handle initiation.
                // If a reconnect is desired here, ensure 'sock' is cleared before calling connectToWhatsApp()
                // to avoid the initial check blocking it.
                 if (statusCode !== DisconnectReason.restartRequired && statusCode !== DisconnectReason.connectionReplaced ) {
                    // Don't automatically reconnect for loggedOut, restartRequired, or connectionReplaced
                    // sock = null; // Clear sock to allow re-initiation
                    // connectToWhatsApp(); // This would be an internal retry
                 } else {
                    sock = null; // Allow re-initiation for these specific cases if needed
                 }
            }
        } else if (connection === 'open') {
            currentQR = null;
            connectionStatus = 'connected';
            console.log('Opened connection');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        console.log('Received message:', JSON.stringify(m, undefined, 2));
        // Example: auto-reply
        // if (m.messages[0] && !m.messages[0].key.fromMe) {
        //     await sock.sendMessage(m.messages[0].key.remoteJid, { text: 'Echo: ' + m.messages[0].message?.conversation });
        // }
    });

    console.log('Baileys socket initialized');
    return sock; // Return the socket instance
}

function getQR() {
    return currentQR;
}

function getConnectionStatus() {
    // More detailed status based on sock properties if available
    if (sock && sock.ws && sock.ws.isOpen) {
        return 'connected (socket open)';
    }
    if (sock && sock.ev && sock.ev.listenerCount('connection.update') > 0 && connectionStatus === 'connecting') {
         return 'connecting (socket initializing)';
    }
    return connectionStatus;
}

function getSocket() {
    return sock;
}

module.exports = { connectToWhatsApp, getQR, getConnectionStatus, getSocket };

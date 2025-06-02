const express = require('express');
const qrcodeTerminal = require('qrcode-terminal'); // To display QR in terminal
const whatsappService = require('./whatsappService'); // Import the service

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.static('public'));

// Route to get QR code
app.get('/qr', (req, res) => {
    const qr = whatsappService.getQR();
    if (qr) {
        res.type('text/plain').send(qr);
    } else {
        res.status(404).send('QR code not available. Current status: ' + whatsappService.getConnectionStatus());
    }
});

// Route to get connection status
app.get('/status', (req, res) => {
    const status = whatsappService.getConnectionStatus();
    res.send({ status: status });
});

// Route to send a message
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body; // Expect number (e.g., '1234567890@s.whatsapp.net') and message

    if (!number || !message) {
        return res.status(400).send({ success: false, error: 'Missing "number" or "message" in request body.' });
    }

    const sock = whatsappService.getSocket();
    const status = whatsappService.getConnectionStatus();

    if (!sock || !status.startsWith('connected')) {
         return res.status(503).send({ success: false, error: 'WhatsApp service not connected. Current status: ' + status });
    }

    try {
        // Validate WhatsApp ID format (jid)
        // The number should be in the format <country_code><number>@s.whatsapp.net, e.g., 11234567890@s.whatsapp.net
        if (!number.includes('@s.whatsapp.net')) {
            return res.status(400).send({ success: false, error: 'Invalid number format. Must be like 1234567890@s.whatsapp.net' });
        }

        const [result] = await sock.onWhatsApp(number);
        if (!result || !result.exists) {
            return res.status(400).send({ success: false, error: `Number ${number} is not registered on WhatsApp.` });
        }

        await sock.sendMessage(number, { text: message });
        res.send({ success: true, message: `Message sent to ${number}` });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).send({ success: false, error: 'Failed to send message', details: error.message });
    }
});

app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log('Initializing WhatsApp service...');
    try {
        await whatsappService.connectToWhatsApp(); // Initialize WhatsApp connection
        console.log('WhatsApp service initialization process started.');
        // Note: connectToWhatsApp now handles its own socket instance internally.
        // We use getSocket() to retrieve it when needed (e.g., for sending messages).
    } catch (err) {
        console.error('Failed to initialize WhatsApp service on startup:', err);
        // The application will still run, but WhatsApp functionalities will be unavailable
        // until a connection is established (e.g. if there's a retry mechanism or manual restart of the service part)
    }
});

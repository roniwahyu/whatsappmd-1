# WhatsApp Multi-Device Gateway using Baileys and Express

This project implements a WhatsApp multi-device gateway using `@whiskeysockets/baileys` and Express.js. It allows you to connect to WhatsApp, receive messages, and send messages via HTTP API endpoints.

## Prerequisites

*   Node.js (v18 or higher recommended)
*   npm

## Installation

1.  **Clone the repository (if applicable) or download the files.**
2.  **Navigate to the project directory:**
    ```bash
    cd your-project-directory
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

1.  **Start the server:**
    ```bash
    npm start
    ```
2.  The server will start, typically on port 3000.
3.  On the first run, or if not authenticated, a QR code will be generated in the server console. You need to scan this QR code with your WhatsApp mobile app (Linked Devices -> Link a device).
4.  The `/qr` endpoint can also be used to view the QR code if available.

## API Endpoints

*   **`GET /qr`**:
    *   Displays the current QR code in the server terminal and sends the terminal-formatted QR string as a response.
    *   Scan this QR code with WhatsApp to connect.
    *   If no QR code is available (e.g., already connected or an error occurred), it returns a 404 status.

*   **`GET /status`**:
    *   Returns the current connection status of the WhatsApp service.
    *   Example response: `{"status":"connected (socket open)"}` or `{"status":"qr_pending"}`

*   **`POST /send-message`**:
    *   Sends a text message to a specified WhatsApp number.
    *   **Request Body (JSON):**
        ```json
        {
          "number": "YOUR_RECIPIENT_JID@s.whatsapp.net",
          "message": "Hello from the Baileys Express Gateway!"
        }
        ```
        *   `number`: The recipient's JID (e.g., `12345678901@s.whatsapp.net`). You can get this from message events or by knowing the user's WhatsApp ID structure.
        *   `message`: The text message to send.
    *   **Success Response (200):**
        ```json
        {
          "success": true,
          "message": "Message sent to YOUR_RECIPIENT_JID@s.whatsapp.net"
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: If `number` or `message` is missing, or if the number format is invalid, or the number is not on WhatsApp.
        *   `503 Service Unavailable`: If the WhatsApp service is not connected.
        *   `500 Internal Server Error`: If an unexpected error occurs during message sending.

## Authentication

*   Authentication information is stored in the `auth_info_baileys` directory (created automatically).
*   If you want to re-authenticate or switch numbers, delete this directory and restart the application. A new QR code will be generated.
*   If you are logged out (e.g., from WhatsApp mobile), you might need to delete this directory to get a new QR code.

## Logging

*   The application logs events to the console, including connection status, QR codes, and incoming messages (in JSON format).
*   The Baileys library uses `pino` for logging, which provides detailed debug information.

## Project Structure

*   `index.js`: Main file, sets up the Express server and routes.
*   `whatsappService.js`: Handles Baileys connection, event listening, and exposes functions for interaction.
*   `auth_info_baileys/`: Directory where session credentials are stored. (Add to `.gitignore` if not already).
*   `package.json`: Project metadata and dependencies.
*   `README.md`: This file.

## Important Notes

*   **JID Format**: Ensure the recipient number for sending messages is in the correct JID format (e.g., `<countrycode><phonenumber>@s.whatsapp.net`).
*   **Rate Limiting**: Be mindful of WhatsApp's unofficial API usage policies. Sending too many messages too quickly might lead to your number being temporarily or permanently blocked.
*   **Error Handling**: The current error handling is basic. For a production environment, more robust error handling and retry mechanisms would be necessary.
*   **QR Code on Frontend**: The `/qr` endpoint currently sends a text representation suitable for the terminal. For a web frontend, you would typically convert the raw QR string (available in `whatsappService.getQR()`) into an image (e.g., using a library like `qrcode` on the frontend or backend).

## How to get JID?
You can get the JID of a user when they send a message to your connected WhatsApp number. The incoming message object (logged to the console by `whatsappService.js`) contains the `remoteJid` field, which is the JID of the sender.
For example: `{"key":{"remoteJid":"12345678901@s.whatsapp.net", ...}}`
Here, `12345678901@s.whatsapp.net` is the JID.

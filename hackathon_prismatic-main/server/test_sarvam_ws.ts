import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.SARVAM_API_KEY;

if (!apiKey) {
    console.error("Missing SARVAM_API_KEY");
    process.exit(1);
}

// const wsUrl = 'wss://api.sarvam.ai/speech-to-text-translate/ws';
// Based on search results, sometimes we need to pass parameters or use /v1/:
// wss://api.sarvam.ai/speech-to-text-translate/ws
const wsUrl = 'wss://api.sarvam.ai/speech-to-text-translate/ws';

console.log('Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl, {
    headers: {
        'api-subscription-key': apiKey,
        'Authorization': `Bearer ${apiKey}`
    }
});

ws.on('open', () => {
    console.log('Connected!');
    
    // Send configuration if required
    const config = {
        model: "saaras:v3",
        mode: "translate",
        source_language: "en-IN",
        target_language: "en-IN" 
    };
    // ws.send(JSON.stringify(config));
    
    setTimeout(() => {
        ws.close();
    }, 2000);
});

ws.on('error', (err) => {
    console.error('Error:', err.message);
});

ws.on('unexpected-response', (request, response) => {
    console.error('Unexpected response:', response.statusCode);
});

ws.on('close', () => {
    console.log('Closed');
});

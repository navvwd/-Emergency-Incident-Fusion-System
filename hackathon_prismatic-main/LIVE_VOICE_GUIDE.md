# EIFS Live Voice Mode

Real-time bidirectional voice conversations with AI - similar to Gemini Live or ChatGPT Voice Mode.

## Features

- **Real-time streaming**: Low-latency voice conversations via WebSocket
- **Interruptible**: Tap to interrupt the AI while it's speaking
- **Live transcription**: See what you're saying in real-time
- **Visual feedback**: Animated visualizer shows listening/speaking states
- **Auto-detection**: Automatically detects silence to process speech
- **First aid guidance**: Provides emergency assistance and first aid instructions

## How to Use

1. Click the AI Agent button (Bot icon)
2. Click "Live Voice" button in the header
3. Tap the microphone to start the conversation
4. Speak naturally - the AI will detect when you stop speaking
5. Tap the center button anytime to interrupt the AI

## Technical Architecture

### Backend (WebSocket Server)
- **Endpoint**: `ws://localhost:3001/ws/live-voice`
- **Protocol**: Bidirectional JSON messages over WebSocket
- **Audio Format**: WebM/Opus codec, streamed in 200ms chunks

### Message Types

#### Client → Server
- `start`: Initialize session with optional language code
- `audio`: Base64-encoded audio chunk
- `stop`: Stop recording and process immediately
- `interrupt`: Interrupt current AI speech
- `ping`: Keep connection alive

#### Server → Client
- `connected`: Session established with sessionId
- `status`: Current stage and status text
- `transcript`: User speech transcription (final)
- `agent_response`: AI response text with actions
- `audio`: Base64-encoded AI voice audio
- `error`: Error message
- `pong`: Ping response

### State Flow
```
idle → greeting → listening → processing → speaking → listening (loop)
```

## Environment Variables

Add to your `.env` file:
```
SARVAM_API_KEY=your_sarvam_api_key
VITE_WS_URL=ws://localhost:3001  # Client-side WebSocket URL
```

## Dependencies Added

### Server
- `ws`: WebSocket library for Node.js
- `@types/ws`: TypeScript types for ws

### Client
- Native WebSocket API (no additional dependencies)
- MediaRecorder API for audio capture

## File Structure

```
server/src/
  routes/liveVoice.ts      # WebSocket route handler
  services/
    liveVoiceManager.ts    # Session management & AI processing
    sarvam.ts              # Sarvam AI API integration

client/src/components/agent/
  LiveAgent.tsx            # Text/Voice chat interface
  LiveVoiceMode.tsx        # Full-screen live voice interface
```

## Notes

- Sessions auto-expire after 30 minutes of inactivity
- Audio is processed in 200ms chunks for low latency
- Silence detection triggers processing after 1.5 seconds
- Requires microphone permissions in browser

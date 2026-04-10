import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Material Symbols Icon Component
function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
    >
      {name}
    </span>
  );
}

interface LiveMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
  isStreaming?: boolean;
  timestamp: Date;
}

function getWsUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Convert http(s)://host:port to ws://host:port
    return envUrl.replace(/^http/, 'ws') + '/ws/live-voice-fusion';
  }
  return `ws://${window.location.hostname}:3001/ws/live-voice-fusion`;
}

const WS_URL = getWsUrl();

const AUDIO_CONFIG = {
  sampleRate: 16000,
  channels: 1,
};

const PCM_WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.pending = [];
    this.pendingLength = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (!channel || channel.length === 0) {
      return true;
    }

    this.pending.push(new Float32Array(channel));
    this.pendingLength += channel.length;

    while (this.pendingLength >= this.bufferSize) {
      const chunk = new Float32Array(this.bufferSize);
      let offset = 0;

      while (offset < this.bufferSize && this.pending.length > 0) {
        const head = this.pending[0];
        const take = Math.min(head.length, this.bufferSize - offset);
        chunk.set(head.subarray(0, take), offset);
        offset += take;

        if (take === head.length) {
          this.pending.shift();
        } else {
          this.pending[0] = head.subarray(take);
        }
      }

      this.pendingLength -= this.bufferSize;
      this.port.postMessage(chunk, [chunk.buffer]);
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

// Voice Waveform Bar Component
function VoiceWaveBar({ delay, active }: { delay: number; active: boolean }) {
  return (
    <div
      className={`w-1 rounded-full transition-all duration-300 ${
        active ? 'bg-[var(--primary)] animate-wave-bar' : 'bg-[var(--primary)]/20 h-4'
      }`}
      style={{
        height: active ? undefined : '16px',
        animationDelay: `${delay}s`,
        animation: active ? `pulse-height 1.5s ease-in-out ${delay}s infinite` : undefined
      }}
    />
  );
}

// Live Transcription Component
function LiveTranscription({
  messages,
  currentTranscript,
  isListening
}: {
  messages: LiveMessage[];
  currentTranscript: string;
  isListening: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
      {messages.filter((msg) => msg.text.trim() || msg.isStreaming).map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-[var(--primary)] text-[var(--on-primary)] rounded-br-md'
                : msg.role === 'system'
                  ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded-bl-md border border-[var(--accent-green)]/30'
                  : 'bg-[var(--surface-container)] text-[var(--on-surface)] rounded-bl-md border border-[var(--outline-variant)]/20'
            }`}
          >
            {msg.isStreaming && !msg.text.trim() ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            ) : (
              <>
                <p className="text-sm leading-relaxed font-headline">{msg.text}</p>
                {msg.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-[var(--primary)]/50 animate-pulse" />}
              </>
            )}
          </div>
        </div>
      ))}
      {isListening && currentTranscript && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 bg-[var(--primary)]/40 text-[var(--on-surface)]/80 border border-[var(--primary)]/30">
            <p className="text-sm leading-relaxed">{currentTranscript}</p>
            <span className="inline-block w-2 h-4 ml-1 bg-[var(--primary)]/30 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}

export const GeminiLiveMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [stage, setStage] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, setGeoStatus] = useState<'fetching' | 'ok' | 'denied' | null>(null);
  const [dispatched, setDispatched] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletUrlRef = useRef<string | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartRecordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverAudioEndedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const messageIdRef = useRef(0);

  // Refs for stale closure avoidance
  const isMutedRef = useRef(isMuted);
  const isConnectedRef = useRef(isConnected);
  const stageRef = useRef(stage);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  const maybeRestartRecording = useCallback(() => {
    if (!serverAudioEndedRef.current) return;
    if (currentAudioRef.current || audioQueueRef.current.length > 0) return;
    if (!isConnectedRef.current || isRecordingRef.current) return;
    if (isPausedRef.current) return;

    serverAudioEndedRef.current = false;
    setStage('idle');

    if (restartRecordingTimeoutRef.current) {
      clearTimeout(restartRecordingTimeoutRef.current);
    }

    restartRecordingTimeoutRef.current = setTimeout(() => {
      if (isConnectedRef.current && !isRecordingRef.current && !isPausedRef.current) {
        startRecording();
      }
    }, 200);
  }, []);

  const stopPlayback = useCallback(() => {
    serverAudioEndedRef.current = false;
    if (restartRecordingTimeoutRef.current) {
      clearTimeout(restartRecordingTimeoutRef.current);
      restartRecordingTimeoutRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current.forEach((audio) => audio.pause());
    audioQueueRef.current = [];
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('denied');
      return;
    }
    setGeoStatus('fetching');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus('ok');
        const sendGeo = () => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'geolocation',
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }));
          }
        };
        sendGeo();
        const retryTimer = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            sendGeo();
            clearInterval(retryTimer);
          }
        }, 500);
        setTimeout(() => clearInterval(retryTimer), 10000);
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const downsampleBuffer = useCallback((buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) => {
    if (inputSampleRate === outputSampleRate) return buffer;

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }, []);

  const floatTo16BitPCM = useCallback((input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]));
      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
  }, []);

  const pcm16ToBase64 = useCallback((pcm16: Int16Array) => {
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current.port.onmessage = null;
      processorNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

  }, []);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;

    try {
      isRecordingRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: AUDIO_CONFIG.sampleRate,
          channelCount: AUDIO_CONFIG.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: AUDIO_CONFIG.sampleRate });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      if (!workletUrlRef.current) {
        const blob = new Blob([PCM_WORKLET_SOURCE], { type: 'application/javascript' });
        workletUrlRef.current = URL.createObjectURL(blob);
      }

      await audioContext.audioWorklet.addModule(workletUrlRef.current);
      const processor = new AudioWorkletNode(audioContext, 'pcm-capture-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 0,
        channelCount: 1,
      });
      processorNodeRef.current = processor;
      source.connect(processor);

      processor.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        if (isPausedRef.current) return;
        const input = event.data;
        const downsampled = downsampleBuffer(input, audioContext.sampleRate, AUDIO_CONFIG.sampleRate);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64Data = pcm16ToBase64(pcm16);
        if (base64Data) {
          wsRef.current.send(JSON.stringify({ type: 'audio_chunk', data: base64Data }));
        }
      };

      setStage('listening');
    } catch {
      isRecordingRef.current = false;
      setError('Microphone access denied');
    }
  }, [downsampleBuffer, floatTo16BitPCM, pcm16ToBase64]);

  // Audio Playback
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      currentAudioRef.current = null;
      maybeRestartRecording();
      return;
    }
    const next = audioQueueRef.current.shift();
    if (next) {
      currentAudioRef.current = next;
      setStage('speaking');
      next.play().catch(() => {
        currentAudioRef.current = null;
        playNextInQueue();
      });
    }
  }, [maybeRestartRecording]);

  const handleAudioChunk = useCallback((base64Data: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64Data}`);
    audio.onended = () => {
      currentAudioRef.current = null;
      playNextInQueue();
      maybeRestartRecording();
    };
    audioQueueRef.current.push(audio);
    if (!currentAudioRef.current) playNextInQueue();
  }, [maybeRestartRecording, playNextInQueue]);

  // Filter out prompt leakage - ULTRA AGGRESSIVE
  const filterPromptLeakage = (text: string): string => {
    if (!text) return '';
    
    // Split into lines and filter
    const lines = text.split('\n');
    const goodLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Skip lines that look like prompt/analysis
      if (
        trimmed.startsWith('*') ||                    // Bullet points
        trimmed.startsWith('-') ||                    // Dash bullet points
        trimmed.startsWith('•') ||                    // Unicode bullets
        trimmed.match(/^\d+\./) ||                    // Numbered lists
        trimmed.match(/^\*\*.*\*\*$/) ||              // Bold only lines
        trimmed.includes('Core problem') ||
        trimmed.includes('immediate danger') ||
        trimmed.includes('indicates panic') ||
        trimmed.includes('lack of clear direction') ||
        trimmed.includes('simple, actionable steps') ||
        trimmed.includes('plea for assistance') ||
        trimmed.includes('Experienced emergency responder') ||
        trimmed.includes('Calm, capable') ||
        trimmed.includes('100% human') ||
        trimmed.includes('Give practical') ||
        trimmed.includes('simple, human') ||
        trimmed.includes('This is the') ||
        trimmed.includes('The person is') ||
        trimmed.includes('They need') ||
        trimmed.includes('in immediate danger') ||
        trimmed.match(/^[^:]+:\s*This/) ||            // Lines like "* : This..."
        trimmed.match(/:\s*This is/)                 // Colon followed by analysis
      ) {
        continue;
      }
      
      goodLines.push(trimmed);
    }
    
    // Join good lines
    let cleaned = goodLines.join(' ');
    
    // Remove any remaining markdown/prompt patterns
    cleaned = cleaned
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold but keep text
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic but keep text
      .replace(/`([^`]+)`/g, '$1')        // Remove code ticks
      .replace(/^[-•]\s*/gm, '')          // Remove bullets at start
      .replace(/^\s*\d+\.\s*/gm, '')      // Remove numbering
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim();
    
    return cleaned;
  };

  const handleServerMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        break;

      case 'status':
        if (message.stage) {
          setStage(message.stage);
          if (
            message.stage === 'listening'
            && !isRecordingRef.current
            && isConnectedRef.current
            && !isPausedRef.current
            && !currentAudioRef.current
            && audioQueueRef.current.length === 0
          ) {
            setTimeout(() => {
              if (!isRecordingRef.current && isConnectedRef.current && !isPausedRef.current) startRecording();
            }, 300);
          }
        }
        break;

      case 'transcript':
        if (message.text) {
          if (message.isFinal) {
            setMessages((prev) => [...prev, {
              id: `user-${messageIdRef.current++}`,
              role: 'user',
              text: message.text,
              timestamp: new Date(),
            }]);
            setCurrentTranscript('');
          } else {
            setCurrentTranscript(message.text);
          }
        }
        break;

      case 'agent_response_start':
        setMessages((prev) => [...prev, {
          id: `agent-${messageIdRef.current++}`,
          role: 'agent', text: '', isStreaming: true, timestamp: new Date(),
        }]);
        setStage('thinking');
        break;

      case 'agent_response_token':
        if (message.token) {
          const token = message.token;
          // Skip if token looks like prompt instructions
          if (token.includes('**') || 
              token.toLowerCase().includes('tone') ||
              token.toLowerCase().includes('rules') ||
              token.toLowerCase().includes('examples') ||
              token.toLowerCase().includes('emergency info') ||
              token.toLowerCase().includes('dispatcher')) {
            break;
          }
          
          // Also filter the token content
          const cleanToken = filterPromptLeakage(token);
          if (!cleanToken) break;
          
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'agent' && last.isStreaming) {
              return [...prev.slice(0, -1), { ...last, text: last.text + cleanToken }];
            }
            return prev;
          });
        }
        break;

      case 'agent_response_complete':
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'agent') {
            const cleanText = filterPromptLeakage(message.text || last.text);
            // Remove the message entirely if cleaned text is empty
            if (!cleanText.trim()) {
              return prev.slice(0, -1);
            }
            return [...prev.slice(0, -1), { ...last, isStreaming: false, text: cleanText }];
          }
          return prev;
        });
        break;

      case 'agent_response':
        if (message.text) {
          const cleanText = filterPromptLeakage(message.text);
          if (cleanText) {
            setMessages((prev) => [...prev, {
              id: `agent-${messageIdRef.current++}`,
              role: 'agent', text: cleanText, isStreaming: false, timestamp: new Date(),
            }]);
          }
        }
        break;

      case 'dispatch':
        setDispatched(true);
        setMessages((prev) => [...prev, {
          id: `sys-${messageIdRef.current++}`,
          role: 'system',
          text: `Emergency dispatched: ${message.incident_type || 'emergency'} at ${message.location || 'your location'}. Help is on the way.`,
          timestamp: new Date(),
        }]);
        break;

      case 'audio_chunk':
        serverAudioEndedRef.current = false;
        if (message.data && !isMutedRef.current) {
          handleAudioChunk(message.data);
        }
        break;

      case 'audio_end':
        serverAudioEndedRef.current = true;
        maybeRestartRecording();
        break;

      case 'interrupted':
        stopPlayback();
        setStage('idle');
        break;

      case 'error':
        setError(message.message || 'An error occurred');
        break;
    }
  }, [handleAudioChunk, maybeRestartRecording, startRecording, stopPlayback]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) return;
    isConnectingRef.current = true;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      isConnectingRef.current = false;
      ws.send(JSON.stringify({ type: 'start', language: 'en-IN' }));

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        handleServerMessage(JSON.parse(event.data));
      } catch (error) {
        console.error('[GeminiLive] Parse error:', error);
      }
    };

    ws.onerror = () => {
      setError('Connection error, retrying...');
      isConnectingRef.current = false;
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setStage('idle');
      stopRecording();
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      isConnectingRef.current = false;
      if (event.code !== 1000 && event.code !== 1005) {
        reconnectTimeoutRef.current = setTimeout(() => connect(), 3000);
      }
    };

    wsRef.current = ws;
  }, [handleServerMessage, stopPlayback, stopRecording]);

  const disconnect = useCallback(() => {
    stopRecording();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client closed');
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (restartRecordingTimeoutRef.current) {
      clearTimeout(restartRecordingTimeoutRef.current);
      restartRecordingTimeoutRef.current = null;
    }
    stopPlayback();
    setIsConnected(false);
    setStage('idle');
  }, [stopPlayback, stopRecording]);

  const handleInterrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
      stopPlayback();
      setStage('idle');
      setTimeout(() => {
        if (!isRecordingRef.current && isConnectedRef.current) {
          startRecording();
        }
      }, 100);
    }
  }, [startRecording, stopPlayback]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
      if (workletUrlRef.current) {
        URL.revokeObjectURL(workletUrlRef.current);
        workletUrlRef.current = null;
      }
    };
  }, [connect, disconnect]);

  const handleClose = useCallback(() => {
    disconnect();
    onClose();
  }, [disconnect, onClose]);

  return createPortal(
    <div className="fixed inset-0 bg-[var(--bg-primary)] flex flex-col" style={{ 
      zIndex: 999999, 
      height: '100dvh',
      width: '100vw',
      position: 'fixed',
      inset: 0,
      overflow: 'hidden'
    }}>
      {/* TopNavBar */}
      <nav className="bg-[#10141a] font-headline tracking-tight flex justify-between items-center w-full px-4 sm:px-6 py-4 shrink-0 border-b border-[#31353c]/30">
        <div className="flex items-center gap-3">
          <Icon name="mic" className="text-xl text-[var(--primary)]" />
          <span className="text-lg font-bold tracking-tighter text-[#adc6ff]">Live Voice</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMuted((v) => !v)} className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-[var(--tertiary)]/20 text-[var(--tertiary)]' : 'text-[#adc6ff] hover:bg-[var(--surface-variant)]/30'}`} aria-label={isMuted ? 'Unmute' : 'Mute'}>
            <Icon name={isMuted ? 'volume_off' : 'volume_up'} />
          </button>
          <button onClick={handleClose} className="text-[#adc6ff] hover:bg-[var(--surface-variant)]/30 p-2 rounded-full transition-colors" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
      </nav>

      {dispatched && (
        <div className="mx-4 sm:mx-6 mt-2 px-4 py-3 bg-[var(--accent-green)]/20 border border-[var(--accent-green)]/30 rounded-xl flex items-center gap-3">
          <Icon name="check_circle" className="text-[var(--accent-green)] shrink-0" />
          <p className="text-sm text-[var(--accent-green)]">Emergency services have been notified. Help is on the way.</p>
        </div>
      )}

      {error && (
        <div className="mx-4 sm:mx-6 mt-2 px-4 py-3 bg-[var(--tertiary)]/20 border border-[var(--tertiary)]/30 rounded-xl flex items-center gap-3">
          <Icon name="error" className="text-[var(--tertiary)] shrink-0" />
          <p className="text-sm text-[var(--tertiary)] flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-[var(--tertiary)] hover:text-[var(--on-tertiary)]">
            <Icon name="close" className="text-sm" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {/* Main Content Canvas */}
        <section className="flex-1 relative overflow-y-auto overflow-x-hidden bg-[#10141a]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Subtle Radial Gradient Background Glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_rgba(173,198,255,0.05)_0%,_transparent_70%)]" />

          <div className="flex flex-col p-4 sm:p-4 md:p-6 lg:p-12 max-w-5xl mx-auto w-full pb-24 sm:pb-6" style={{ minHeight: '100%' }}>
            {/* Status Header - Mobile */}
            <div className="md:hidden flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <h1 className="font-headline text-lg font-bold tracking-tight">VOICE OVERRIDE</h1>
                <p className="text-[10px] text-[var(--primary)] uppercase font-bold tracking-widest">
                  {stage === 'listening' ? 'Active Listening' : stage === 'thinking' ? 'AI Processing' : stage === 'speaking' ? 'AI Speaking' : 'Waiting...'}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${stage === 'listening' ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--outline-variant)]/20'}`}>
                <Icon name={stage === 'listening' ? 'mic' : stage === 'thinking' ? 'psychology' : stage === 'speaking' ? 'record_voice_over' : 'mic'} filled className="text-[var(--primary)] text-sm" />
              </div>
            </div>

            {/* Central Visualization Zone */}
            <div className="flex flex-col items-center justify-center space-y-6 md:space-y-12 py-4" style={{ flex: '1 1 auto' }}>
              {/* Voice Waveform Animation */}
              <div className="relative w-full max-w-[280px] sm:max-w-xs md:max-w-md h-32 sm:h-24 md:h-48 flex items-center justify-center gap-1.5 px-2 sm:px-4">
                {[0.1, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1].map((delay, i) => (
                  <VoiceWaveBar key={i} delay={delay} active={stage !== 'idle'} />
                ))}
              </div>

              {/* Live Transcript Box - Always show on mobile, toggle on desktop */}
              <div className="w-full max-w-2xl bg-[var(--surface-container-low)] border-l-4 border-[var(--primary)] p-4 sm:p-4 md:p-6 lg:p-8 glass-panel relative overflow-y-auto max-h-[40vh] sm:max-h-[35vh] md:max-h-[50vh]" style={{ flex: '1 1 auto' }}>
                <div className="absolute -top-3 left-4 px-2 bg-[var(--bg-primary)] border border-[var(--outline-variant)]/30">
                  <span className="text-[10px] font-bold text-[var(--primary)] tracking-[0.2em] uppercase">TRANSCRIPT</span>
                </div>
                {messages.length === 0 ? (
                  <p className="font-headline text-base sm:text-lg md:text-2xl font-medium leading-relaxed text-[var(--on-background)]">
                    "I'm here with you. Tell me what emergency is happening."
                  </p>
                ) : (
                  <LiveTranscription messages={messages} currentTranscript={currentTranscript} isListening={stage === 'listening'} />
                )}
                <div className="mt-4 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${stage === 'listening' ? 'bg-[var(--primary)] animate-pulse' : stage === 'thinking' ? 'bg-[var(--secondary)] animate-pulse' : stage === 'speaking' ? 'bg-[var(--accent-green)]' : 'bg-[var(--outline)]/50'}`} />
                  <span className="font-mono text-[10px] text-[var(--outline)] uppercase tracking-wider">
                    {stage === 'listening' ? 'Listening...' : stage === 'thinking' ? 'AI Processing...' : stage === 'speaking' ? 'AI Speaking...' : 'Waiting for input...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tactical Controls Bottom */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 items-center mt-6 md:mt-12 bg-[#10141a] py-4 sm:py-0 shrink-0">
              {/* Left: Mute/Unmute speaker audio */}
              <div className="flex justify-start">
                <button
                  onClick={() => setIsMuted((v) => !v)}
                  className="group flex flex-col items-center gap-1 md:gap-2"
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border transition-colors ${
                    isMuted ? 'bg-[var(--tertiary)]/20 border-[var(--tertiary)]/50' : 'border-[var(--outline-variant)]/30 group-hover:bg-[var(--surface-container-highest)]'
                  }`}>
                    <Icon name={isMuted ? 'volume_off' : 'volume_up'} className={isMuted ? 'text-[var(--tertiary)]' : ''} />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-[var(--outline)] tracking-widest uppercase">{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
              </div>

              {/* Center: Main action button */}
              <div className="flex justify-center">
                {stage === 'thinking' || stage === 'speaking' ? (
                  /* Interrupt AI while it's processing/speaking */
                  <button onClick={handleInterrupt} className="relative group">
                    <div className="absolute inset-0 bg-[var(--secondary)]/20 blur-2xl group-hover:bg-[var(--secondary)]/40 transition-all rounded-full" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-[var(--secondary)] flex flex-col items-center justify-center text-[var(--on-secondary)] shadow-2xl active:scale-95 transition-transform border-4 border-[var(--secondary-container)]/30">
                      <Icon name="stop" filled className="text-3xl sm:text-4xl" />
                      <span className="text-[9px] sm:text-[10px] font-black tracking-tighter mt-1">STOP</span>
                    </div>
                  </button>
                ) : stage === 'listening' || isPaused ? (
                  /* Toggle between pause and resume */
                  <button onClick={() => {
                    if (isPaused) {
                      // Resume: unpause and start recording again
                      setIsPaused(false);
                      startRecording();
                    } else {
                      // Pause: stop recording and send audio_end to process what we have
                      setIsPaused(true);
                      stopRecording();
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'audio_end' }));
                      }
                      setStage('idle');
                    }
                  }} className="relative group">
                    <div className={`absolute inset-0 ${isPaused ? 'bg-[var(--accent-green)]/20' : 'bg-[var(--primary)]/20'} blur-2xl transition-all rounded-full`} />
                    <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full ${isPaused ? 'bg-[var(--accent-green)]' : 'bg-[var(--primary)]'} flex flex-col items-center justify-center text-[var(--on-primary-container)] shadow-2xl active:scale-95 transition-transform border-4 ${isPaused ? 'border-[var(--accent-green)]/30' : 'border-[var(--primary-container)]/30'}`}>
                      <Icon name={isPaused ? 'mic' : 'pause'} filled className="text-3xl sm:text-4xl" />
                      <span className="text-[9px] sm:text-[10px] font-black tracking-tighter mt-1">{isPaused ? 'TALK' : 'PAUSE'}</span>
                    </div>
                  </button>
                ) : (
                  /* Idle: Start talking */
                  <button onClick={() => {
                    setIsPaused(false);
                    startRecording();
                  }} className="relative group">
                    <div className="absolute inset-0 bg-[var(--primary)]/20 blur-2xl group-hover:bg-[var(--primary)]/40 transition-all rounded-full" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-[var(--primary)] flex flex-col items-center justify-center text-[var(--on-primary-container)] shadow-2xl active:scale-95 transition-transform border-4 border-[var(--primary-container)]/30">
                      <Icon name="mic" filled className="text-3xl sm:text-4xl" />
                      <span className="text-[9px] sm:text-[10px] font-black tracking-tighter mt-1">TALK</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Right: End call */}
              <div className="flex justify-end">
                <button onClick={handleClose} className="group flex flex-col items-center gap-1 md:gap-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border border-[var(--tertiary)]/30 group-hover:bg-[var(--tertiary)]/10 transition-colors">
                    <Icon name="call_end" className="text-[var(--tertiary)]" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-[var(--outline)] tracking-widest uppercase">End</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes pulse-height {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .animate-wave-bar {
          animation: pulse-height 1.5s ease-in-out infinite;
        }
        /* Mobile viewport fix */
        @supports (height: 100dvh) {
          .h-dvh {
            height: 100dvh;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default GeminiLiveMode;

// ═══════════════════════════════════════════════════════════
// AI-01 SENTINEL — Emergency Assistant (Chat Interface)
// Reference: stitch_ai_01_emergency_ui/chat_assistant
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api from '../../lib/api';
import type { AgentResponse, AgentAction } from '../../lib/types';

interface LiveAgentProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLiveVoice?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
}

// ─── Material Symbols Icon Component ───────────────────────

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

// ─── Action Card Component ─────────────────────────────────

function ActionCard({ action }: { action: AgentAction }) {
  const styles = {
    first_aid: {
      border: 'border-[var(--tertiary)]/30',
      bg: 'bg-[var(--tertiary)]/10',
      icon: 'medical_services',
      iconColor: 'text-[var(--tertiary)]',
      title: 'text-[var(--tertiary)]'
    },
    precaution: {
      border: 'border-[var(--secondary)]/30',
      bg: 'bg-[var(--secondary)]/10',
      icon: 'warning',
      iconColor: 'text-[var(--secondary)]',
      title: 'text-[var(--secondary)]'
    },
    emergency_number: {
      border: 'border-[var(--accent-green)]/30',
      bg: 'bg-[var(--accent-green)]/10',
      icon: 'phone_in_talk',
      iconColor: 'text-[var(--accent-green)]',
      title: 'text-[var(--accent-green)]'
    },
    calming_exercise: {
      border: 'border-[var(--primary)]/30',
      bg: 'bg-[var(--primary)]/10',
      icon: 'mindfulness',
      iconColor: 'text-[var(--primary)]',
      title: 'text-[var(--primary)]'
    },
  };

  const style = styles[action.type];

  return (
    <div className={`rounded-lg border p-3 ${style.border} ${style.bg}`}>
      <div className={`flex items-center gap-2 mb-2 ${style.title}`}>
        <Icon name={style.icon} className={style.iconColor} />
        <span className="font-semibold text-sm font-headline">{action.title}</span>
      </div>
      <pre className="text-xs whitespace-pre-wrap font-sans opacity-90 text-[var(--on-surface-variant)]">
        {action.content}
      </pre>
    </div>
  );
}

// ─── Breathing Widget (Tactical Composure Protocol) ────────

function BreathingWidget() {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    const cycle = () => {
      setPhase('inhale');
      setTimeout(() => setPhase('hold'), 4000);
      setTimeout(() => setPhase('exhale'), 8000);
    };
    cycle();
    const interval = setInterval(cycle, 12000);
    return () => clearInterval(interval);
  }, []);

  const getScale = () => {
    if (phase === 'inhale') return 'scale-100';
    if (phase === 'hold') return 'scale-125';
    return 'scale-75';
  };

  const getText = () => {
    if (phase === 'inhale') return 'Inhale';
    if (phase === 'hold') return 'Hold';
    return 'Exhale';
  };

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto w-full">
      <div className="bg-[var(--surface-container-highest)]/40 border border-[var(--outline-variant)]/10 rounded-2xl p-8 backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent pointer-events-none" />
        <span className="text-[10px] font-headline font-bold uppercase tracking-[0.3em] text-[var(--on-surface-variant)]/60 mb-6">
          Breathe with me
        </span>
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-2 border-[var(--primary)]/20 rounded-full" />
          <div
            className={`absolute inset-0 border-4 border-[var(--primary)] rounded-full scale-110 opacity-30 transition-transform duration-[4000ms] ease-in-out breathing-ring ${getScale()}`}
            style={{
              boxShadow: '0 0 20px rgba(173, 198, 255, 0.2)'
            }}
          />
          <div className={`absolute inset-4 border border-[var(--primary)]/10 rounded-full flex items-center justify-center transition-transform duration-[4000ms] ease-in-out ${getScale()}`}>
            <span className="text-[var(--primary)] font-headline text-sm font-bold uppercase tracking-widest">
              {getText()}
            </span>
          </div>
        </div>
        <h3 className="font-headline text-xl text-[var(--primary)] mb-2">Calm Breathing</h3>
        <p className="text-xs text-[var(--on-surface-variant)] max-w-[240px] leading-relaxed">
          Match your breathing to the ring. You're going to be okay.
        </p>
      </div>
    </div>
  );
}

// ─── Top Navigation Header ─────────────────────────────────

function TopNav({ onClose, onStartLiveVoice }: { onClose: () => void; onStartLiveVoice?: () => void }) {
  return (
    <header className="flex justify-between items-center w-full px-4 sm:px-6 py-4 bg-[#10141a] z-10 border-b border-[#31353c]/30">
      <div className="flex items-center gap-3">
        <Icon name="support_agent" className="text-xl text-[var(--primary)]" />
        <span className="text-lg font-bold tracking-tighter text-[#adc6ff] font-headline">Emergency Response</span>
      </div>
      <div className="flex items-center gap-2 text-[#adc6ff]">
        {onStartLiveVoice && (
          <button
            onClick={onStartLiveVoice}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface-container)] text-[var(--on-surface)] text-xs font-medium hover:bg-[var(--surface-container-high)] transition-colors"
          >
            <Icon name="mic" className="text-sm text-[var(--primary)]" />
            <span className="hidden sm:inline">Voice</span>
          </button>
        )}
        <button onClick={onClose} className="hover:bg-[var(--surface-variant)]/30 p-2 rounded-full transition-colors">
          <Icon name="close" />
        </button>
      </div>
    </header>
  );
}

// ─── Wave Animation for Processing ─────────────────────────

function WaveAnimation({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-0.5 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`
            w-1 bg-[var(--primary)] rounded-full transition-all duration-150
            ${isActive ? 'animate-wave' : 'h-2'}
          `}
          style={{
            height: isActive ? undefined : '8px',
            animationDelay: `${i * 100}ms`,
            animation: isActive ? `wave 0.5s ease-in-out ${i * 100}ms infinite alternate` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Live Agent Component ─────────────────────────────

export default function LiveAgent({ isOpen, onClose, onStartLiveVoice }: LiveAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState('greeting');
  const [showReportButton, setShowReportButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const initializeSession = async () => {
    try {
      setIsProcessing(true);
      const response = await api.post('/api/agent/init');

      if (response.data.success) {
        const data: AgentResponse = response.data.data;
        setSessionId(data.sessionId);
        setStage(data.stage);

        const initialMessage: Message = {
          id: Date.now().toString(),
          role: 'agent',
          content: data.text,
          timestamp: new Date(),
          actions: data.actions,
        };

        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      toast.error('Failed to start AI agent');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !sessionId || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await api.post('/api/agent/chat', {
        sessionId,
        message: userMessage.content,
      });

      if (response.data.success) {
        const data: AgentResponse = response.data.data;
        setStage(data.stage);

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: data.text,
          timestamp: new Date(),
          actions: data.actions,
        };

        setMessages((prev) => [...prev, agentMessage]);

        if (data.stage === 'closing' || data.stage === 'advice') {
          setShowReportButton(true);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to get response');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!sessionId) return;

    setIsProcessing(true);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    formData.append('sessionId', sessionId);

    const tempMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Voice message',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await api.post('/api/agent/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const data: AgentResponse = response.data.data;
        setStage(data.stage);

        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg.role === 'user') {
            lastMsg.content = data.transcript || 'Voice message';
          }
          return updated;
        });

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: data.text,
          timestamp: new Date(),
          actions: data.actions,
        };

        setMessages((prev) => [...prev, agentMessage]);

        if (data.stage === 'closing' || data.stage === 'advice') {
          setShowReportButton(true);
        }
      }
    } catch (error) {
      console.error('Failed to send voice:', error);
      toast.error('Failed to process voice message');
    } finally {
      setIsProcessing(false);
    }
  };

  const submitReport = async () => {
    if (!sessionId) return;

    try {
      setIsProcessing(true);
      const response = await api.post('/api/agent/report', { sessionId });

      if (response.data.success) {
        toast.success('Emergency report submitted successfully');
        onClose();
      } else {
        toast.error('Failed to submit report');
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsProcessing(false);
    }
  };

  const quickReplies = ['I need help', "There's a fire", 'Accident', 'Medical'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 animate-fadeIn" style={{ zIndex: 999999 }}>
      {/* Backdrop */}
      <div className="backdrop-overlay" onClick={onClose} aria-hidden="true" style={{ zIndex: 999998 }} />

      {/* Main Container - Full screen on mobile, modal on desktop */}
      <div className="absolute inset-0 md:inset-8 md:rounded-2xl flex overflow-hidden animate-scaleIn bg-[var(--bg-primary)]" style={{ zIndex: 999999 }}>
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-glow-primary">
          {/* Top Navigation */}
          <TopNav onClose={onClose} onStartLiveVoice={onStartLiveVoice} />

          {/* Separation Line */}
          <div className="bg-[#31353c] h-[1px] w-full opacity-30" />

          {/* Chat Canvas */}
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8 scroll-smooth custom-scrollbar">
            {/* Breathing Widget for early stages */}
            {messages.length <= 2 && stage === 'greeting' && <BreathingWidget />}

            {/* Messages */}
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex flex-col gap-3 max-w-2xl ${message.role === 'user' ? 'ml-auto' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === 'agent' && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" />
                    <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                      Responder
                    </span>
                    <span className="text-[9px] text-[var(--outline)] ml-4">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div
                  className={`
                    rounded-xl p-6 backdrop-blur-sm
                    ${message.role === 'user'
                      ? 'bg-[var(--primary)] text-[var(--on-primary)] rounded-br-none'
                      : 'bg-[var(--surface-container-low)] text-[var(--on-background)] border-l-2 border-[var(--primary)]/40 rounded-tl-none'
                    }
                  `}
                >
                  <p className={`leading-relaxed ${message.role === 'agent' ? 'text-[var(--on-surface-variant)]' : ''}`}>
                    {message.content}
                  </p>

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.actions.map((action, idx) => (
                        <ActionCard key={idx} action={action} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex flex-col gap-3 max-w-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-[var(--primary)] rounded-full" />
                  <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                    SENTINEL-AI
                  </span>
                </div>
                <div className="bg-[var(--surface-container-low)] rounded-xl rounded-tl-none p-6 border-l-2 border-[var(--primary)]/40 backdrop-blur-sm w-fit">
                  <WaveAnimation isActive={true} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Report Button */}
          {showReportButton && (
            <div className="px-6 py-3 border-t border-[var(--outline-variant)]/20 bg-[var(--surface-container-low)]">
              <button
                onClick={submitReport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <Icon name="shield" />
                Submit Emergency Report
                <Icon name="chevron_right" />
              </button>
            </div>
          )}

          {/* Input Shell */}
          <footer className="p-6 bg-[var(--surface-container-lowest)]/80 backdrop-blur-md border-t border-[var(--outline-variant)]/5">
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
              {/* Quick Reply Chips */}
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((quick, idx) => {
                  const colors = [
                    { dot: 'bg-[var(--primary)]', border: 'hover:border-[var(--primary)]/50 hover:text-[var(--primary)]' },
                    { dot: 'bg-[var(--tertiary)]', border: 'hover:border-[var(--tertiary)]/50 hover:text-[var(--tertiary)]' },
                    { dot: 'bg-[var(--secondary)]', border: 'hover:border-[var(--secondary)]/50 hover:text-[var(--secondary)]' },
                    { dot: 'bg-[var(--primary-fixed-dim)]', border: 'hover:border-[var(--primary-fixed-dim)]/50 hover:text-[var(--primary-fixed-dim)]' },
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <button
                      key={quick}
                      onClick={() => {
                        setInputText(quick);
                        setTimeout(sendMessage, 100);
                      }}
                      disabled={isProcessing || isRecording}
                      className={`px-4 py-2 bg-[var(--surface-container-high)] border border-[var(--outline-variant)]/20 rounded-full text-xs font-headline font-medium transition-all flex items-center gap-2 ${color.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                      {quick}
                    </button>
                  );
                })}
              </div>

              {/* Input Field Area */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={isRecording ? 'Listening...' : 'Describe the situation or tap a quick-reply...'}
                    disabled={isProcessing || isRecording}
                    className="w-full bg-[var(--surface-container)] rounded-xl px-6 py-4 border-none focus:ring-1 focus:ring-[var(--primary)]/40 text-[var(--on-surface)] placeholder:text-[var(--outline)]/40 text-sm font-body"
                  />
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`
                      absolute right-4 top-1/2 -translate-y-1/2 transition-colors
                      ${isRecording ? 'text-[var(--tertiary)] animate-pulse' : 'text-[var(--outline)] hover:text-[var(--primary)]'}
                    `}
                  >
                    <Icon name={isRecording ? 'mic_off' : 'mic'} />
                  </button>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || isProcessing || isRecording}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-container)] text-[var(--on-primary)] font-bold p-4 rounded-xl shadow-lg shadow-[var(--primary)]/10 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon name="send" />
                </button>
              </div>

            </div>
          </footer>
        </main>
      </div>


      {/* Wave Animation Style */}
      <style>{`
        @keyframes wave {
          0% { height: 8px; }
          100% { height: 24px; }
        }
        .bg-glow-primary {
          background: radial-gradient(circle at center, rgba(173, 198, 255, 0.03) 0%, transparent 70%);
        }
        .breathing-ring {
          box-shadow: 0 0 20px rgba(173, 198, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EIFS — Report Submission Form
// Modern design with accessibility features
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useCallback } from 'react';
import {
  Mic, Type, Image as ImageIcon, Send, Loader2, Square,
  Upload, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

type Tab = 'voice' | 'text' | 'image';

interface ReportFormProps {
  onSuccess?: () => void;
}

export default function ReportForm({ onSuccess }: ReportFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const [textVal, setTextVal] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ═══════════════════════════════════════════════════════════
  // Recording Logic
  // ═══════════════════════════════════════════════════════════

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        const audioFile = new File([audioBlob], `voice-report-${Date.now()}.webm`, { type: 'audio/webm' });
        setFile(audioFile);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioUrl(null);
      setFile(null);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      toast.error('Microphone access denied. Please allow microphone access to record.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════
  // Submit Logic
  // ═══════════════════════════════════════════════════════════

  const handleSubmit = async () => {
    if (activeTab === 'text' && !textVal.trim()) {
      toast.error('Please describe the incident.');
      return;
    }
    if ((activeTab === 'voice' || activeTab === 'image') && !file) {
      toast.error(`Please provide a ${activeTab} file.`);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('report_type', activeTab);

    if (activeTab === 'text') {
      formData.append('text_content', textVal);
    } else if (file) {
      formData.append('file', file);
    }

    // Attempt GPS capture (best-effort, 5s timeout)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 60000,
        });
      });
      formData.append('latitude', pos.coords.latitude.toString());
      formData.append('longitude', pos.coords.longitude.toString());
    } catch {
      // GPS unavailable — continue without it
    }

    try {
      const response = await api.post('/api/ingest-report', formData);

      // Reset form
      setTextVal('');
      setFile(null);
      setAudioUrl(null);

      toast.success(
        response.data.is_merged
          ? 'Report merged with existing incident'
          : 'New incident created successfully',
        { icon: <CheckCircle size={16} /> }
      );

      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to submit report', {
        icon: <AlertCircle size={16} />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // Drag & Drop Handlers
  // ═══════════════════════════════════════════════════════════

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/')) {
        handleImageFile(droppedFile);
      }
    }
  }, []);

  const handleImageFile = (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setFile(selectedFile);
    setAudioUrl(URL.createObjectURL(selectedFile));
  };

  // ═══════════════════════════════════════════════════════════
  // Render Helpers
  // ═══════════════════════════════════════════════════════════

  const tabs: { id: Tab; icon: React.ReactNode; label: string; description: string }[] = [
    { id: 'text', icon: <Type size={18} />, label: 'Text', description: 'Type description' },
    { id: 'voice', icon: <Mic size={18} />, label: 'Voice', description: 'Record audio' },
    { id: 'image', icon: <ImageIcon size={18} />, label: 'Image', description: 'Upload photo' },
  ];

  const switchTab = (tabId: Tab) => {
    setActiveTab(tabId);
    setFile(null);
    setAudioUrl(null);
    setTextVal('');
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tabs - Modern Pills */}
      <div className="flex bg-[var(--bg-tertiary)] rounded-xl p-1 mb-4 shrink-0" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            disabled={isSubmitting}
            onClick={() => switchTab(t.id)}
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg
              transition-all duration-200 disabled:opacity-50 touch-target
              ${activeTab === t.id
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        className="flex-1 overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl mb-4"
      >
        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="h-full p-4 flex flex-col">
            <textarea
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              disabled={isSubmitting}
              placeholder="Describe the emergency situation... (e.g., 'Major fire at Central Station, multiple people injured')"
              className="flex-1 w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] text-base leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-tertiary)]">
                Be specific about location and severity
              </span>
              <span className="text-xs text-[var(--text-tertiary)] font-medium">
                {textVal.length} chars
              </span>
            </div>
          </div>
        )}

        {/* VOICE TAB */}
        {activeTab === 'voice' && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            {!audioUrl ? (
              <>
                <div
                  className={`
                    w-28 h-28 rounded-full flex items-center justify-center mb-6 transition-all duration-300
                    ${isRecording
                      ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)] scale-110 shadow-lg shadow-red-500/20'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                    }
                  `}
                >
                  <Mic size={48} strokeWidth={1.5} className={isRecording ? 'animate-pulse' : ''} />
                </div>

                {isRecording && (
                  <div className="text-3xl font-mono font-bold text-[var(--accent-red)] mb-4 tracking-wider">
                    {formatDuration(recordingDuration)}
                  </div>
                )}

                <button
                  disabled={isSubmitting}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`
                    px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-3 transition-all touch-target-lg focus-ring
                    ${isRecording
                      ? 'bg-[var(--accent-red)] text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/40'
                      : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-white hover:shadow-lg'
                    }
                  `}
                >
                  {isRecording ? (
                    <>
                      <Square size={18} fill="currentColor" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic size={18} />
                      Start Recording
                    </>
                  )}
                </button>

                <p className="text-sm text-[var(--text-tertiary)] mt-4 text-center max-w-xs">
                  Tap to start recording your incident report. Speak clearly about the location and nature of the emergency.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <div className="w-full bg-[var(--bg-tertiary)] rounded-xl p-4 border border-[var(--border-subtle)]">
                  <audio src={audioUrl} controls className="w-full" />
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    disabled={isSubmitting}
                    onClick={() => { setAudioUrl(null); setFile(null); }}
                    className="flex-1 py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--accent-red)]/20 hover:text-[var(--accent-red)] transition-colors touch-target focus-ring"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* IMAGE TAB */}
        {activeTab === 'image' && (
          <div
            className="h-full flex flex-col items-center justify-center p-6 relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/*"
              disabled={isSubmitting}
              id="image-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) handleImageFile(selected);
              }}
            />

            {!file ? (
              <div
                className={`
                  flex flex-col items-center justify-center w-full h-full rounded-xl border-2 border-dashed transition-all duration-200
                  ${dragActive
                    ? 'border-[var(--accent-green)] bg-[var(--accent-green-subtle)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50 hover:border-[var(--border-default)] hover:bg-[var(--bg-tertiary)]'
                  }
                `}
              >
                <div
                  className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors
                    ${dragActive ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}
                  `}
                >
                  {dragActive ? <Upload size={28} /> : <ImageIcon size={28} />}
                </div>
                <p className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  {dragActive ? 'Drop image here' : 'Tap or drag to upload'}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  JPEG, PNG up to 5MB
                </p>
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img
                  src={audioUrl!}
                  alt="Preview"
                  className="max-h-[65%] max-w-full rounded-xl object-contain border border-[var(--border-subtle)] shadow-lg"
                />
                <button
                  onClick={(e) => { e.preventDefault(); setFile(null); setAudioUrl(null); }}
                  className="mt-4 px-5 py-2.5 bg-[var(--accent-red)]/15 text-[var(--accent-red)] text-sm rounded-full font-semibold hover:bg-[var(--accent-red)]/25 transition-colors flex items-center gap-2 touch-target focus-ring"
                >
                  <X size={16} />
                  Remove Image
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={
          isSubmitting ||
          (activeTab === 'text' && !textVal.trim()) ||
          ((activeTab === 'image' || activeTab === 'voice') && !file) ||
          isRecording
        }
        className={`
          w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all shadow-lg touch-target-lg focus-ring
          ${isSubmitting
            ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'
            : 'bg-gradient-to-r from-[var(--accent-green)] to-[#16A34A] text-white shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        `}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Send size={20} />
            Submit Report
          </>
        )}
      </button>
    </div>
  );
}

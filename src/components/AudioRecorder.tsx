import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ProcessAudioResponse } from '../types';

type Props = {
  onProcessed?: (res: ProcessAudioResponse) => void;
};

// Voice Visualizer component that reacts to actual audio levels
const VoiceVisualizer = ({ stream }: { stream: MediaStream | null }) => {
    const [levels, setLevels] = useState<number[]>(new Array(7).fill(0));
    const animationFrameRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode>();
    const dataArrayRef = useRef<Uint8Array>();

    useEffect(() => {
        if (!stream) return;

        // Set up Web Audio API for audio analysis
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        // Animation loop to update visualizer
        const updateLevels = () => {
            if (!analyserRef.current || !dataArrayRef.current) return;
            
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            
            // Calculate average volume - FIXED LINE
            const average = Array.from(dataArrayRef.current).reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
            
            // Normalize to 0-1 range and apply threshold
            const normalizedLevel = Math.min(average / 128, 1);
            const threshold = 0.02; // Noise floor
            const activeLevel = normalizedLevel > threshold ? normalizedLevel : 0;
            
            // Create wave pattern across 7 dots
            const newLevels = new Array(7).fill(0).map((_, i) => {
                const position = i / 6; // 0 to 1
                const wave = Math.sin(position * Math.PI); // Bell curve
                return activeLevel * wave;
            });
            
            setLevels(newLevels);
            animationFrameRef.current = requestAnimationFrame(updateLevels);
        };

        updateLevels();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            audioContext.close();
        };
    }, [stream]);

    return (
        <div className="voice-visualizer-container">
            {/* Left Bars */}
            <div 
                className="voice-bar bar-l1" 
                style={{ 
                    height: `${5 + levels[0] * 20}px`,
                    transition: 'height 0.05s ease'
                }}
            ></div>
            <div 
                className="voice-bar bar-l2" 
                style={{ 
                    height: `${5 + levels[1] * 20}px`,
                    transition: 'height 0.05s ease'
                }}
            ></div>
            
            {/* Reactive Dots */}
            {levels.map((level, i) => (
                <div 
                    key={i} 
                    className="voice-dot" 
                    style={{ 
                        transform: `scale(${1 + level * 2})`,
                        opacity: 0.6 + level * 0.4,
                        backgroundColor: level > 0.3 ? 'var(--accent)' : 'var(--muted)',
                        transition: 'all 0.05s ease'
                    }}
                ></div>
            ))}

            {/* Right Bars */}
            <div 
                className="voice-bar bar-r1" 
                style={{ 
                    height: `${5 + levels[5] * 20}px`,
                    transition: 'height 0.05s ease'
                }}
            ></div>
            <div 
                className="voice-bar bar-r2" 
                style={{ 
                    height: `${5 + levels[6] * 20}px`,
                    transition: 'height 0.05s ease'
                }}
            ></div>
        </div>
    );
};


export function AudioRecorder({ onProcessed }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [permissionError, setPermissionError] = useState('');
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null); // To manage the stream

  async function start() {
    if (recording || loading) return;

    setPermissionError('');
    setLoading(false); 
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = 'audio/webm';
      const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : {};
      
      const mr = new MediaRecorder(stream, options as any);
      mediaRecorderRef.current = mr;
      
      chunksRef.current = [];
      
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
            console.warn("No audio data recorded.");
            setLoading(false);
            return;
        }
        
        const type = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type }); 
        const file = new File([blob], 'recording.webm', { type });
        
        try {
          const res = await api.processAudio(file, true); 
          onProcessed?.(res);
        } catch (err) {
          // swallow here; parent can choose to show separate UI if needed
        } finally {
          setLoading(false);
        }
      };

      mr.start();
      setRecording(true);
    } catch (e: any) {
      console.error("Microphone access error:", e);
      setPermissionError(e?.message || 'Microphone access denied');
      setLoading(false);
    }
  }

  function stop() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state === 'recording') {
      setRecording(false); 
      setLoading(true); 
      mr.stop(); 
    }
  }

  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') mr.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={start} 
          disabled={recording || loading} 
          className="btn"
          style={{ padding: '8px 14px', backgroundColor: recording ? '#868e96' : '#2ed573' }} 
        >
          Start Recording
        </button>

        <button 
          onClick={stop} 
          disabled={!recording || loading} 
          className="btn"
          style={{ padding: '8px 14px', backgroundColor: loading ? '#868e96' : '#ff4757' }} 
        >
          {loading ? 'Processing…' : 'Stop Recording'}
        </button>
        
        {loading && <span style={{ color: 'var(--accent)' }}>Processing Audio...</span>}
      </div>

      {/* Voice-reactive visualizer */}
      {recording && <VoiceVisualizer stream={streamRef.current} />}

      {permissionError && <p style={{ color: '#ff4757', marginTop: 8 }}>{permissionError}</p>}
    </div>
  );
}

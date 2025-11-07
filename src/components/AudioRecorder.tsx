import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ProcessAudioResponse } from '../types';

type Props = {
  onProcessed?: (res: ProcessAudioResponse) => void;
};

export function AudioRecorder({ onProcessed }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [permissionError, setPermissionError] = useState('');
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  async function start() {
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType } as any);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        try {
          setLoading(true);
          const res = await api.processAudio(file, true); // Pass true for Option 1 (real-time)
          onProcessed?.(res);
        } catch (err) {
          // swallow here; parent can choose to show separate UI if needed
        } finally {
          setLoading(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch (e: any) {
      setPermissionError(e?.message || 'Microphone access denied');
    }
  }

  function stop() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    }
    setRecording(false);
  }

  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') mr.stop();
    };
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={recording ? stop : start} disabled={loading} style={{ padding: '8px 14px' }}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {loading && <span>Processing…</span>}
      </div>
      {permissionError && <p style={{ color: '#c92a2a', marginTop: 8 }}>{permissionError}</p>}
    </div>
  );
}



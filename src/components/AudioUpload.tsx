import { useState } from 'react';
import { api } from '../api/client';
import type { ProcessAudioResponse } from '../types';

type Props = {
  onProcessed?: (res: ProcessAudioResponse) => void;
  patientTokenId?: string;
};

export function AudioUpload({ onProcessed, patientTokenId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessAudioResponse | null>(null);
  const [error, setError] = useState<string>('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!patientTokenId) {
      setError('Please choose patient first');
      alert('Please choose patient first');
      return;
    }
    if (!file) {
      setError('Please choose an audio file.');
      return;
    }
    try {
      setLoading(true);
      const res = await api.processAudio(file, false, patientTokenId);
      setResult(res);
      onProcessed?.(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, padding: 16 }}>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={!patientTokenId}
          />
          <button type="submit" disabled={loading || !patientTokenId} style={{ padding: '8px 14px' }}>
            {loading ? 'Processing…' : 'Upload & Process'}
          </button>
        </div>
      </form>

      {error && (
        <p style={{ color: '#c92a2a', marginTop: 12 }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#2ed573', margin: 0 }}>✅ Processed: {result.audio_file_name}</p>
        </div>
      )}
    </div>
  );
}



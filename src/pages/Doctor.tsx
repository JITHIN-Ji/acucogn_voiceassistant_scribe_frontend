import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ApprovePlanPayload, ApprovePlanResponse, ProcessAudioResponse, Patient } from '../types';
import { AudioRecorder } from '../components/AudioRecorder';
import { AudioUpload } from '../components/AudioUpload';

// Utility function to download SOAP JSON
function downloadSoap(res: ProcessAudioResponse | null) {
  if (!res) return;

  const dataToDownload = {
    audio_file_name: res.audio_file_name,
    soap_sections: res.soap_sections,
    transcript: res.transcript,
  };
  const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${res.audio_file_name || 'soap'}_latest.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to extract or initialize SOAP sections
function initializeSoapSections(result: ProcessAudioResponse | null): Record<string, string> {
  const soapData = result?.soap_sections;
  let initialSections: Record<string, any> = {};

  if (typeof soapData === 'string') {
    try {
      initialSections = JSON.parse(soapData);
    } catch {}
  } else if (typeof soapData === 'object' && soapData !== null) {
    initialSections = soapData;
  }

  return {
    S: initialSections.S || initialSections.Subjective || '',
    O: initialSections.O || initialSections.Objective || '',
    A: initialSections.A || initialSections.Assessment || '',
    P: initialSections.P || initialSections.Plan || '',
  };
}


async function playAudioFromSupabase(
  audioFileName: string, 
  audioRef: HTMLAudioElement | null,
  setAudioRef: (audio: HTMLAudioElement | null) => void,
  currentPlayingId: number | null,
  recordId: number,
  setPlayingRecordId: (id: number | null) => void
) {
  try {
    console.log('🎵 Audio playback initiated for:', audioFileName);
    console.log('🔍 Checking if path is null/empty:', !audioFileName);
    
    if (!audioFileName || audioFileName === 'null' || audioFileName === '') {
      console.error('❌ No audio file path provided');
      alert('No audio file available for this record.');
      return;
    }
    
    // If audio is already playing and it's the same record, pause and stop it
    if (audioRef && !audioRef.paused && currentPlayingId === recordId) {
      console.log('⏸️ Pausing and stopping audio');
      audioRef.pause();
      audioRef.currentTime = 0;
      setPlayingRecordId(null);
      return;
    }
    
    // If different audio is playing, stop it first
    if (audioRef && !audioRef.paused) {
      console.log('🛑 Stopping previous audio');
      audioRef.pause();
      audioRef.currentTime = 0;
    }

    // Try to get the public URL from Supabase client
    try {
      const { supabaseClient } = await import('../api/supabaseClient');
      
      const { data } = supabaseClient
        .storage
        .from('patient_db')
        .getPublicUrl(audioFileName);
      
      if (data && data.publicUrl) {
        console.log('🔗 Supabase public URL:', data.publicUrl);
        
        if (audioRef) {
          console.log('📝 Using existing audio element');
          audioRef.src = data.publicUrl;
          audioRef.crossOrigin = 'anonymous';
          
          audioRef.onerror = (e) => {
            console.error('❌ Audio loading error:', e);
            console.error('❌ Audio error code:', audioRef.error?.code);
            console.error('❌ Audio error message:', audioRef.error?.message);
            alert('Failed to load audio file. The file may not exist or is not accessible.');
            setPlayingRecordId(null);
          };
          
          audioRef.oncanplay = () => {
            console.log('✅ Audio loaded successfully, playing now');
          };
          
          audioRef.onloadstart = () => {
            console.log('📥 Audio loading started');
          };
          
          // Update state to indicate this record is now playing
          setPlayingRecordId(recordId);
          
          // Try to play
          const playPromise = audioRef.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('▶️ Audio is now playing');
              })
              .catch((error) => {
                console.error('❌ Playback error:', error);
                setPlayingRecordId(null);
              });
          }
        } else {
          console.log('🎙️ Creating new audio element');
          const audio = new Audio(data.publicUrl);
          audio.crossOrigin = 'anonymous';
          
          audio.onerror = (e) => {
            console.error('❌ Audio loading error:', e);
            console.error('❌ Audio error code:', audio.error?.code);
            setPlayingRecordId(null);
          };
          
          audio.oncanplay = () => {
            console.log('✅ Audio loaded successfully, playing now');
          };
          
          audio.onended = () => {
            console.log('🏁 Audio playback ended');
            setPlayingRecordId(null);
          };
          
          // Update state to indicate this record is now playing
          setPlayingRecordId(recordId);
          setAudioRef(audio);
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('▶️ Audio is now playing');
              })
              .catch((error) => {
                console.error('❌ Playback error:', error);
                setPlayingRecordId(null);
              });
          }
        }
      } else {
        console.error('❌ Could not get public URL from Supabase');
      }
    } catch (supabaseError) {
      console.error('⚠️ Error using Supabase client, trying direct URL:', supabaseError);
      
      // Fallback: construct URL directly
      const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.error('❌ Supabase URL not configured');
        alert('Supabase URL not configured. Please check environment variables.');
        return;
      }
      
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/patient_db/${audioFileName}`;
      console.log('🔗 Fallback constructed URL:', publicUrl);
      
      if (audioRef) {
        audioRef.src = publicUrl;
        audioRef.crossOrigin = 'anonymous';
        
        audioRef.onended = () => {
          console.log('🏁 Audio playback ended');
          setPlayingRecordId(null);
        };
        
        // Update state to indicate this record is now playing
        setPlayingRecordId(recordId);
        
        audioRef.play().catch((error) => {
          console.error('❌ Playback error:', error);
          setPlayingRecordId(null);
        });
      } else {
        const audio = new Audio(publicUrl);
        audio.crossOrigin = 'anonymous';
        
        audio.onended = () => {
          console.log('🏁 Audio playback ended');
          setPlayingRecordId(null);
        };
        
        // Update state to indicate this record is now playing
        setPlayingRecordId(recordId);
        setAudioRef(audio);
        
        audio.play().catch((error) => {
          console.error('❌ Playback error:', error);
          setPlayingRecordId(null);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in playAudioFromSupabase:', error);
    alert('Error playing audio: ' + (error instanceof Error ? error.message : String(error)));
    setPlayingRecordId(null);
  }
}

export function Doctor() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('page-background', 'doctor-page-bg');
    return () => {
      document.body.classList.remove('page-background', 'doctor-page-bg');
    };
  }, []);

  const [activeResult, setActiveResult] = useState<ProcessAudioResponse | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedPatientName, setSelectedPatientName] = useState<string>('');
  const [soapEditable, setSoapEditable] = useState<Record<string, string>>(() => initializeSoapSections(null));
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [planApproved, setPlanApproved] = useState(false);
  const [emailPreviewGenerated, setEmailPreviewGenerated] = useState(false);
  const [emailApproved, setEmailApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [emailApproving, setEmailApproving] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [soapHistory, setSoapHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentSoapRecordId, setCurrentSoapRecordId] = useState<number | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<number | null>(null);
  const [playingRecordId, setPlayingRecordId] = useState<number | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await api.getPatients();
      if (response.status === 'success' && response.patients) {
        setPatients(response.patients);
      }
    } catch (error: any) {
      console.error('Error loading patients:', error);
    }
  };

  useEffect(() => {
    if (activeResult) {
      const newSections = initializeSoapSections(activeResult);
      setSoapEditable(newSections);

      // Extract SOAP record ID if it was just saved to database
      if ('soap_record_id' in activeResult) {
        setCurrentSoapRecordId((activeResult as any).soap_record_id);
      }

      try {
        localStorage.setItem('latestSoapSummary', JSON.stringify(newSections));
      } catch (e) {
        console.error('Failed to save SOAP to localStorage:', e);
      }

      setPlanApproved(false);
      setEmailPreviewGenerated(false);
      setEmailApproved(false);
      setEmailPreview('');
      setMessage('New result loaded.');
    }
  }, [activeResult]);

  const title = useMemo(() => activeResult?.audio_file_name || 'No File Processed', [activeResult]);
  const isProcessing = approving || previewLoading || emailApproving || sendLoading;

  const handleSoapChange = (section: string, value: string) => {
    setSoapEditable(prev => ({ ...prev, [section]: value }));
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatient(patientId);
    const selected = patients.find(p => p.token_id === patientId);
    if (selected) {
      setSelectedPatientName(selected.name || '');
      setPatientEmail(selected.phone_number || '');
      setMessage(`✅ Patient "${selected.name}" selected successfully!`);
      setError('');
      
      // Load SOAP history for this patient
      loadSoapHistory(patientId);
    }
  };

  const loadSoapHistory = async (patientTokenId: string) => {
    setLoadingHistory(true);
    try {
      const response = await api.getPatientSoapRecords(patientTokenId);
      if (response.status === 'success' && response.soap_records) {
        // Normalize soap_sections: sometimes returned as JSON string from Supabase
        const normalized = response.soap_records.map((r: any) => {
          let soapSections = r.soap_sections;
          if (typeof soapSections === 'string') {
            try {
              soapSections = JSON.parse(soapSections);
            } catch (e) {
              soapSections = {};
            }
          }
          soapSections = soapSections || {};

          // Normalize possible key names to S/O/A/P
          const S = soapSections.S || soapSections.Subjective || soapSections.subjective || '';
          const O = soapSections.O || soapSections.Objective || soapSections.objective || '';
          const A = soapSections.A || soapSections.Assessment || soapSections.assessment || '';
          const P = soapSections.P || soapSections.Plan || soapSections.plan || '';

          return {
            ...r,
            soap_sections: { S, O, A, P },
          };
        });

        setSoapHistory(normalized);
        if (normalized.length > 0) {
          setMessage(`✅ Found ${normalized.length} previous record(s) for this patient.`);
        }
      }
    } catch (err: any) {
      console.error('Error loading SOAP history:', err);
      setSoapHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  function onSaveChanges() {
    setError('');
    setMessage('');

    const newSoapObject = {
      S: soapEditable.S,
      O: soapEditable.O,
      A: soapEditable.A,
      P: soapEditable.P,
    };

    try {
      localStorage.setItem('latestSoapSummary', JSON.stringify(newSoapObject));
    } catch (e) {
      console.error('Failed to save SOAP to localStorage:', e);
    }

    // Save to database if we have a record ID
    if (currentSoapRecordId) {
      saveSOAPToDatabase(newSoapObject);
    } else {
      setMessage('✅ SOAP changes saved (frontend state updated).');
    }
  }

  async function saveSOAPToDatabase(soapObject: Record<string, string>) {
    try {
      await api.updateSoapRecord(currentSoapRecordId!, soapObject);
      setMessage('✅ SOAP changes saved successfully to database!');
    } catch (err: any) {
      console.error('Error saving SOAP to database:', err);
      setError('Failed to save SOAP to database');
    }
  }

  async function approvePlan() {
    setError('');
    setMessage('');
    setApproving(true);
    setPlanApproved(false);

    const planSection = soapEditable.P;

    if (!planSection.trim()) {
      setApproving(false);
      setError('Plan section cannot be empty.');
      return;
    }

    try {
      const payload: ApprovePlanPayload = {
        plan_section: planSection,
        user_email: patientEmail || undefined,
        send_email: false,
      };

      await api.approvePlan(payload);

      setMessage('✅ Plan approved successfully. Click "Generate Email Preview" to continue.');
      setPlanApproved(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Plan approval failed');
    } finally {
      setApproving(false);
    }
  }

  async function generatePreview() {
    setError('');
    setMessage('');
    setEmailPreview('');
    setPreviewLoading(true);
    setEmailPreviewGenerated(false);
    setEmailApproved(false);

    try {
      const planSection = soapEditable.P;

      const payload: ApprovePlanPayload = {
        plan_section: planSection,
        user_email: patientEmail || undefined,
        send_email: false,
      };

      const resp: ApprovePlanResponse = await api.approvePlan(payload);
      const content = resp.appointment_preview?.email_content;

      if (content) {
        setEmailPreview(content);
        setEmailPreviewGenerated(true);
        setMessage('Preview generated. You can edit the email content below.');
      } else {
        setError('Email preview was empty.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Preview generation failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function approveEmail() {
    setError('');
    setMessage('');
    setEmailApproving(true);
    setEmailApproved(false);

    if (!emailPreview.trim()) {
      setEmailApproving(false);
      setError('Email content cannot be empty.');
      return;
    }

    try {
      setMessage('✅ Email approved successfully. You can now send the email.');
      setEmailApproved(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Email approval failed');
    } finally {
      setEmailApproving(false);
    }
  }

  async function sendEmail() {
    setError('');
    setMessage('');
    setSendLoading(true);

    const finalEmailContent = emailPreview;
    const planSection = soapEditable.P;

    if (!emailApproved) {
      setSendLoading(false);
      setError('Please approve the email before sending.');
      return;
    }

    try {
      const payload: ApprovePlanPayload = {
        plan_section: planSection,
        user_email: patientEmail || undefined,
        send_email: true,
        email_content: finalEmailContent,
      };

      await api.approvePlan(payload);
      setMessage('✅ Email sent successfully with the latest edited version.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Email sending failed');
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: '40px', paddingTop: '60px' }}>
      {/* Message/Error Display at Top */}
      {message && (
        <div style={{
          backgroundColor: 'rgba(46, 213, 115, 0.15)',
          border: '1px solid rgba(46, 213, 115, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#2ed573'
        }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{
          backgroundColor: 'rgba(255, 71, 87, 0.15)',
          border: '1px solid rgba(255, 71, 87, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#ff4757'
        }}>
          {error}
        </div>
      )}

      {/* Patient Selection Dropdown - FIXED at top */}
      <section className="card" style={{ 
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        maxWidth: '1200px',
        margin: '0 auto 24px'
      }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.2rem' }}>
          👤 Select Patient
        </h3>
        <select
          value={selectedPatient}
          onChange={(e) => handlePatientSelect(e.target.value)}
          className="input"
          style={{
            width: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            padding: '12px 14px',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          <option value="">-- Choose a Patient --</option>
          {patients.map((patient) => (
            <option key={patient.token_id} value={patient.token_id}>
              {patient.name}
            </option>
          ))}
        </select>
        {selectedPatientName && (
          <p style={{ 
            marginTop: '12px', 
            color: '#70d6ff',
            fontSize: '0.95rem'
          }}>
            Selected: <strong>{selectedPatientName}</strong>
          </p>
        )}
      </section>

      {/* Option 1 & Option 2 - FIXED layout, side by side */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '24px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        maxWidth: '1200px',
        margin: '0 auto 24px'
      }}>
        <section className="card" style={{ flex: '1', minWidth: '350px' }}>
          <h2>Option 1: Real-time Recording</h2>
          <AudioRecorder onProcessed={setActiveResult} patientTokenId={selectedPatient} />
        </section>

        <section className="card" style={{ flex: '1', minWidth: '350px' }}>
          <h2>Option 2: Upload Audio and Process</h2>
          <AudioUpload onProcessed={setActiveResult} patientTokenId={selectedPatient} />
        </section>
      </div>

      {/* New Result Sections - Shows when file is processed */}
      {activeResult && (
        <section className="card transcript-section" style={{ 
          marginTop: 24,
          padding: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          maxWidth: '1200px',
          margin: '24px auto'
        }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--accent)', fontSize: '1.4rem' }}>
            📝 Transcript
          </h3>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            padding: '16px',
            color: 'white',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {activeResult.transcript || 'No transcript available'}
          </div>
        </section>
      )}

      {activeResult && (
        <section className="card soap-summary-section" style={{ 
          marginTop: 24,
          padding: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          maxWidth: '1200px',
          margin: '24px auto'
        }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--accent)', fontSize: '1.4rem' }}>
            📋 SOAP Summary (Editable)
          </h3>
          
          <div className="soap-sections grid grid-2" style={{ marginBottom: 20, gap: '16px' }}>
            {Object.keys(soapEditable).map((key) => (
              <div key={key} className="soap-section" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h4 style={{ 
                  marginBottom: '12px', 
                  color: '#70d6ff',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  {key} - {key === 'S' ? 'Subjective' : key === 'O' ? 'Objective' : key === 'A' ? 'Assessment' : 'Plan'}
                </h4>
                <textarea
                  rows={key === 'P' ? 6 : 4}
                  value={soapEditable[key]}
                  onChange={(e) => handleSoapChange(key, e.target.value)}
                  className="textarea"
                  style={{ 
                    width: '100%', 
                    minHeight: '80px',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '12px',
                    color: 'white',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }} className="row">
            <button 
              className="btn" 
              onClick={onSaveChanges} 
              disabled={isProcessing}
              style={{ marginRight: '12px' }}
            >
              💾 Save Changes
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => downloadSoap(activeResult)} 
              disabled={isProcessing}
            >
              📥 Download SOAP (JSON)
            </button>
          </div>
        </section>
      )}

      {activeResult && (
        <section className="card email-section" style={{ 
          marginTop: 24,
          padding: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          maxWidth: '1200px',
          margin: '24px auto'
        }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--accent)', fontSize: '1.4rem' }}>
            📧 Patient Communication
          </h3>
          
          <div className="row" style={{ marginTop: 8, marginBottom: 16, gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Patient email (optional)"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              className="input"
              style={{ 
                flex: 1, 
                maxWidth: '300px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'white'
              }}
            />
            <button 
              className="btn" 
              onClick={approvePlan} 
              disabled={approving || !soapEditable.P.trim()}
            >
              {approving ? '⏳ Approving…' : '✅ Approve Plan'}
            </button>

            {planApproved && (
              <button 
                className="btn btn-outline" 
                onClick={generatePreview} 
                disabled={previewLoading}
              >
                {previewLoading ? '⏳ Generating…' : '📝 Generate Email Preview'}
              </button>
            )}
          </div>

          {emailPreviewGenerated && (
            <div className="email-preview-container" style={{ 
              marginTop: 20,
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px'
            }}>
              <h4 style={{ 
                marginBottom: 16, 
                color: '#70d6ff',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>
                ✉️ Email Preview (Editable)
              </h4>
              <textarea
                rows={10}
                value={emailPreview}
                onChange={(e) => setEmailPreview(e.target.value)}
                placeholder="Edit the email content here..."
                className="textarea email-textarea"
                style={{ 
                  width: '100%', 
                  marginBottom: 16,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '12px',
                  color: 'white',
                  fontSize: '0.95rem',
                  lineHeight: '1.6'
                }}
              />
              <div className="row" style={{ marginTop: 12, gap: '12px' }}>
                <button
                  className="btn"
                  onClick={approveEmail}
                  disabled={emailApproving || !emailPreview.trim()}
                >
                  {emailApproving ? '⏳ Approving…' : '✅ Approve Email'}
                </button>

                {emailApproved && (
                  <button 
                    className="btn" 
                    onClick={sendEmail} 
                    disabled={sendLoading}
                    style={{ backgroundColor: '#2ed573' }}
                  >
                    {sendLoading ? '📤 Sending…' : '📤 Send Email'}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* SOAP History Section - Shows below result when records exist */}
      {selectedPatient && soapHistory.length > 0 && (
        <section className="card" style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          maxWidth: '1200px',
          margin: '0 auto 24px'
        }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--accent)', fontSize: '1.2rem' }}>
            📚 Previous Medical Records ({soapHistory.length})
          </h3>
          {loadingHistory && <p style={{ color: '#70d6ff' }}>Loading history...</p>}
          <div style={{ 
            maxHeight: '600px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            {soapHistory.map((record: any, index: number) => (
              <div key={record.id} style={{
                marginBottom: index < soapHistory.length - 1 ? '20px' : '0',
                paddingBottom: index < soapHistory.length - 1 ? '20px' : '0',
                borderBottom: index < soapHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#999', fontSize: '0.85rem' }}>
                    📋 Medical Record
                  </span>
                  <h4 style={{ color: '#70d6ff', margin: '0', fontSize: '0.95rem', fontWeight: '600' }}>
                    📅 {new Date(record.created_at).toLocaleDateString()} {new Date(record.created_at).toLocaleTimeString()}
                  </h4>
                </div>
                
                {/* SOAP Sections */}
                <div style={{ color: '#bbb', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#70d6ff' }}>S (Subjective):</strong> {record.soap_sections?.S || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#70d6ff' }}>O (Objective):</strong> {record.soap_sections?.O || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#70d6ff' }}>A (Assessment):</strong> {record.soap_sections?.A || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong style={{ color: '#70d6ff' }}>P (Plan):</strong> {record.soap_sections?.P || 'N/A'}
                  </div>
                </div>

                {/* Transcript and Play Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setExpandedTranscript(expandedTranscript === record.id ? null : record.id)}
                    style={{ fontSize: '0.9rem', padding: '8px 14px' }}
                  >
                    🎙️ {expandedTranscript === record.id ? 'Hide Transcript' : 'Show Transcript'}
                  </button>
                  <button
                    className="btn"
                    onClick={async () => {
                      // Use storage_path if available, otherwise fall back to audio_file_name
                      const audioPath = record.storage_path || record.audio_file_name;
                      console.log('🎯 Play button clicked for record:', record.id);
                      console.log('📦 storage_path:', record.storage_path);
                      console.log('📦 audio_file_name:', record.audio_file_name);
                      console.log('📦 Final audio path used:', audioPath);
                      console.log('📋 Full Record data:', JSON.stringify(record, null, 2));
                      
                      await playAudioFromSupabase(
                        audioPath, 
                        audioRef,
                        setAudioRef, 
                        playingRecordId, 
                        record.id, 
                        setPlayingRecordId
                      );
                    }}
                    style={{ fontSize: '0.9rem', padding: '8px 14px' }}
                  >
                    {playingRecordId === record.id ? '⏸️ Pause Audio' : '▶️ Play Audio'}
                  </button>
                </div>

                {/* Transcript Section - Shown when expanded */}
                {expandedTranscript === record.id && record.transcript && (
                  <div style={{ 
                    color: '#ddd', 
                    fontSize: '0.85rem', 
                    lineHeight: '1.6',
                    backgroundColor: 'rgba(77, 208, 225, 0.1)',
                    border: '1px solid rgba(77, 208, 225, 0.3)',
                    padding: '12px',
                    borderRadius: '4px',
                    marginTop: '8px',
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    <strong style={{ color: '#70d6ff', display: 'block', marginBottom: '8px' }}>📝 Full Transcript:</strong>
                    {record.transcript}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

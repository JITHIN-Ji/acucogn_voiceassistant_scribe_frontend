import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ApprovePlanPayload, ApprovePlanResponse, ProcessAudioResponse, Patient } from '../types';
import { AudioRecorder } from '../components/AudioRecorder';
import { AudioUpload } from '../components/AudioUpload';


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
    console.debug('🎵 Audio playback initiated for:', audioFileName);
    console.debug('🔍 Checking if path is null/empty:', !audioFileName);
    
    if (!audioFileName || audioFileName === 'null' || audioFileName === '') {
      console.error('❌ No audio file path provided');
      alert('No audio file available for this record.');
      return;
    }
    
    
    if (audioRef && !audioRef.paused && currentPlayingId === recordId) {
      console.debug('⏸️ Pausing and stopping audio');
      audioRef.pause();
      audioRef.currentTime = 0;
      setPlayingRecordId(null);
      return;
    }
    
    
    if (audioRef && !audioRef.paused) {
      console.debug('🛑 Stopping previous audio');
      audioRef.pause();
      audioRef.currentTime = 0;
    }

    
    const streamUrl = api.getAudioUrl(audioFileName);
    console.debug('🔗 Using backend API for audio URL:', streamUrl);

    if (audioRef) {
      audioRef.src = streamUrl;
      audioRef.crossOrigin = 'anonymous';

      audioRef.onerror = (e) => {
        console.error('❌ Audio loading error:', e);
        console.error('❌ Audio error code:', audioRef.error?.code);
        alert('Failed to load audio file. The file may not exist or is not accessible.');
        setPlayingRecordId(null);
      };

      audioRef.oncanplay = () => {
        console.debug('✅ Audio loaded successfully, playing now');
      };

      setPlayingRecordId(recordId);

      const playPromise = audioRef.play();
      if (playPromise !== undefined) {
        playPromise.then(() => console.debug('▶️ Audio is now playing')).catch((error) => { 
          console.error('❌ Playback error:', error); 
          setPlayingRecordId(null); 
        });
      }
    } else {
      const audio = new Audio(streamUrl);
      audio.crossOrigin = 'anonymous';

      audio.onerror = (e) => {
        console.error('❌ Audio loading error:', e);
        console.error('❌ Audio error code:', audio.error?.code);
        setPlayingRecordId(null);
      };

      audio.oncanplay = () => console.debug('✅ Audio loaded successfully, playing now');
      audio.onended = () => { 
        console.debug('🏁 Audio playback ended'); 
        setPlayingRecordId(null); 
      };

      setPlayingRecordId(recordId);
      setAudioRef(audio);

      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch((error) => { 
        console.error('❌ Playback error:', error); 
        setPlayingRecordId(null); 
      });
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
  const [buttonError, setButtonError] = useState<string>('');

  const checkNetworkConnection = (): boolean => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setButtonError('❌ Network connection failed. Please check your internet.');
      return false;
    }
    setButtonError('');
    return true;
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Network connection failed');
      setPatients([]);
      return;
    }

    try {
      const response = await api.getPatients();
      if (response.status === 'success' && response.patients) {
        setPatients(response.patients);
        setError('');
      }
    } catch (error: any) {
      console.error('Error loading patients:', error);
      setError('Network connection failed');
    }
  };

  
  useEffect(() => {
    const handleOnline = () => {
      setError('');
      setButtonError('');
    };
    const handleOffline = () => setError('Network connection failed');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (activeResult) {
      const newSections = initializeSoapSections(activeResult);
      setSoapEditable(newSections);

      
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

  
  const loadSoapHistory = async (patientId: string) => {
    setLoadingHistory(true);
    try {
      const response = await api.getPatientSoapRecords(Number(patientId));
      if (response.status === 'success' && response.soap_records) {
        
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

  
  const handlePatientSelect = (patientId: string) => {

    if (!navigator.onLine) {
    setError("❌ Network connection failed. Please check your internet.");
    setMessage('');
    return;
  }
    setSelectedPatient(patientId);
    const selected = patients.find(p => String(p.id) === patientId);
    if (selected) {
      setSelectedPatientName(selected.name || '');
      setPatientEmail((selected as any).email || '');
      setMessage(`✅ Patient "${selected.name}" selected successfully!`);
      setError('');
      
      
      loadSoapHistory(patientId);
    }
  };

  
  useEffect(() => {
    
    setActiveResult(null);
    setSoapEditable(initializeSoapSections(null));
    setCurrentSoapRecordId(null);
    setEmailPreview('');
    setEmailPreviewGenerated(false);
    setEmailApproved(false);
    setPlanApproved(false);
    setPatientEmail('');
    
    if (!selectedPatient) {
      setMessage('');
      setError('');
      setSoapHistory([]); 
    }
  }, [selectedPatient]);

  function onSaveChanges() {
    if (!checkNetworkConnection()) return;
    
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
      setButtonError('Failed to save SOAP to database');
    }
  }

  async function approvePlan() {
    if (!checkNetworkConnection()) return;
    
    setError('');
    setMessage('');
    setApproving(true);
    setPlanApproved(false);

    const planSection = soapEditable.P;

    if (!planSection.trim()) {
      setApproving(false);
      setButtonError('Plan section cannot be empty.');
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
      setButtonError(e?.response?.data?.detail || 'Plan approval failed');
    } finally {
      setApproving(false);
    }
  }

  async function generatePreview() {
    if (!checkNetworkConnection()) return;
    
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
        setButtonError('Email preview was empty.');
      }
    } catch (e: any) {
      setButtonError(e?.response?.data?.detail || 'Preview generation failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function approveEmail() {
    if (!checkNetworkConnection()) return;
    
    setError('');
    setMessage('');
    setEmailApproving(true);
    setEmailApproved(false);

    if (!emailPreview.trim()) {
      setEmailApproving(false);
      setButtonError('Email content cannot be empty.');
      return;
    }

    try {
      setMessage('✅ Email approved successfully. You can now send the email.');
      setEmailApproved(true);
    } catch (e: any) {
      setButtonError(e?.response?.data?.detail || 'Email approval failed');
    } finally {
      setEmailApproving(false);
    }
  }

  async function sendEmail() {
    if (!checkNetworkConnection()) return;
    
    setError('');
    setMessage('');
    setSendLoading(true);

    const finalEmailContent = emailPreview;
    const planSection = soapEditable.P;

    if (!emailApproved) {
      setSendLoading(false);
      setButtonError('Please approve the email before sending.');
      return;
    }

    try {
      const payload: ApprovePlanPayload = {
        plan_section: planSection,
        user_email: patientEmail || undefined,
        send_email: true,
        email_content: finalEmailContent,
      };

      const resp: ApprovePlanResponse = await api.approvePlan(payload);
      
      
      const appointmentSending = resp.appointment_sending;
      if (appointmentSending?.status === 'error') {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          
          setError('Network connection failed. Please check your internet.');
          setButtonError('');
        } else {
          
          setError('');
          setButtonError(appointmentSending?.error || 'Failed to send email');
        }
        setSendLoading(false);
        return;
      }
      
      setMessage('✅ Email sent successfully with the latest edited version.');
    } catch (e: any) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Offline: show the big network modal
        setError('Network connection failed. Please check your internet.');
        setButtonError('');
      } else {
        // Backend error: display returned error inline
        const errorDetail = e?.response?.data?.detail || e?.response?.data?.message || 'Email sending failed';
        setError('');
        setButtonError(errorDetail);
      }
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <div style={{ paddingBottom: '40px', paddingTop: '60px' }}>
      
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
{typeof navigator !== 'undefined' && !navigator.onLine && error && (
  <div className="network-modal" role="alert" aria-live="assertive">
    <div className="network-modal__glow" aria-hidden="true" />
    <button
      onClick={() => { setError(''); setButtonError(''); }}
      aria-label="Close network status"
      title="Close"
      className="network-modal__close"
    >
      ✕
    </button>
    <div className="network-modal__icon">📡</div>
    <h3 className="network-modal__title">No internet</h3>
    <p className="network-modal__message">Check your connection and try again.</p>
  </div>
)}
      
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
          onFocus={() => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              setError('Network connection failed');
            } else {
              setError('');
            }
          }}
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
            <option key={patient.id} value={String(patient.id)}>
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
        <section className="card" style={{ flex: '1', minWidth: '350px', position: 'relative', transition: 'all 0.3s ease' }} onMouseEnter={(e) => {
          if (!selectedPatient) {
            const overlay = e.currentTarget.querySelector('.hover-overlay');
            if (overlay) (overlay as HTMLElement).style.opacity = '1';
          }
        }} onMouseLeave={(e) => {
          const overlay = e.currentTarget.querySelector('.hover-overlay');
          if (overlay) (overlay as HTMLElement).style.opacity = '0';
        }}>
          <h2>Option 1: Real-time Recording</h2>
          <AudioRecorder onProcessed={setActiveResult} patientId={selectedPatient} />
          {!selectedPatient && (
            <div className="hover-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              cursor: 'not-allowed',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600', textAlign: 'center' }}>Please select a patient</span>
            </div>
          )}
        </section>

        <section className="card" style={{ flex: '1', minWidth: '350px', position: 'relative', transition: 'all 0.3s ease' }} onMouseEnter={(e) => {
          if (!selectedPatient) {
            const overlay = e.currentTarget.querySelector('.hover-overlay');
            if (overlay) (overlay as HTMLElement).style.opacity = '1';
          }
        }} onMouseLeave={(e) => {
          const overlay = e.currentTarget.querySelector('.hover-overlay');
          if (overlay) (overlay as HTMLElement).style.opacity = '0';
        }}>
          <h2>Option 2: Upload Audio and Process</h2>
          <AudioUpload onProcessed={setActiveResult} patientId={selectedPatient} />
          {!selectedPatient && (
            <div className="hover-overlay" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              cursor: 'not-allowed',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600', textAlign: 'center' }}>Please select a patient</span>
            </div>
          )}
        </section>
      </div>

      
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
          
          {buttonError && (
            <div style={{
              backgroundColor: 'rgba(255, 71, 87, 0.15)',
              border: '1px solid rgba(255, 71, 87, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '16px',
              color: '#ff4757'
            }}>
              {buttonError}
            </div>
          )}
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
              placeholder="Add patient email"
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

          {buttonError && !emailPreviewGenerated && (
            <div style={{
              backgroundColor: 'rgba(255, 71, 87, 0.15)',
              border: '1px solid rgba(255, 71, 87, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#ff4757'
            }}>
              {buttonError}
            </div>
          )}

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
              
              {buttonError && (
                <div style={{
                  backgroundColor: 'rgba(255, 71, 87, 0.15)',
                  border: '1px solid rgba(255, 71, 87, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginTop: '16px',
                  color: '#ff4757'
                }}>
                  {buttonError}
                </div>
              )}
            </div>
          )}
          
          
        </section>
      )}

      
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
                      
                      const audioPath = record.storage_path || record.audio_file_name;
                      console.debug('🎯 Play button clicked for record:', record.id);
                      console.debug('📦 storage_path:', record.storage_path);
                      console.debug('📦 audio_file_name:', record.audio_file_name);
                      console.debug('📦 Final audio path used:', audioPath);
                      
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

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

    setMessage('✅ SOAP changes saved (frontend state updated).');
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

      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '24px',
        marginBottom: '60px',
        flexWrap: 'wrap',
        maxWidth: '1400px',
        margin: '0 auto 60px'
      }}>
        <section className="card" style={{ flex: '1', minWidth: '400px', maxWidth: '600px' }}>
          <h2>Option 1: Real-time Recording</h2>
          <AudioRecorder onProcessed={setActiveResult} />
        </section>

        <section className="card" style={{ flex: '1', minWidth: '400px', maxWidth: '600px' }}>
          <h2>Option 2: Upload Audio and Process</h2>
          <AudioUpload onProcessed={setActiveResult} />
        </section>
      </div>

      {activeResult && (
        <section className="card transcript-section" style={{ 
          marginTop: 24,
          padding: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px'
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
          borderRadius: '12px'
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
          borderRadius: '12px'
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
    </div>
  );
}

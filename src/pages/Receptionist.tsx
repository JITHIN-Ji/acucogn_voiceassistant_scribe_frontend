
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Patient, CreatePatientPayload } from '../types';


function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 10); 
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

export function Receptionist() {
  const sessionIdRef = useRef<string>(getSessionId());
  
  
  useEffect(() => {
    document.body.classList.add('page-background', 'receptionist-page-bg');
    return () => {
      document.body.classList.remove('page-background', 'receptionist-page-bg');
    };
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [buttonError, setButtonError] = useState<string>('');

  const checkNetworkConnection = (): boolean => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setButtonError('❌ Network connection failed. Please check your internet.');
      return false;
    }
    setButtonError('');
    return true;
  };

  
  const [formData, setFormData] = useState<CreatePatientPayload>({
    name: '',
    address: '',
    phone_number: '',
    problem: '',
  });

  
  useEffect(() => {
    loadPatients();
  }, []);

  
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

  const loadPatients = async () => {
    try {
      
      const response = await api.getPatients(sessionIdRef.current);
      if (response.status === 'success' && response.patients) {
        setPatients(response.patients);
      }
    } catch (error: any) {
      console.error('Error loading patients:', error);
      setError('Network connection failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkNetworkConnection()) return;
    
    setError('');
    setMessage('');
    setLoading(true);

    if (!formData.name.trim()) {
      setButtonError('Patient name is required');
      setLoading(false);
      return;
    }

    try {
      
      const response = await api.createPatient({ ...formData, session_id: sessionIdRef.current });
      if (response.status === 'success') {
        setMessage('✅ Patient saved successfully!');
        setFormData({
          name: '',
          address: '',
          phone_number: '',
          problem: '',
        });
        setButtonError('');
        setShowForm(false);
        await loadPatients(); 
      } else {
        setButtonError(response.message || 'Network connection failed');
      }
    } catch (error: any) {
      console.error('Error saving patient:', error);
      setButtonError(error?.response?.data?.message || 'Network connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      name: '',
      address: '',
      phone_number: '',
      problem: '',
    });
    setError('');
    setMessage('');
    setButtonError('');
  };

  return (
    <div>
      <div className="hero">
        <h1>Receptionist Portal</h1>
        <p className="subtle subtitle-prominent">Manage patient appointments and communications.</p>
        {message && (
          <div
            style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: '12px 16px',
              borderRadius: '8px',
              marginTop: '12px',
              marginBottom: '16px',
              fontWeight: 500
            }}
          >
            {message}
          </div>
        )}

      </div>
      
      
      <section className="card" style={{
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        maxWidth: '1200px',
        margin: '0 auto 24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginTop: '0',
          flexWrap: 'wrap'
        }}>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            onFocus={() => {
              if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setError('Network connection failed');
              } else {
                setError('');
              }
            }}
            className="input"
            style={{ minWidth: '200px', color: selectedPatient ? '#000' : 'var(--text)', width: '100%', maxWidth: '420px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 12px' }}
          >
            <option value="" style={{ color: 'var(--text)' }}>Select Patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={String(patient.id)} style={{ color: '#000' }}>
                {patient.name}
              </option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn" onClick={() => setShowForm(true)}>
              Add Patient
            </button>
          </div>
        </div>
      </section>

      {selectedPatient && (
        <section className="card" style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          maxWidth: '1200px',
          margin: '0 auto 24px'
        }}> 
          <h3>Selected Patient Information</h3>
          {(() => {
            const patient = patients.find(p => String(p.id) === selectedPatient);
            if (patient) {
              return (
                <div>
                  <p><strong>Name:</strong> {patient.name}</p>
                  <p><strong>Address:</strong> {patient.address || 'N/A'}</p>
                  <p><strong>Phone:</strong> {patient.phone_number || 'N/A'}</p>
                  <p><strong>Problem:</strong> {patient.problem || 'N/A'}</p>
                  <p className="subtle"><strong>Patient ID:</strong> {patient.id}</p>
                </div>
              );
            }
            return <p>Patient not found</p>;
          })()}
        </section>
      )}

      
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          overflowX: 'hidden',
        }}>
            <div className="card" style={{
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            padding: '20px',
            paddingLeft: '24px',
            paddingRight: '24px',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
          }}>
            <button
              onClick={handleCloseForm}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
            <h2 style={{ marginTop: 0 }}>Add New Patient</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Patient Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 12px' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 12px' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="input"
                  style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 12px' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>Patient's Problem</label>
                <textarea
                  name="problem"
                  value={formData.problem}
                  onChange={handleInputChange}
                  className="textarea"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '100px', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '12px' }}
                  rows={4}
                />
              </div>
              <div className="row" style={{ marginTop: 16 }}>
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? '⏳ Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleCloseForm}>
                  Cancel
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

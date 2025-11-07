import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';


function usePageBackground(className: string) {
    useEffect(() => {
        document.body.classList.add('page-background', className);
        return () => {
            document.body.classList.remove('page-background', className);
        };
    }, [className]);
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface SoapData {
  S: string;
  O: string;
  A: string;
  P: string;
}

export function User() {
  usePageBackground('user-page-bg'); // This now uses the background with '--page-gradient: none;'
  const [soapData, setSoapData] = useState<SoapData>({
    S: '',
    O: '',
    A: '',
    P: '',
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Hello! I\'m your medical assistant. How can I help you today?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Load latest SOAP summary from localStorage
  useEffect(() => {
    const savedSoap = localStorage.getItem('latestSoapSummary');
    if (savedSoap) {
      try {
        const parsed = JSON.parse(savedSoap);
        setSoapData({
          S: parsed.S || parsed.Subjective || '',
          O: parsed.O || parsed.Objective || '',
          A: parsed.A || parsed.Assessment || '',
          P: parsed.P || parsed.Plan || '',
        });
      } catch (e) {
        console.error('Failed to parse saved SOAP data:', e);
      }
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const question = inputMessage.trim();
    const userMessage: Message = {
      id: messages.length + 1,
      text: question,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Check if SOAP data is available
      if (!soapData.S && !soapData.O && !soapData.A && !soapData.P) {
        const botMessage: Message = {
          id: messages.length + 2,
          text: 'No SOAP summary available. Please visit the Doctor Portal to generate a summary first.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botMessage]);
        setLoading(false);
        return;
      }

      // Call the backend API
      const response = await api.userChat({
        question: question,
        soap_summary: {
          S: soapData.S,
          O: soapData.O,
          A: soapData.A,
          P: soapData.P,
        },
      });

      const botMessage: Message = {
        id: messages.length + 2,
        text: response.answer || 'I apologize, but I couldn\'t process your question. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: messages.length + 2,
        text: error?.response?.data?.answer || 'I apologize, but I\'m having trouble processing your question right now. Please try again or contact your doctor directly.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div>
      <div className="hero">
        <h1>User Portal</h1>
        <p className="subtle subtitle-prominent">View your latest SOAP summary and chat with our medical assistant.</p>
      </div>

      <div className="user-page-container">
        {/* Left Side - SOAP Summary */}
        <section className="card">
          <h3>Latest SOAP Summary</h3>
          {soapData.S || soapData.O || soapData.A || soapData.P ? (
            <div className="soap-display-section" style={{ marginTop: 16 }}>
              <div className="card-mini">
                <h4>S - Subjective</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {soapData.S || 'No data available'}
                </p>
              </div>
              <div className="card-mini">
                <h4>O - Objective</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {soapData.O || 'No data available'}
                </p>
              </div>
              <div className="card-mini">
                <h4>A - Assessment</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {soapData.A || 'No data available'}
                </p>
              </div>
              <div className="card-mini">
                <h4>P - Plan</h4>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {soapData.P || 'No data available'}
                </p>
              </div>
            </div>
          ) : (
            <p className="subtle" style={{ marginTop: 16 }}>
              No SOAP summary available. Please visit the Doctor Portal to generate a summary.
            </p>
          )}

          {/* Important Message Box - Appointment Details Only */}
          {soapData.P && (() => {
            const planText = soapData.P;
            const lowerText = planText.toLowerCase();
            
            // Check if there's any appointment mention to even bother rendering the box
            const hasAppointment = lowerText.includes('appointment') || 
                                   lowerText.includes('follow-up') || 
                                   lowerText.includes('scheduled') ||
                                   lowerText.includes('emergency department'); 
            
            if (!hasAppointment) {
              return null;
            }
            
            
            
            
            const followUpKeywords = /follow-?up|scheduled|at\s+\d{1,2}\s+(?:am|pm)|date|time|in\s+\d+\s+day|in\s+\d+\s+week|check\s+recovery|come\s+in\s+earlier/i;
            
            const medicationKeywords = /prescribed|tablet|capsule|syrup|mg|ml|dosage|teaspoon/i;
            
            
            const sentencesForScan = planText.split(/(?<=[\.!?\;])\s*/);
            let appointmentDetails: string[] = [];
            
            sentencesForScan.forEach(s => {
                const trimmed = s.trim();
                if (!trimmed) return;
                
                const lowerTrimmed = trimmed.toLowerCase();
                
                
                const isStronglyAppointmentRelated = lowerTrimmed.match(followUpKeywords);
                
                
                const isEmergencyFollowUp = lowerTrimmed.includes('symptoms worsen') || lowerTrimmed.includes('develop high fever') || lowerTrimmed.includes('shortness of breath') || lowerTrimmed.includes('chest pain') || lowerTrimmed.includes('emergency department');
                
                
                const isGenerallyAppointmentRelated = lowerTrimmed.match(/appointment|visit|consult/i);
                
                
                const isMedicationDetail = lowerTrimmed.match(medicationKeywords);

                
                if (isStronglyAppointmentRelated || isEmergencyFollowUp) {
                    if (!appointmentDetails.includes(trimmed)) {
                        appointmentDetails.push(trimmed);
                    }
                } 
                
                else if (isGenerallyAppointmentRelated && !isMedicationDetail) {
                    if (!appointmentDetails.includes(trimmed)) {
                        appointmentDetails.push(trimmed);
                    }
                }
            });
            
            
            appointmentDetails = appointmentDetails.slice(0, 5);


            if (appointmentDetails.length > 0) {
              return (
                <div className="important-message-box" style={{ 
                  marginTop: 16, 
                  padding: 16, 
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '2px solid #dc2626',
                  borderRadius: '8px',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {/* Use SVG to avoid emoji rendering as a black square on some systems */}
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                      style={{ display: 'block' }}
                    >
                      <path fill="#dc2626" d="M4 3h2v18H4V3zm4 2h9l-1.5 3L21 11h-9l-1.5 3H8V5z"/>
                    </svg>
                    <h4 style={{ margin: 0, color: '#dc2626' }}>Important: Appointment Details</h4>
                  </div>
                  <div style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)' }}>
                    {appointmentDetails.map((detail, idx) => (
                      <p key={idx} style={{ margin: '4px 0', fontWeight: '500' }}>
                        {detail}
                      </p>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </section>

        
        <section className="card chat-section">
          <h3>Chat Assistant</h3>
          <div className="chat-messages" ref={chatMessagesRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ color: msg.sender === 'user' ? 'var(--accent)' : 'var(--accent-2)' }}>
                    {msg.sender === 'user' ? 'You' : 'Assistant'}
                  </strong>
                  <span className="subtle" style={{ fontSize: '0.85rem' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.text}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="input"
            />
            <button className="btn" onClick={handleSendMessage} disabled={!inputMessage.trim() || loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
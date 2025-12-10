import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsLoading(true);
    setError('');
    
    try {
      const { authApi } = await import('../api/client');
      const data = await authApi.googleAuth(credentialResponse.credential);
      
      if (data.status === 'success' && data.user) { 
        login(data.user);  
        navigate('/');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to authenticate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.');
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #2c5f6f 0%, #1a3a47 50%, #2c5f6f 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '50px 40px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center'
        }}>
          
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ 
              marginBottom: '10px', 
              color: '#2c5f6f',
              fontSize: '32px',
              fontWeight: '700'
            }}>
              Acucogn Ambient Scribe
            </h1>
            <p style={{ 
              marginBottom: '10px', 
              color: '#5a7c89',
              fontSize: '16px'
            }}>
              Let Doctors talk. We handle notes.
            </p>
            <p style={{ 
              color: '#5a7c89',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Sign in to continue
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '14px',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '30px',
            opacity: isLoading ? 0.6 : 1,
            pointerEvents: isLoading ? 'none' : 'auto'
          }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="filled_blue"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          {isLoading && (
            <div style={{ 
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e0e0e0',
                borderTop: '3px solid #2c5f6f',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#5a7c89', fontSize: '14px' }}>
                Authenticating...
              </p>
            </div>
          )}

          <div style={{ 
            marginTop: '40px', 
            paddingTop: '24px',
            borderTop: '1px solid #e0e0e0'
          }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#888', 
              lineHeight: '1.6',
              margin: 0
            }}>
              By signing in, you agree to our Terms of Service and Privacy Policy.
              <br />
              Only authorized medical personnel should access this system.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </GoogleOAuthProvider>
  );
}
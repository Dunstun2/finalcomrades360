import React, { useEffect, useState } from 'react';

export default function MaintenancePage() {
  const [message, setMessage] = useState('System is currently under maintenance. Please try again later.');
  const [dots, setDots] = useState('');

  // Try to pull the custom message from the last 503 response stored in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('maintenance_message');
    if (stored) setMessage(stored);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Polling removed to prevent infinite redirect loops on granular maintenance.
  // Instead, the user can use the "Try Now" or "Back to Home" buttons.

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: '24px',
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(239,68,68,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'pulse 8s ease-in-out infinite reverse',
        }} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gearSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes gearSpinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        maxWidth: '520px',
        width: '100%',
        animation: 'fadeUp 0.8s ease-out both',
      }}>

        {/* Gear animation */}
        <div style={{ marginBottom: '32px', position: 'relative', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Big gear */}
          <div style={{
            fontSize: '72px',
            display: 'inline-block',
            animation: 'gearSpin 8s linear infinite',
            filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.5))',
          }}>⚙️</div>
          {/* Small gear */}
          <div style={{
            fontSize: '40px',
            display: 'inline-block',
            position: 'absolute',
            right: '140px',
            top: '50px',
            animation: 'gearSpinReverse 4s linear infinite',
            filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.4))',
          }}>⚙️</div>
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '100px',
          padding: '6px 16px',
          marginBottom: '20px',
        }}>
          <span style={{
            width: '8px', height: '8px',
            background: '#ef4444',
            borderRadius: '50%',
            display: 'inline-block',
            boxShadow: '0 0 8px #ef4444',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{ color: '#fca5a5', fontWeight: '700', fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            System Locked
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 42px)',
          fontWeight: '900',
          color: '#f1f5f9',
          margin: '0 0 16px',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }}>
          Under Maintenance
        </h1>

        {/* Message card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '32px',
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{
            color: '#94a3b8',
            fontSize: '15px',
            lineHeight: 1.7,
            margin: 0,
          }}>
            {message}
          </p>
        </div>

        {/* Auto-check notice (Optional/Status) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: '#64748b',
          fontSize: '13px',
        }}>
          <span>Platform status: ONLINE</span>
          <span style={{
            width: '6px', height: '6px',
            background: '#22c55e',
            borderRadius: '50%',
          }} />
        </div>

        {/* Manual retry and Navigation */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
          <button
            onClick={() => {
              const returnPath = sessionStorage.getItem('maintenance_return_path') || '/';
              window.location.href = returnPath;
            }}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.target.style.transform = ''}
          >
            🔄 Try Re-entering
          </button>

          <button
            onClick={() => {
              sessionStorage.removeItem('maintenance_message');
              sessionStorage.removeItem('maintenance_return_path');
              window.location.href = '/';
            }}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.05)',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
          >
            🏠 Back to Home
          </button>
        </div>

        {/* Footer */}
        <p style={{ color: '#334155', fontSize: '12px', marginTop: '32px' }}>
          Comrades360 © {new Date().getFullYear()}
        </p>

        {/* Discreet admin link */}
        <div style={{ marginTop: '20px' }}>
          <a
            href="/login?redirect=/dashboard-login"
            style={{
              color: '#1e293b',
              fontSize: '11px',
              textDecoration: 'none',
              letterSpacing: '0.05em',
              opacity: 0.4,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.target.style.opacity = 1}
            onMouseLeave={e => e.target.style.opacity = 0.4}
          >
            🔐 Admin Access
          </a>
        </div>
      </div>
    </div>
  );
}

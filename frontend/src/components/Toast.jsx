import React from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 60
    }}>
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1rem',
              backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
              color: isSuccess ? '#065f46' : '#991b1b',
              border: `1px solid ${isSuccess ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
              fontSize: '0.85rem',
              fontWeight: '500',
              minWidth: '280px',
              maxWidth: '420px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {isSuccess ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}


import React from 'react';
import { Toaster } from 'react-hot-toast';

export const ToastProvider: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#262626',
          color: '#FFFFFF',
          border: '1px solid #2F2F2F',
          borderRadius: '16px',
          padding: '16px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#FFFFFF',
          },
        },
        loading: {
          iconTheme: {
            primary: '#9E7FFF',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  );
};

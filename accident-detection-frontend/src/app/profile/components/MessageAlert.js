import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

const MessageAlert = ({ message }) => {
  if (!message.content) return null;

  return (
    <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
      {message.type === 'success' ? (
        <CheckCircle size={20} />
      ) : (
        <AlertCircle size={20} />
      )}
      <span>{message.content}</span>
    </div>
  );
};

export default MessageAlert;

import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../contexts/AuthContext';

export default function StationLogin() {
  const { user } = useAuth();

  if (user?.role === 'station_manager') {
    return <Navigate to="/station" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-black text-blue-900 mb-2">Station Portal</h1>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Log in to your <strong>Warehouse</strong> or <strong>Pickup Station</strong> account. 
          Use your station code or email as the identifier, and the contact phone number as your secret.
        </p>

        <LoginForm initialMode="station" lockMode={true} />
      </div>
    </div>
  );
}

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
        <h1 className="text-2xl font-black text-gray-900 mb-1">Station Login</h1>
        <p className="text-sm text-gray-600 mb-5">
          Sign in using the same details configured when creating your warehouse or pickup station.
        </p>

        <LoginForm initialMode="station" />

        <div className="mt-5 text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            Back to regular user login
          </Link>
        </div>
      </div>
    </div>
  );
}

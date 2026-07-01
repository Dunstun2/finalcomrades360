import React from 'react';
import RoleToolbox from '@/shared/components/RoleToolbox';
import { useAuth } from '@/contexts/AuthContext';

const RoleTools = ({ role }) => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">Self-Service Tools</h1>
        <p className="text-sm text-gray-500">Access specialized utilities for your {role} account.</p>
      </div>
      
      <RoleToolbox role={role} user={user} />
    </div>
  );
};

export default RoleTools;

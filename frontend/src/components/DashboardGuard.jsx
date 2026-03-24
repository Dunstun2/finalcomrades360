import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * A wrapper component that ensures the user has verified their dashboard password
 * for the current session before accessing any role-based dashboard.
 */
const DashboardGuard = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    
    // Check if dashboard session is verified for this session
    const isDashboardVerified = sessionStorage.getItem('dashboard_verified') === 'true';

    // If user is not logged in at all, AuthGuard should have caught it, 
    // but we check just in case or if it's used standalone.
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If user doesn't have a dashboard password set, they should set it first
    // (We could also let them in and prompt to set it, but redirecting to set it is safer)
    if (!user.dashboardPassword) {
        // We'll redirect to profile or a dedicated "set dashboard password" page
        // For now, let's allow them to DashboardLogin which will handle the "not set" state
    }

    if (!isDashboardVerified) {
        // Redirect to specialized dashboard login, saving the original destination
        return <Navigate to="/dashboard-login" state={{ from: location }} replace />;
    }

    return children;
};

export default DashboardGuard;

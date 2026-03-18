import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './ui/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!user) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'customer'];

        // Check if user has one of the required roles in their roles array
        const hasRole = roles.some(role => userRoles.includes(role));

        if (!hasRole) {
            // User doesn't have the right role, redirect to a safe place
            return <Navigate to="/" replace />;
        }
    }

    // Verify that if any of the user's active roles (other than customer/admin)
    // require verification, they are indeed verified.
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || 'customer'];
    const isAdmin = userRoles.some(r => ['admin', 'superadmin', 'super_admin'].includes(r));
    const hasSpecialistRole = userRoles.some(r => r !== 'customer' && !['admin', 'superadmin', 'super_admin'].includes(r));

    if (hasSpecialistRole && !isAdmin && !user.isVerified) {
        console.warn(`[ProtectedRoute] Unverified specialist (${userRoles.join(', ')}) redirected to verification dashboard`);
        return <Navigate to="/customer/account-verification" replace />;
    }

    return children;
};

export default ProtectedRoute;

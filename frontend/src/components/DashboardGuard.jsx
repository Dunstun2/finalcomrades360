import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import MaintenanceOverlay from './MaintenanceOverlay';

/**
 * A wrapper component that ensures the user has verified their dashboard password
 * for the current session before accessing any role-based dashboard.
 */
const DashboardGuard = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    
    // Check if dashboard session is verified for this session
    const isDashboardVerified = sessionStorage.getItem('dashboard_verified') === 'true';

    // If user is not logged in at all, AuthGuard should have caught it
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isDashboardVerified) {
        return <Navigate to="/dashboard-login" state={{ from: location }} replace />;
    }

    // --- Granular Maintenance Check ---
    const [maintenance, setMaintenance] = React.useState(() => {
        try {
            return JSON.parse(localStorage.getItem('maintenance_settings') || '{}');
        } catch {
            return {};
        }
    });

    React.useEffect(() => {
        const handleUpdate = (e) => {
            const data = e.detail || (e.key === 'maintenance_settings' ? JSON.parse(e.newValue || '{}') : null);
            if (data) setMaintenance(data);
        };
        window.addEventListener('maintenance-settings-updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('maintenance-settings-updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    const isAdmin = (userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('superadmin'));

    let maintenanceActive = false;
    let maintenanceMessage = '';

    if (!isAdmin) {
        // Global Maintenance check
        if (maintenance.enabled) {
            maintenanceActive = true;
            maintenanceMessage = maintenance.message || 'System is currently under maintenance.';
        } else {
            // Section-specific check
            const path = location.pathname;
            let maintenanceBlock = null;

            if (path.startsWith('/seller')) maintenanceBlock = maintenance.dashboards?.seller;
            else if (path.startsWith('/marketing')) maintenanceBlock = maintenance.dashboards?.marketer;
            else if (path.startsWith('/delivery')) maintenanceBlock = maintenance.dashboards?.delivery;
            else if (path.startsWith('/ops')) maintenanceBlock = maintenance.dashboards?.ops;
            else if (path.startsWith('/station')) maintenanceBlock = maintenance.dashboards?.station;
            else if (path.startsWith('/finance') || path.includes('/finance/')) maintenanceBlock = maintenance.dashboards?.finance;
            else if (path.startsWith('/logistics')) maintenanceBlock = maintenance.dashboards?.logistics;
            else if (path.startsWith('/dashboard')) maintenanceBlock = maintenance.dashboards?.admin;

            if (maintenanceBlock?.enabled) {
                maintenanceActive = true;
                maintenanceMessage = maintenanceBlock.message || 'This dashboard is temporarily offline.';
            }
        }
    }

    return (
        <div className="relative min-h-full">
            <div className={maintenanceActive ? "blur-md pointer-events-none opacity-50 select-none transition-all duration-700" : "transition-all duration-700"}>
                {children}
            </div>
            
            <MaintenanceOverlay 
                isVisible={maintenanceActive} 
                message={maintenanceMessage} 
                isDashboard={true}
                returnPath="/"
            />
        </div>
    );
};

export default DashboardGuard;

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '@/shared/components/Modal';
import LoginForm from '@/modules/auth/components/LoginForm';
import RegisterForm from '@/modules/auth/components/RegisterForm';
import ForgotPasswordForm from '@/modules/auth/components/ForgotPasswordForm';

export default function AuthModal() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [modalType, setModalType] = useState(null); // 'login', 'register', 'forgot-password'

    useEffect(() => {
        const path = location.pathname;
        // If the user opened this URL directly in a fresh browser tab/window,
        // location.key is 'default' (React Router's initial value). In that case
        // we don't want to pop the login modal — just redirect to home silently.
        const isFreshLoad = location.key === 'default';

        if (path === '/login') {
            if (isFreshLoad) { navigate('/', { replace: true }); return; }
            setModalType('login');
            setIsOpen(true);
        } else if (path === '/register') {
            if (isFreshLoad) { navigate('/', { replace: true }); return; }
            setModalType('register');
            setIsOpen(true);
        } else if (path === '/forgot-password') {
            if (isFreshLoad) { navigate('/', { replace: true }); return; }
            setModalType('forgot-password');
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [location.pathname, location.key]);

    const handleClose = () => {
        setIsOpen(false);
        navigate('/');
    };

    const titles = {
        login: 'Login to Comrades360',
        register: 'Create Account',
        'forgot-password': 'Forgot Password'
    };

    const handleLoginSuccess = (loggedInUser, options = {}) => {
        const redirectTarget = location.state?.from?.pathname || '/';
        if (loggedInUser?.role === 'station_manager') {
            navigate('/station');
            return;
        }

        // If user was buying fast food, redirect to fast food page
        if (options.hasFastFood && redirectTarget === '/') {
            navigate('/fastfood');
            return;
        }

        navigate(redirectTarget);
    };

    const renderContent = () => {
        return (
            <div key={modalType}>
                {(() => {
                    switch (modalType) {
                        case 'login':
                            return <LoginForm isModal={true} onSuccess={handleLoginSuccess} />;
                        case 'register':
                            return <RegisterForm isModal={true} onSuccess={() => setModalType('login')} />;
                        case 'forgot-password':
                            return <ForgotPasswordForm isModal={true} />;
                        default:
                            return null;
                    }
                })()}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={titles[modalType]}
            maxWidth="max-w-md"
        >
            {renderContent()}
        </Modal>
    );
}

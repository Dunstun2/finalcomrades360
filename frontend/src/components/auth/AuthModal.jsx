import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function AuthModal() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [modalType, setModalType] = useState(null); // 'login', 'register', 'forgot-password'

    useEffect(() => {
        const path = location.pathname;

        if (path === '/login') {
            setModalType('login');
            setIsOpen(true);
        } else if (path === '/register') {
            setModalType('register');
            setIsOpen(true);
        } else if (path === '/forgot-password') {
            setModalType('forgot-password');
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [location.pathname]);

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

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar({ showAuth = true, showHistory = false, showBack = false }) {
    const navigate = useNavigate();
    const location = useLocation();
    const isLoggedIn = !!localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username') || '';
    const storedName = localStorage.getItem('name') || '';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('name');
        navigate('/');
    };

    // Get initials for avatar
    const getInitials = () => {
        if (storedName) return storedName.charAt(0).toUpperCase();
        if (storedUsername) return storedUsername.charAt(0).toUpperCase();
        return '?';
    };

    return (
        <nav className="navbar-glass">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                <div className="navbar-logo">
                    <span className="material-symbols-rounded text-white text-lg">frame_source</span>
                </div>
                <span className="text-white font-bold text-lg tracking-tight">Frame</span>
            </div>

            <div className="flex items-center gap-2">
                {showBack && (
                    <button onClick={() => navigate('/home')} className="nav-btn flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-sm">arrow_back</span>
                        Back
                    </button>
                )}

                {showHistory && isLoggedIn && location.pathname !== '/history' && (
                    <button onClick={() => navigate('/history')} className="nav-btn flex items-center gap-1.5">
                        <span className="material-symbols-rounded text-sm">schedule</span>
                        History
                    </button>
                )}

                {showAuth && !isLoggedIn && location.pathname !== '/auth' && (
                    <button onClick={() => navigate('/auth')} className="cta-glow flex items-center gap-1.5 text-sm">
                        <span className="material-symbols-rounded text-sm">login</span>
                        Sign In
                    </button>
                )}

                {isLoggedIn && (
                    <>
                        {/* Username display */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)', color: '#08090e' }}>
                                {getInitials()}
                            </div>
                            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                {storedUsername}
                            </span>
                        </div>

                        <button onClick={handleLogout} className="nav-btn-danger flex items-center gap-1.5">
                            <span className="material-symbols-rounded text-sm">logout</span>
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}

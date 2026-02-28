import React, { useState, useEffect, useCallback } from 'react';

const VARIANTS = {
    success: {
        icon: 'check_circle',
        gradient: 'linear-gradient(135deg, #059669, #10b981)',
        border: 'rgba(16, 185, 129, 0.3)'
    },
    error: {
        icon: 'error',
        gradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
        border: 'rgba(239, 68, 68, 0.3)'
    },
    info: {
        icon: 'info',
        gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
        border: 'rgba(59, 130, 246, 0.3)'
    },
    warning: {
        icon: 'warning',
        gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
        border: 'rgba(245, 158, 11, 0.3)'
    }
};

export default function Snackbar({ message, variant = 'info', isOpen, onClose, duration = 4000 }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsExiting(false);
            onClose && onClose();
        }, 300);
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsExiting(false);
            const timer = setTimeout(handleClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, handleClose]);

    if (!isVisible) return null;

    const style = VARIANTS[variant] || VARIANTS.info;

    return (
        <div className={`snackbar-container ${isExiting ? 'snackbar-exit' : 'snackbar-enter'}`}>
            <div className="snackbar-body" style={{ borderColor: style.border }}>
                <div className="snackbar-icon" style={{ background: style.gradient }}>
                    <span className="material-symbols-rounded text-white text-lg">{style.icon}</span>
                </div>
                <p className="snackbar-text">{message}</p>
                <button onClick={handleClose} className="snackbar-close">
                    <span className="material-symbols-rounded text-sm">close</span>
                </button>
            </div>
        </div>
    );
}

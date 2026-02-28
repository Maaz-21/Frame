import React, { useState, useRef, useEffect } from 'react';

const REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👏'];

export default function ReactionPicker({ onReact, isOpen, onClose }) {
    const pickerRef = useRef();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div ref={pickerRef} className="reaction-picker fade-in">
            {REACTIONS.map((emoji, i) => (
                <button
                    key={i}
                    className="reaction-btn"
                    onClick={() => {
                        onReact(emoji);
                        onClose();
                    }}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}

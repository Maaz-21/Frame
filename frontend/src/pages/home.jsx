import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Snackbar from '../components/Snackbar';
import server from '../environment';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return { text: 'Good night', emoji: '🌙' };
    if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    if (hour < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
}

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '', variant: 'info' });
    const [recentMeetings, setRecentMeetings] = useState([]);
    const { addToUserHistory, getHistoryOfUser } = useContext(AuthContext);
    const greeting = getGreeting();

    // Fetch recent meetings for quick-join chips
    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const history = await getHistoryOfUser();
                if (history && history.length > 0) {
                    // Get unique recent codes (last 3)
                    const seen = new Set();
                    const unique = history.filter(m => {
                        if (seen.has(m.meetingCode)) return false;
                        seen.add(m.meetingCode);
                        return true;
                    }).slice(0, 3);
                    setRecentMeetings(unique);
                }
            } catch {
                // silently fail
            }
        };
        fetchRecent();
    }, []);

    const handleJoinVideoCall = async () => {
        const code = meetingCode.trim();
        if (!code) {
            setSnack({ open: true, message: 'Please enter a meeting code', variant: 'warning' });
            return;
        }

        try {
            const { data } = await axios.get(`${server}/api/users/meeting-status/${encodeURIComponent(code)}`);

            if (!data?.active) {
                setSnack({ open: true, message: 'No active meeting found with this code', variant: 'warning' });
                return;
            }

            await addToUserHistory(code);
            navigate(`/${code}`);
        } catch {
            setSnack({ open: true, message: 'Failed to join meeting', variant: 'error' });
        }
    };

    // Issue #3: Generated meeting code display
    const [generatedCode, setGeneratedCode] = useState('');

    const handleNewMeeting = async () => {
        const code = Math.random().toString(36).substring(2, 8);
        setGeneratedCode(code);
        setMeetingCode(code);
        setSnack({ open: true, message: `Meeting code: ${code} — Copy and share!`, variant: 'success' });
    };

    const handleJoinGenerated = async () => {
        if (!generatedCode) return;
        try {
            await addToUserHistory(generatedCode);
            navigate(`/${generatedCode}`);
        } catch {
            setSnack({ open: true, message: 'Failed to create meeting', variant: 'error' });
        }
    };

    const copyGeneratedCode = () => {
        navigator.clipboard.writeText(generatedCode);
        setSnack({ open: true, message: `Meeting code copied: ${generatedCode}`, variant: 'success' });
    };

    const copyMeetingCode = () => {
        if (!meetingCode.trim()) {
            setSnack({ open: true, message: 'Enter a code first', variant: 'warning' });
            return;
        }
        navigator.clipboard.writeText(meetingCode);
        setSnack({ open: true, message: `Meeting code copied: ${meetingCode}`, variant: 'success' });
    };

    const handleQuickJoin = (code) => {
        navigate(`/${code}`);
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar showHistory={true} />

            <div className="home-root">
                <div className="dashboard-grid">
                    {/* Greeting Card */}
                    <div className="greeting-card slide-up">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)' }}>
                                <span className="text-lg">{greeting.emoji}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{greeting.text}</h2>
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Ready to connect?</p>
                            </div>
                        </div>

                        <p className="text-sm mt-4 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Start a new meeting or join an existing one. Your conversations are end-to-end encrypted.
                        </p>

                        {/* Quick-Join Chips */}
                        {recentMeetings.length > 0 && (
                            <div className="mt-5">
                                <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Recent meetings</p>
                                <div className="flex gap-2 flex-wrap">
                                    {recentMeetings.map((m, i) => (
                                        <button key={i} onClick={() => handleQuickJoin(m.meetingCode)} className="quick-chip">
                                            <span className="material-symbols-rounded text-xs">videocam</span>
                                            {m.meetingCode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-3 mt-6 flex-wrap">
                            <button onClick={handleNewMeeting} className="cta-glow flex items-center gap-2">
                                <span className="material-symbols-rounded text-lg">video_call</span>
                                New Meeting
                            </button>

                            <button onClick={() => navigate('/history')} className="cta-dark flex items-center gap-2">
                                <span className="material-symbols-rounded text-lg">schedule</span>
                                View History
                            </button>
                        </div>

                        {/* Generated meeting code card (Issue #3) */}
                        {generatedCode && (
                            <div className="mt-4 p-3 rounded-xl slide-up"
                                style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                                <p className="text-[10px] font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Your meeting code</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-mono font-bold tracking-widest" style={{ color: '#34d399' }}>
                                        {generatedCode}
                                    </span>
                                    <button onClick={copyGeneratedCode} className="btn-icon w-7 h-7" title="Copy code">
                                        <span className="material-symbols-rounded text-sm">content_copy</span>
                                    </button>
                                    <button onClick={handleJoinGenerated} className="cta-glow text-xs px-3 py-1.5 ml-auto flex items-center gap-1">
                                        <span className="material-symbols-rounded text-sm">login</span>
                                        Join Now
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Join Meeting Card */}
                    <div className="action-card slide-up slide-up-delay-1">
                        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-rounded text-lg" style={{ color: '#34d399' }}>group_add</span>
                            Join a Meeting
                        </h3>
                        <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>Enter a code to join</p>

                        <div className="space-y-3">
                            <input
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinVideoCall()}
                                placeholder="e.g. abc123"
                                className="input-field"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleJoinVideoCall} className="cta-glow flex-1 flex items-center justify-center gap-2 py-2.5">
                                    <span className="material-symbols-rounded text-lg">login</span>
                                    Join
                                </button>
                                <button onClick={copyMeetingCode} className="btn-icon" title="Copy meeting code">
                                    <span className="material-symbols-rounded text-lg">content_copy</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="action-card slide-up slide-up-delay-2 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-rounded text-lg" style={{ color: '#fbbf24' }}>tips_and_updates</span>
                            What's New
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { icon: 'add_reaction', title: 'Emoji Reactions', desc: 'React to moments during calls with 🎉👍❤️' },
                                { icon: 'spatial_audio', title: 'Speaking Indicator', desc: 'See who\'s talking with live audio detection' },
                                { icon: 'back_hand', title: 'Raise Hand', desc: 'Raise your hand to speak without interrupting' }
                            ].map((tip, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <span className="material-symbols-rounded text-sm mt-0.5"
                                        style={{ color: 'rgba(52,211,153,0.5)' }}>{tip.icon}</span>
                                    <div>
                                        <p className="text-xs font-medium text-white">{tip.title}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{tip.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Snackbar
                message={snack.message}
                variant={snack.variant}
                isOpen={snack.open}
                onClose={() => setSnack({ ...snack, open: false })}
            />
        </div>
    );
}

export default withAuth(HomeComponent);
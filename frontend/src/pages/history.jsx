import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Snackbar from '../components/Snackbar';
import withAuth from '../utils/withAuth';

function groupByDate(meetings) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    const groups = { 'Today': [], 'Yesterday': [], 'This Week': [], 'Earlier': [] };

    meetings.forEach(m => {
        const d = new Date(m.date);
        if (d >= today) groups['Today'].push(m);
        else if (d >= yesterday) groups['Yesterday'].push(m);
        else if (d >= weekAgo) groups['This Week'].push(m);
        else groups['Earlier'].push(m);
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '', variant: 'info' });
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history || []);
            } catch {
                console.error('Failed to fetch history');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Issue #2: Get meeting duration from localStorage (saved by VideoMeet on call end)
    const getMeetingDuration = (code) => {
        try {
            const data = localStorage.getItem(`frame_duration_${code}`);
            if (data) {
                const parsed = JSON.parse(data);
                return parsed.display || null;
            }
        } catch { /* ignore */ }
        return null;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const filteredMeetings = meetings.filter(m =>
        m.meetingCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = groupByDate(filteredMeetings);

    const handleRejoin = (code) => navigate(`/${code}`);

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setSnack({ open: true, message: `Meeting code copied: ${code}`, variant: 'success' });
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar showBack={true} showHistory={false} />

            <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 fade-in">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <span className="material-symbols-rounded text-2xl" style={{ color: '#34d399' }}>history</span>
                            Meeting History
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'} recorded
                        </p>
                    </div>

                    {meetings.length > 0 && (
                        <div className="relative">
                            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>search</span>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search meetings..."
                                className="input-field pl-10 w-64"
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
                    </div>
                ) : filteredMeetings.length > 0 ? (
                    <div>
                        {grouped.map(([label, items]) => (
                            <div key={label}>
                                {/* Date separator */}
                                <div className="date-separator">
                                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                                </div>

                                <div className="history-grid mb-6">
                                    {items.map((meeting, i) => (
                                        <div key={`${meeting.meetingCode}-${i}`} className="history-card slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'rgba(52,211,153,0.08)' }}>
                                                    <span className="material-symbols-rounded text-lg" style={{ color: '#34d399' }}>videocam</span>
                                                </div>
                                                <span className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
                                                    {formatDate(meeting.date)}
                                                </span>
                                            </div>

                                            <p className="text-sm font-medium text-white font-mono tracking-wide">
                                                {meeting.meetingCode}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                    {formatTime(meeting.date)}
                                                </p>
                                                {getMeetingDuration(meeting.meetingCode) && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                                        style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                                                        <span className="material-symbols-rounded" style={{ fontSize: '10px' }}>timer</span>
                                                        {getMeetingDuration(meeting.meetingCode)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex gap-2 mt-4">
                                                <button onClick={() => handleRejoin(meeting.meetingCode)} className="cta-dark text-xs flex items-center gap-1 flex-1 justify-center py-2">
                                                    <span className="material-symbols-rounded text-sm">login</span>
                                                    Rejoin
                                                </button>
                                                <button onClick={() => handleCopyCode(meeting.meetingCode)} className="btn-icon w-8 h-8" title="Copy code">
                                                    <span className="material-symbols-rounded text-sm">content_copy</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state fade-in">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="material-symbols-rounded text-4xl" style={{ color: 'rgba(255,255,255,0.1)' }}>
                                {searchQuery ? 'search_off' : 'calendar_today'}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-white/40">
                            {searchQuery ? 'No meetings match your search' : 'No meetings yet'}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {searchQuery ? 'Try a different search term' : 'Start a meeting to see it here'}
                        </p>
                        {!searchQuery && (
                            <button onClick={() => navigate('/home')} className="cta-glow mt-6 flex items-center gap-2">
                                <span className="material-symbols-rounded text-lg">video_call</span>
                                Start a Meeting
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Snackbar message={snack.message} variant={snack.variant} isOpen={snack.open}
                onClose={() => setSnack({ ...snack, open: false })} />
        </div>
    );
}

export default withAuth(History);
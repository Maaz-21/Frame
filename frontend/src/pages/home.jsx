import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    const { addToUserHistory } = useContext(AuthContext);
    const handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    }

    return (
        <div>
            <header className="flex items-center justify-between p-4">
                <h2 className="text-2xl font-semibold text-white">Frame</h2>

                <div className="flex items-center gap-3">
                    <button className="nav-btn text-white" onClick={() => navigate('/history')}>History</button>
                    <button className="cta-dark" onClick={() => { localStorage.removeItem('token'); navigate('/auth'); }}>Logout</button>
                </div>
            </header>

            <main className="home-root">
                <section className="left-panel">
                    <h3 className="text-2xl font-bold text-white">Providing Quality Video Calls</h3>
                    <div className="w-full mt-4 flex gap-3 items-center">
                        <input
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                            placeholder="Enter Meeting Code"
                            className="w-full p-3 rounded bg-black/30 border border-white/10 text-white"
                        />
                        <button className="cta-dark" onClick={handleJoinVideoCall}>Join</button>
                    </div>
                </section>

                <aside className="right-panel">
                    <img src="/logo3.png" alt="Video Call" className="responsive-image" />
                </aside>
            </main>
        </div>
    );
}

export default withAuth(HomeComponent);
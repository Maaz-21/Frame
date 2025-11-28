
import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';

export default function History() {


    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([])


    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                console.log("Fetched history:", history); 
                setMeetings(history);
            } catch {
                // IMPLEMENT SNACKBAR
                console.error("Failed to fetch history");
            }
        }
        fetchHistory();
    }, [])

    let formatDate = (dateString) => {

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();

        return `${day}/${month}/${year}`

    }

    return (
        <div className="p-6 min-h-screen">
            <div className="flex items-center align-middle mb-6 gap-4">
                <button className="nav-btn text-white" onClick={() => routeTo('/home')}>Back</button>
                <h2 className="text-2xl font-semibold text-slate-400">Meeting History</h2>
            </div>

            {meetings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {meetings.map((e, i) => (
                        <div key={`${e.meetingCode}-${i}`} className="p-4 rounded-lg border border-white/10 bg-black/40">
                            <div className="text-sm text-white/80"><strong>Code:</strong> {e.meetingCode}</div>
                            <div className="text-xs text-white/60 mt-2"><strong>Date:</strong> {formatDate(e.date)}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-white/60">No meeting history found.</div>
            )}
        </div>
    );
}
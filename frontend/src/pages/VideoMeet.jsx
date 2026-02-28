import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from "socket.io-client";
import axios from 'axios';
import server from '../config/server';
import ReactionPicker from '../components/ReactionPicker';
import Snackbar from '../components/Snackbar';
import { playJoinSound, playLeaveSound, playMessageSound, playReactionSound, playHandRaiseSound } from '../utils/sounds';

const server_url = server;
var connections = {};
const defaultIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

let activePeerConfig = {
    iceServers: defaultIceServers
};

// Extract meeting code from URL path
const getMeetingCode = () => {
    const path = window.location.pathname;
    return path.replace(/^\/+|\/+$/g, '');
};

// SessionStorage key for this meeting
const getSessionKey = () => `frame_meeting_${getMeetingCode()}`;

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState([]);
    const [audio, setAudio] = useState();
    const [screen, setScreen] = useState();
    const [showChat, setShowChat] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [videos, setVideos] = useState([]);
    const [participantCount, setParticipantCount] = useState(1);

    // Phase 2 & 3 state
    const [meetingTimer, setMeetingTimer] = useState(0);
    const [typingUsers, setTypingUsers] = useState(new Map());
    const [reactions, setReactions] = useState([]);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [raisedHands, setRaisedHands] = useState(new Map());
    const [speakingUsers, setSpeakingUsers] = useState(new Set());
    const [pushToTalkActive, setPushToTalkActive] = useState(false);
    const [chatWidth, setChatWidth] = useState(340);
    const [peerNames, setPeerNames] = useState({}); // socketId -> username
    const [peerMediaStates, setPeerMediaStates] = useState({}); // socketId -> { audio, video }
    const [snack, setSnack] = useState({ open: false, message: '', variant: 'info' });

    const videoRef = useRef([]);
    const chatBottomRef = useRef();
    const containerRef = useRef();
    const isDraggingRef = useRef(false);
    const permissionsChecked = useRef(false);
    const timerRef = useRef();
    const meetingStartRef = useRef();
    const typingTimeoutRef = useRef();
    const audioAnalyserRef = useRef();
    const reactionIdCounter = useRef(0);
    const pushToTalkPrevState = useRef(null);

    const fetchIceServers = useCallback(async () => {
        try {
            const response = await axios.get(`${server_url}/api/users/ice-servers`);
            const iceServers = response?.data?.iceServers;
            if (Array.isArray(iceServers) && iceServers.length > 0) {
                return iceServers;
            }
        } catch (error) {
            console.log('Falling back to STUN ICE servers:', error.message);
        }
        return defaultIceServers;
    }, []);

    // ------ Refresh Persistence (Issue #1) ------
    useEffect(() => {
        const sessionData = sessionStorage.getItem(getSessionKey());
        if (sessionData) {
            try {
                const { username: savedName } = JSON.parse(sessionData);
                if (savedName) {
                    setUsername(savedName);
                    setAskForUsername(false);
                    // Will trigger getMedia via useEffect below
                }
            } catch (e) { /* ignore */ }
        }
    }, []);

    // Auto-connect when askForUsername becomes false (handles both manual join and refresh)
    const hasMounted = useRef(false);
    useEffect(() => {
        if (!askForUsername && username) {
            if (!hasMounted.current) {
                hasMounted.current = true;
                getMedia();
            }
        }
    }, [askForUsername, username]);

    // ------ Permissions ------
    useEffect(() => {
        if (!permissionsChecked.current) {
            permissionsChecked.current = true;
            getPermissions();
        }
    }, []);

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                videoPermission.getTracks().forEach(t => t.stop());
            }
        } catch { setVideoAvailable(false); }

        try {
            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                audioPermission.getTracks().forEach(t => t.stop());
            }
        } catch { setAudioAvailable(false); }

        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

        try {
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (userMediaStream) {
                window.localStream = userMediaStream;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = userMediaStream;
                }
            }
        } catch (error) {
            console.log('Media access error:', error.message);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio]);

    // ------ Meeting Timer ------
    useEffect(() => {
        if (!askForUsername) {
            timerRef.current = setInterval(() => {
                setMeetingTimer(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [askForUsername]);

    const formatTimer = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Format duration for localStorage storage
    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    // ------ Speaking Indicator (Audio Analysis) ------
    const setupAudioAnalyser = useCallback(() => {
        if (!window.localStream) return;
        if (!window.localStream.getAudioTracks || window.localStream.getAudioTracks().length === 0) {
            return;
        }
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(window.localStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);
            audioAnalyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkAudio = () => {
                if (!audioAnalyserRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

                setSpeakingUsers(prev => {
                    const next = new Set(prev);
                    if (average > 15) {
                        next.add(socketIdRef.current);
                    } else {
                        next.delete(socketIdRef.current);
                    }
                    return next;
                });

                requestAnimationFrame(checkAudio);
            };
            checkAudio();
        } catch (e) {
            console.log('Audio analyser setup failed:', e);
        }
    }, []);

    // ------ Push-to-Talk (Spacebar) ------
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && !e.repeat && askForUsername === false) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                setPushToTalkActive(true);
                pushToTalkPrevState.current = audio;
                setAudio(true);
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space' && askForUsername === false) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                e.preventDefault();
                setPushToTalkActive(false);
                if (pushToTalkPrevState.current === false) {
                    setAudio(false);
                }
                pushToTalkPrevState.current = null;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [askForUsername, audio]);

    // ------ Typing Indicator ------
    const handleTyping = () => {
        if (socketRef.current) {
            socketRef.current.emit('typing', username);
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                socketRef.current.emit('stop-typing');
            }, 2000);
        }
    };

    // ------ Reactions ------
    const sendReaction = (emoji) => {
        if (socketRef.current) {
            socketRef.current.emit('reaction', emoji, username);
            playReactionSound();
        }
    };

    // ------ Raise Hand ------
    const toggleRaiseHand = () => {
        if (socketRef.current) {
            if (handRaised) {
                socketRef.current.emit('lower-hand');
                setHandRaised(false);
            } else {
                socketRef.current.emit('raise-hand', username);
                setHandRaised(true);
                playHandRaiseSound();
            }
        }
    };

    // ------ Copy Meeting Code (Issue #3) ------
    const copyMeetingCode = () => {
        const code = getMeetingCode();
        navigator.clipboard.writeText(code)
            .then(() => setSnack({ open: true, message: `Meeting code copied: ${code}`, variant: 'success' }))
            .catch(() => setSnack({ open: true, message: 'Failed to copy code', variant: 'error' }));
    };

    // ------ Media Handlers ------
    const getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    // Issue #6: Use replaceTrack instead of addStream to prevent flickering
    const replaceStream = (stream) => {
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            const senders = connections[id].getSenders();
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            const audioSender = senders.find(s => s.track && s.track.kind === 'audio');

            if (videoSender && videoTrack) {
                videoSender.replaceTrack(videoTrack);
            } else if (videoTrack) {
                // Fallback: add track if no existing sender
                try { connections[id].addTrack(videoTrack, stream); } catch (e) { }
            }

            if (audioSender && audioTrack) {
                audioSender.replaceTrack(audioTrack);
            } else if (audioTrack) {
                try { connections[id].addTrack(audioTrack, stream); } catch (e) { }
            }
        }
    };

    const upsertRemoteStream = (socketListId, stream) => {
        setVideos((videos) => {
            const existingIndex = videos.findIndex((video) => video.socketId === socketListId);

            let updatedVideos;
            if (existingIndex !== -1) {
                updatedVideos = videos.map((video) =>
                    video.socketId === socketListId ? { ...video, stream } : video
                );
            } else {
                updatedVideos = [...videos, { socketId: socketListId, stream, autoplay: true, playsinline: true }];
            }

            videoRef.current = updatedVideos;
            return updatedVideos;
        });
    };

    const ensurePeerConnection = (socketListId) => {
        if (connections[socketListId]) return connections[socketListId];

        const peerConnection = new RTCPeerConnection(activePeerConfig);

        peerConnection.onicecandidate = function (event) {
            if (event.candidate != null && socketRef.current) {
                socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
            }
        };

        peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                upsertRemoteStream(socketListId, event.streams[0]);
            }
        };

        if (window.localStream !== undefined && window.localStream !== null) {
            window.localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, window.localStream);
            });
        } else {
            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            window.localStream.getTracks().forEach((track) => {
                peerConnection.addTrack(track, window.localStream);
            });
        }

        connections[socketListId] = peerConnection;
        return peerConnection;
    };

    const getUserMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        setupAudioAnalyser();

        // Use replaceTrack to avoid renegotiation and flickering
        replaceStream(stream);

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);
            try { let tracks = localVideoref.current.srcObject.getTracks(); tracks.forEach(t => t.stop()); } catch (e) { }
            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
            replaceStream(window.localStream);
        });
    };

    const getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try { let tracks = localVideoref.current.srcObject.getTracks(); tracks.forEach(track => track.stop()); } catch (e) { }
        }
    };

    const getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
                    .then(getDislayMediaSuccess)
                    .catch((e) => console.log(e));
            }
        }
    };

    // Issue #6: Screen share uses replaceTrack for seamless switching
    const getDislayMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        replaceStream(stream);

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);
            try { let tracks = localVideoref.current.srcObject.getTracks(); tracks.forEach(t => t.stop()); } catch (e) { }
            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
            getUserMedia();
        });
    };

    const gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);
        if (fromId !== socketIdRef.current) {
            const fromPeer = ensurePeerConnection(fromId);
            if (signal.sdp) {
                fromPeer.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        fromPeer.createAnswer().then((description) => {
                            fromPeer.setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': fromPeer.localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }
            if (signal.ice) {
                fromPeer.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    };

    // ------ Socket Connection ------
    const connectToSocketServer = async () => {
        const resolvedIceServers = await fetchIceServers();
        activePeerConfig = {
            iceServers: resolvedIceServers
        };

        connections = {};
        socketRef.current = io(server_url, {
            transports: ['websocket', 'polling'],
            withCredentials: true
        });
        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            const meetingCode = getMeetingCode();
            socketRef.current.emit('join-call', meetingCode, username);
            socketIdRef.current = socketRef.current.id;
            socketRef.current.emit('media-state', {
                audio: typeof audio === 'boolean' ? audio : true,
                video: typeof video === 'boolean' ? video : true
            });

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
                setParticipantCount(prev => Math.max(1, prev - 1));
                setRaisedHands(prev => { const n = new Map(prev); n.delete(id); return n; });
                setSpeakingUsers(prev => { const n = new Set(prev); n.delete(id); return n; });
                setPeerNames(prev => { const n = { ...prev }; delete n[id]; return n; });
                setPeerMediaStates(prev => { const n = { ...prev }; delete n[id]; return n; });
                if (connections[id]) {
                    try { connections[id].close(); } catch (e) { }
                    delete connections[id];
                }
                playLeaveSound();
            });

            socketRef.current.on('media-state', (peerSocketId, state) => {
                setPeerMediaStates(prev => ({
                    ...prev,
                    [peerSocketId]: {
                        audio: typeof state?.audio === 'boolean' ? state.audio : true,
                        video: typeof state?.video === 'boolean' ? state.video : true
                    }
                }));
            });

            // Typing indicator events
            socketRef.current.on('typing', (typingUsername, typingSocketId) => {
                setTypingUsers(prev => {
                    const n = new Map(prev);
                    n.set(typingSocketId, typingUsername);
                    return n;
                });
            });

            socketRef.current.on('stop-typing', (typingSocketId) => {
                setTypingUsers(prev => {
                    const n = new Map(prev);
                    n.delete(typingSocketId);
                    return n;
                });
            });

            // Reaction events (Issue #7: reactions now visible with username)
            socketRef.current.on('reaction', (emoji, reactUsername, reactSocketId) => {
                const id = ++reactionIdCounter.current;
                const x = 20 + Math.random() * 60; // random x position %
                setReactions(prev => [...prev, { id, emoji, username: reactUsername, x }]);
                if (reactSocketId !== socketIdRef.current) playReactionSound();
                setTimeout(() => {
                    setReactions(prev => prev.filter(r => r.id !== id));
                }, 3000);
            });

            // Raise hand events
            socketRef.current.on('raise-hand', (handUsername, handSocketId) => {
                setRaisedHands(prev => {
                    const n = new Map(prev);
                    n.set(handSocketId, handUsername);
                    return n;
                });
                if (handSocketId !== socketIdRef.current) playHandRaiseSound();
            });

            socketRef.current.on('lower-hand', (handSocketId) => {
                setRaisedHands(prev => {
                    const n = new Map(prev);
                    n.delete(handSocketId);
                    return n;
                });
            });

            // Meeting start time
            socketRef.current.on('meeting-start-time', (startTime) => {
                meetingStartRef.current = startTime;
                const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
                setMeetingTimer(elapsedSec);
            });

            // Issue #4: user-joined now carries roomNames
            socketRef.current.on('user-joined', (id, clients, roomNames, roomMediaStates) => {
                setParticipantCount(clients.length);
                if (id !== socketIdRef.current) playJoinSound();

                // Store peer usernames
                if (roomNames) {
                    setPeerNames(prev => ({ ...prev, ...roomNames }));
                }

                if (roomMediaStates) {
                    setPeerMediaStates(prev => ({ ...prev, ...roomMediaStates }));
                }

                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;
                    ensurePeerConnection(socketListId);
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        const peerConnection = ensurePeerConnection(id2);
                        peerConnection.createOffer().then((description) => {
                            peerConnection.setLocalDescription(description)
                                .then(() => { socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': peerConnection.localDescription })); })
                                .catch(e => console.log(e));
                        });
                    }
                }
            });
        });
    };

    const silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    const black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    const handleVideo = () => setVideo(!video);
    const handleAudio = () => {
        if (pushToTalkActive) return;
        setAudio(!audio);
    };

    useEffect(() => {
        if (!socketRef.current || askForUsername || !socketIdRef.current) return;
        socketRef.current.emit('media-state', {
            audio: typeof audio === 'boolean' ? audio : true,
            video: typeof video === 'boolean' ? video : true
        });
    }, [audio, video, askForUsername]);

    useEffect(() => {
        if (screen !== undefined) getDislayMedia();
    }, [screen]);

    const handleScreen = () => setScreen(!screen);

    // Issue #1: Clear session + Issue #2: Save duration on end
    const handleEndCall = () => {
        // Save meeting duration to localStorage for history page
        const code = getMeetingCode();
        if (code && meetingTimer > 0) {
            localStorage.setItem(`frame_duration_${code}`, JSON.stringify({
                seconds: meetingTimer,
                display: formatDuration(meetingTimer),
                endedAt: Date.now()
            }));
        }

        // Clear session so refresh doesn't re-join
        sessionStorage.removeItem(getSessionKey());

        try { let tracks = localVideoref.current.srcObject.getTracks(); tracks.forEach(track => track.stop()); } catch (e) { }
        if (audioAnalyserRef.current) audioAnalyserRef.current = null;
        if (socketRef.current) socketRef.current.disconnect();
        window.location.href = "/home";
    };

    const addMessage = useCallback((data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender, data, timestamp: Date.now(), isOwn: socketIdSender === socketIdRef.current }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prev) => prev + 1);
            playMessageSound();
        }
    }, []);

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        socketRef.current.emit('stop-typing');
        setMessage("");
    };

    const connect = () => {
        if (!username.trim()) return;
        // Issue #1: Save to sessionStorage for refresh persistence
        sessionStorage.setItem(getSessionKey(), JSON.stringify({ username }));
        setAskForUsername(false);
        hasMounted.current = true;
        getMedia();
    };

    // Auto-scroll chat
    useEffect(() => {
        if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Clear new messages when chat is opened
    useEffect(() => {
        if (showChat) setNewMessages(0);
    }, [showChat, messages]);

    // Resizer drag handlers
    const startDrag = (e) => {
        e.preventDefault();
        isDraggingRef.current = true;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    };
    const onDrag = (e) => {
        if (!isDraggingRef.current) return;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setChatWidth(Math.min(Math.max(e.clientX - rect.left, 200), 600));
    };
    const stopDrag = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    };
    useEffect(() => () => stopDrag(), []);

    const formatMsgTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Adaptive grid class
    const getGridClass = () => {
        const total = videos.length;
        if (total === 0) return '';
        if (total === 1) return 'conferenceView--solo';
        if (total <= 2) return 'conferenceView--duo';
        if (total <= 4) return 'conferenceView--quad';
        return '';
    };

    // Typing text
    const typingText = (() => {
        const names = Array.from(typingUsers.values());
        if (names.length === 0) return null;
        if (names.length === 1) return `${names[0]} is typing`;
        return `${names.join(', ')} are typing`;
    })();

    // --- LOBBY SCREEN ---
    if (askForUsername) {
        return (
            <div className="meetVideoContainer">
                <div className="lobby-container">
                    <div className="lobby-card fade-in">
                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)', boxShadow: '0 0 30px rgba(52,211,153,0.3)' }}>
                                <span className="material-symbols-rounded text-white text-2xl">videocam</span>
                            </div>
                            <h2 className="text-xl font-semibold text-white">Join Meeting</h2>
                            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                Preview your camera and enter your name
                            </p>
                        </div>

                        <div className="relative mb-6">
                            <video ref={localVideoref} autoPlay muted className="lobby-video" />
                            <div className="absolute bottom-3 left-3 flex gap-2">
                                <button onClick={() => setVideoAvailable(!videoAvailable)}
                                    className={videoAvailable ? 'btn-icon-active w-8 h-8' : 'btn-icon w-8 h-8'}>
                                    <span className="material-symbols-rounded text-sm">{videoAvailable ? 'videocam' : 'videocam_off'}</span>
                                </button>
                                <button onClick={() => setAudioAvailable(!audioAvailable)}
                                    className={audioAvailable ? 'btn-icon-active w-8 h-8' : 'btn-icon w-8 h-8'}>
                                    <span className="material-symbols-rounded text-sm">{audioAvailable ? 'mic' : 'mic_off'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Meeting code display + copy (Issue #3) */}
                        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="material-symbols-rounded text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>tag</span>
                            <span className="text-[10px] mr-1" style={{ color: 'rgba(255,255,255,0.3)' }}>Meeting Code:</span>
                            <span className="text-sm font-mono font-bold flex-1 tracking-widest" style={{ color: '#34d399' }}>
                                {getMeetingCode()}
                            </span>
                            <button onClick={copyMeetingCode}
                                className="text-xs px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
                                style={{ color: '#34d399' }}>
                                Copy
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="relative">
                                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-lg" style={{ color: 'rgba(255,255,255,0.15)' }}>person</span>
                                <input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && connect()}
                                    placeholder="Your display name"
                                    className="input-field pl-10"
                                />
                            </div>

                            <button
                                onClick={connect}
                                disabled={!username.trim()}
                                className="cta-glow w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-rounded text-lg">login</span>
                                Join Now
                            </button>

                            <p className="text-center text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                Hold <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-0.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Space</kbd> for push-to-talk
                            </p>
                        </div>
                    </div>
                </div>

                <Snackbar message={snack.message} variant={snack.variant} isOpen={snack.open}
                    onClose={() => setSnack({ ...snack, open: false })} />
            </div>
        );
    }

    // --- MEETING ROOM ---
    return (
        <div className="meetVideoContainer" ref={containerRef}>
            {/* Floating Reactions (Issue #7: higher z-index, inside videoPane, with username) */}
            <div className="reactions-overlay">
                {reactions.map(r => (
                    <div key={r.id} className="reaction-float" style={{ left: `${r.x}%` }}>
                        <span className="reaction-float-emoji">{r.emoji}</span>
                        <span className="reaction-float-name">{r.username}</span>
                    </div>
                ))}
            </div>

            <div className="flex h-screen">
                {/* Chat Panel */}
                {showChat && (
                    <div className="chatRoom" style={{ width: chatWidth, minWidth: 280 }}>
                        <div className="chatContainer">
                            <div className="chat-header">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <span className="material-symbols-rounded text-lg" style={{ color: '#34d399' }}>chat</span>
                                    Chat
                                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
                                        {messages.length}
                                    </span>
                                </h3>
                                <button onClick={() => setShowChat(false)} className="btn-icon w-7 h-7">
                                    <span className="material-symbols-rounded text-sm">close</span>
                                </button>
                            </div>

                            <div className="chattingDisplay">
                                {messages.length > 0 ? (
                                    messages.map((item, index) => (
                                        <div key={index} className={item.isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                                            <p className="text-[10px] font-medium mb-1" style={{ color: item.isOwn ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
                                                {item.isOwn ? 'You' : item.sender}
                                            </p>
                                            <div className={item.isOwn ? 'msg-bubble-own' : 'msg-bubble'}>
                                                <p className="text-white/90">{item.data}</p>
                                            </div>
                                            <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                                {item.timestamp ? formatMsgTime(item.timestamp) : ''}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <span className="material-symbols-rounded text-3xl mb-2" style={{ color: 'rgba(255,255,255,0.08)' }}>forum</span>
                                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No messages yet</p>
                                    </div>
                                )}
                                <div ref={chatBottomRef} />
                            </div>

                            {/* Typing Indicator */}
                            {typingText && (
                                <div className="typing-indicator">
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                    <div className="typing-dot" />
                                    <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{typingText}</span>
                                </div>
                            )}

                            <div className="chattingArea">
                                <input
                                    value={message}
                                    onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type a message..."
                                    className="input-field flex-1"
                                />
                                <button onClick={sendMessage} disabled={!message.trim()} className="btn-icon-active w-10 h-10 disabled:opacity-30">
                                    <span className="material-symbols-rounded text-lg">send</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resizer */}
                {showChat && (
                    <div className={`resizer ${isDraggingRef.current ? 'dragging' : ''}`} onMouseDown={startDrag} />
                )}

                {/* Video Area */}
                <div className="videoPane flex-1 relative">
                    {/* Remote Videos */}
                    <div className={`conferenceView ${getGridClass()}`}>
                        {videos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <span className="material-symbols-rounded text-3xl" style={{ color: 'rgba(255,255,255,0.1)' }}>group</span>
                                </div>
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Waiting for others to join...</p>
                                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.12)' }}>Share the meeting link to invite participants</p>
                            </div>
                        ) : (
                            videos.map((vid) => (
                                <div key={vid.socketId} className={`video-tile ${speakingUsers.has(vid.socketId) ? 'speaking-ring' : ''}`}>
                                    <video
                                        data-socket={vid.socketId}
                                        ref={ref => { if (ref && vid.stream) ref.srcObject = vid.stream; }}
                                        autoPlay
                                    />
                                    {/* Issue #4: Display actual username instead of "Participant" */}
                                    <span className="video-tile-name">
                                        {raisedHands.has(vid.socketId) && <span className="mr-1">✋</span>}
                                        {peerNames[vid.socketId] || 'Guest'}
                                    </span>
                                    {peerMediaStates[vid.socketId]?.audio === false && (
                                        <div className="raised-hand-badge" style={{ right: 8, left: 'auto', background: 'rgba(239,68,68,0.9)' }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>mic_off</span>
                                        </div>
                                    )}
                                    {peerMediaStates[vid.socketId]?.video === false && (
                                        <div className="raised-hand-badge" style={{ right: 40, left: 'auto', background: 'rgba(245,158,11,0.9)' }}>
                                            <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>videocam_off</span>
                                        </div>
                                    )}
                                    {raisedHands.has(vid.socketId) && (
                                        <div className="raised-hand-badge">✋</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Issue #5: Self Video (PiP) — fixed positioning */}
                    <div className="self-video-pip">
                        <video className={`meetUserVideo ${speakingUsers.has(socketIdRef.current) ? 'speaking-ring' : ''}`} ref={localVideoref} autoPlay muted />
                        <span className="video-tile-name">
                            {handRaised && <span className="mr-1">✋</span>}
                            You
                        </span>
                        {!audio && (
                            <div className="raised-hand-badge" style={{ right: 8, left: 'auto', background: 'rgba(239,68,68,0.9)' }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>mic_off</span>
                            </div>
                        )}
                        {!video && (
                            <div className="raised-hand-badge" style={{ right: 40, left: 'auto', background: 'rgba(245,158,11,0.9)' }}>
                                <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>videocam_off</span>
                            </div>
                        )}
                        {handRaised && (
                            <div className="raised-hand-badge">✋</div>
                        )}
                    </div>

                    {/* Floating Toolbar */}
                    <div className="floating-toolbar">
                        {/* Meeting Timer */}
                        <div className="meeting-timer">
                            {formatTimer(meetingTimer)}
                        </div>

                        <div className="toolbar-divider" />

                        <button title={video ? 'Turn off camera' : 'Turn on camera'} onClick={handleVideo}
                            className={video ? 'btn-icon-active' : 'btn-icon'}>
                            <span className="material-symbols-rounded">{video ? 'videocam' : 'videocam_off'}</span>
                        </button>

                        <button title={audio ? 'Mute' : 'Unmute'} onClick={handleAudio}
                            className={`${audio ? 'btn-icon-active' : 'btn-icon'} ${pushToTalkActive ? 'ring-2 ring-emerald-400/50' : ''}`}>
                            <span className="material-symbols-rounded">{audio ? 'mic' : 'mic_off'}</span>
                            {pushToTalkActive && (
                                <span className="absolute -top-1 -right-1 text-[8px] px-1 py-0.5 rounded font-bold"
                                    style={{ background: '#34d399', color: '#08090e' }}>PTT</span>
                            )}
                        </button>

                        {screenAvailable && (
                            <button title={screen ? 'Stop sharing' : 'Share screen'} onClick={handleScreen}
                                className={screen ? 'btn-icon-active' : 'btn-icon'}>
                                <span className="material-symbols-rounded">{screen ? 'stop_screen_share' : 'screen_share'}</span>
                            </button>
                        )}

                        {/* Reaction button */}
                        <div className="relative">
                            <button title="Reactions" onClick={() => setShowReactionPicker(!showReactionPicker)}
                                className={showReactionPicker ? 'btn-icon-active' : 'btn-icon'}>
                                <span className="material-symbols-rounded">add_reaction</span>
                            </button>
                            <ReactionPicker
                                isOpen={showReactionPicker}
                                onReact={sendReaction}
                                onClose={() => setShowReactionPicker(false)}
                            />
                        </div>

                        {/* Raise Hand */}
                        <button title={handRaised ? 'Lower hand' : 'Raise hand'} onClick={toggleRaiseHand}
                            className={handRaised ? 'btn-icon-gold' : 'btn-icon'}>
                            <span className="material-symbols-rounded">back_hand</span>
                            {raisedHands.size > 0 && (
                                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: '#fbbf24', color: '#1a1a2e' }}>
                                    {raisedHands.size}
                                </span>
                            )}
                        </button>

                        {/* Participants */}
                        <div className="btn-icon cursor-default" title={`${participantCount} participant${participantCount > 1 ? 's' : ''}`}>
                            <span className="material-symbols-rounded text-lg">group</span>
                            <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ background: 'linear-gradient(135deg, #34d399, #14b8a6)', color: 'white' }}>
                                {participantCount}
                            </span>
                        </div>

                        {/* Issue #3: Copy meeting code in toolbar */}
                        <button title="Copy meeting code" onClick={copyMeetingCode} className="btn-icon">
                            <span className="material-symbols-rounded">content_copy</span>
                        </button>

                        {/* Chat toggle */}
                        <div className="relative">
                            <button title="Toggle chat" onClick={() => setShowChat(!showChat)}
                                className={showChat ? 'btn-icon-active' : 'btn-icon'}>
                                <span className="material-symbols-rounded">chat</span>
                            </button>
                            {newMessages > 0 && !showChat && (
                                <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ background: '#f43f5e', color: 'white' }}>
                                    {newMessages}
                                </span>
                            )}
                        </div>

                        <div className="toolbar-divider" />

                        {/* End call */}
                        <button title="Leave meeting" onClick={handleEndCall} className="btn-icon-danger">
                            <span className="material-symbols-rounded">call_end</span>
                        </button>
                    </div>
                </div>
            </div>

            <Snackbar message={snack.message} variant={snack.variant} isOpen={snack.open}
                onClose={() => setSnack({ ...snack, open: false })} />
        </div>
    );
}
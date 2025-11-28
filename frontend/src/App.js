import './App.css';
import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import LandingPage from './pages/landing';
import Home from './pages/home';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import History from './pages/history';

function App() {
  return (
    <>
    <div className="app-bg">
        <div className="bg-vignette" />
        <div className="bg-fog" />
        <div className="bg-spot-1" />
        <div className="bg-spot-2" />
        <div className="bg-noise" />
      </div>
      <Router>
         <AuthProvider>
          <Routes>
            <Route path='/' element = {<LandingPage />} />
            <Route path='/home' element = {<Home />} />
            <Route path='/history' element={<History />} />
            <Route path='/auth' element = {<Authentication />} />
            <Route path='/:url' element = {<VideoMeetComponent />} />
          </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;

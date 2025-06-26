import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, TextField, Typography, AppBar, Toolbar, Box } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {


    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");


    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode)
        navigate(`/${meetingCode}`)
    }

return (
    <>
      <AppBar position="static" sx={{ bgcolor: '#111' }} elevation={2}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: '#fff' }}>Frame</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<RestoreIcon />}
              onClick={() => navigate('/history')}
              variant="outlined"
              sx={{ borderColor: '#fff', color: '#fff' }}
            >
              History
            </Button>
            <Button
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/auth');
              }}
              variant="contained"
              sx={{ bgcolor: '#1976d2' }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className="home-root" sx={{ backgroundColor: '#000' }}>
        <Box className="left-panel">
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Providing Quality Video Calls 
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
            <TextField
              onChange={(e) => setMeetingCode(e.target.value)}
              label="Enter Meeting Code"
              variant="outlined"
              size="medium"
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#888' },
                  '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                },
              }}
            />
            <Button
              onClick={handleJoinVideoCall}
              variant="contained"
              size="large"
              sx={{ minWidth: 120 , bgcolor: '#1976d2'}}
            >
              Join
            </Button>
          </Box>
        </Box>

        <Box className="right-panel">
          <img src="/logo3.png" alt="Video Call" className="responsive-image" />
        </Box>
      </Box>
    </>
  );
}

export default withAuth(HomeComponent);
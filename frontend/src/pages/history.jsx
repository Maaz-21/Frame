import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import Grid from '@mui/material/Grid';

import { IconButton } from '@mui/material';
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
    <Box sx={{ minHeight: '100vh', p: 4 }}>
      <Box display="flex" alignItems="center" mb={4}>
        <IconButton
          onClick={() => routeTo("/home")}
          sx={{  mr: 2 }}
        >
          <HomeIcon />
        </IconButton>
        <Typography variant="h5">Meeting History</Typography>
      </Box>

      {meetings.length > 0 ? (
        <Grid container spacing={2}>
          {meetings.map((e, i) => (
            <Grid item xs={12} sm={6} md={4} key={`${e.meetingCode}-${i}`}>
              <Card
                variant="outlined"
                sx={{
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  borderColor: '#333',
                  '&:hover': {
                    borderColor: '#1976d2',
                  },
                }}
              >
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Code:</strong> {e.meetingCode}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong> {formatDate(e.date)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography>No meeting history found.</Typography>
      )}
    </Box>
  );
}
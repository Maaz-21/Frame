import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import {createServer} from 'node:http';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectToSocket } from './controllers/socketManager.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const server =createServer(app);
const io =connectToSocket(server);

app.set('port', (process.env.PORT || 8000));
app.use(cors());
app.use(express.json({limit: '40kb'}));
app.use(express.urlencoded({limit: '40kb', extended: true}));

app.use('/api/users', userRoutes);

const start = async()=>{
    // Connect to MongoDB
    try{
        const connectDb =await mongoose.connect(process.env.MONGO_URL);
        console.log('Connected to MongoDB:','Host: ', connectDb.connection.host, 'Name: ',connectDb.connection.name);
    }catch(err){
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }

    server.listen(app.get('port'), () => {
        console.log('Server is running on port 8000');
    });
}

start().catch((err) => {
    console.error('Error starting the server:', err);
}
);
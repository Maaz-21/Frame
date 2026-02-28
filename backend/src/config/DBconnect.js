import mongoose from 'mongoose';

export const connectToMongoDB = async () => {
    try{
        const connectDb = await mongoose.connect(process.env.MONGO_URL)
        console.log('Connected to MongoDB:','Host: ', connectDb.connection.host, 'Name: ',connectDb.connection.name);
    }
    catch(e){
        console.error('Error connecting to MongoDB:', e);
        process.exit(1);
    }
}
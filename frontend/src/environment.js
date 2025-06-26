let Is_prod= process.env.NODE_ENV === 'production';
const server = Is_prod ? 'https://frame.onrender.com' : 'http://localhost:8000';

export default server;
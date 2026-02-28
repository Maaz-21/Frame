const isProd = process.env.NODE_ENV === 'production';

const devServer = process.env.REACT_APP_DEV_SERVER_URL || 'http://localhost:8000';
const prodServer = process.env.REACT_APP_PROD_SERVER_URL || 'https://frame-1ftf.onrender.com';

const server = isProd ? prodServer : devServer;

export default server;
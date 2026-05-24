import { io as ioClient } from 'socket.io-client';

export const createSocketClient = (baseUrl, options = {}) =>
    ioClient(baseUrl, {
        transports: ['websocket'],
        reconnection: false,
        ...options
    });

export const waitForEvent = (socket, event, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timed out waiting for ${event}`));
        }, timeoutMs);

        const handler = (...args) => {
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(args);
        };

        socket.on(event, handler);
    });

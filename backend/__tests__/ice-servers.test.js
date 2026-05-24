import request from 'supertest';
import httpStatus from 'http-status';
import { app } from '../src/app.js';

const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

describe('ICE servers API', () => {
    if (hasTwilio) {
        it('fetches ICE servers from Twilio', async () => {
            const response = await request(app).get('/api/users/ice-servers');
            expect(response.status).toBe(httpStatus.OK);
            expect(Array.isArray(response.body.iceServers)).toBe(true);
        });
    } else {
        it('returns an error when Twilio credentials are missing', async () => {
            const response = await request(app).get('/api/users/ice-servers');
            expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        });
    }
});

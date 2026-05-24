import request from 'supertest';

export const registerTestUser = async (app, { name, username, password }) => {
    const response = await request(app)
        .post('/api/users/register')
        .send({ name, username, password });
    return response;
};

export const loginTestUser = async (app, { username, password }) => {
    const response = await request(app)
        .post('/api/users/login')
        .send({ username, password });
    return response;
};

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

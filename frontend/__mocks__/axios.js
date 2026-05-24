const axios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => axios)
};

module.exports = axios;
module.exports.default = axios;

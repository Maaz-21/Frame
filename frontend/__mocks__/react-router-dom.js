const React = require('react');

const mockNavigate = jest.fn();
let locationState = { pathname: '/' };

const MemoryRouter = ({ children }) => React.createElement(React.Fragment, null, children);
const BrowserRouter = ({ children }) => React.createElement(React.Fragment, null, children);
const Routes = ({ children }) => React.createElement(React.Fragment, null, children);
const Route = ({ element }) => element || null;

const useNavigate = () => mockNavigate;
const useLocation = () => locationState;

const __setLocation = (next) => {
    locationState = { ...locationState, ...(next || {}) };
};

module.exports = {
    MemoryRouter,
    BrowserRouter,
    Routes,
    Route,
    useNavigate,
    useLocation,
    __mockedNavigate: mockNavigate,
    __setLocation
};

module.exports.default = module.exports;

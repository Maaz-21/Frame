// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('axios');

if (!window.matchMedia) {
	window.matchMedia = () => ({
		matches: false,
		media: '',
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false
	});
}

Object.defineProperty(navigator, 'clipboard', {
	value: {
		writeText: jest.fn().mockResolvedValue(undefined)
	},
	configurable: true
});

const createMockTrack = (kind) => ({
	kind,
	enabled: true,
	stop: jest.fn()
});

const createMockStream = () => {
	const audioTrack = createMockTrack('audio');
	const videoTrack = createMockTrack('video');
	return {
		getTracks: () => [audioTrack, videoTrack],
		getAudioTracks: () => [audioTrack],
		getVideoTracks: () => [videoTrack]
	};
};

Object.defineProperty(navigator, 'mediaDevices', {
	value: {
		getUserMedia: jest.fn(() => Promise.resolve(createMockStream())),
		getDisplayMedia: jest.fn(() => Promise.resolve(createMockStream()))
	},
	configurable: true
});

HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
	fillRect: jest.fn()
}));

HTMLCanvasElement.prototype.captureStream = jest.fn(() => ({
	getVideoTracks: () => [createMockTrack('video')]
}));

class MockAudioContext {
	constructor() {
		this.state = 'running';
		this.currentTime = 0;
		this.destination = {};
	}

	resume() {
		return Promise.resolve();
	}

	createOscillator() {
		return {
			type: 'sine',
			frequency: { setValueAtTime: jest.fn() },
			connect: jest.fn(),
			start: jest.fn(),
			stop: jest.fn()
		};
	}

	createGain() {
		return {
			gain: {
				setValueAtTime: jest.fn(),
				exponentialRampToValueAtTime: jest.fn()
			},
			connect: jest.fn()
		};
	}

	createMediaStreamSource() {
		return { connect: jest.fn() };
	}

	createAnalyser() {
		return {
			fftSize: 0,
			smoothingTimeConstant: 0,
			frequencyBinCount: 1,
			getByteFrequencyData: jest.fn()
		};
	}
}

window.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;

const mockAES = {
    utils: {
        utf8: {
            toBytes: jest.fn((str) => new Uint8Array([...str].map((c) => c.charCodeAt(0)))),
            fromBytes: jest.fn((bytes) => String.fromCharCode(...bytes)),
        },
        hex: {
            toBytes: jest.fn((hex) => new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))),
            fromBytes: jest.fn((bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')),
        },
    },
    ModeOfOperation: {
        cbc: jest.fn().mockImplementation(() => ({
            encrypt: jest.fn((data) => data),
            decrypt: jest.fn((data) => data),
        })),
    },
};

export default mockAES;

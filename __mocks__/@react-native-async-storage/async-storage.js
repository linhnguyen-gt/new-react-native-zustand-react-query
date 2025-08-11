const mockStorage = new Map();

const AsyncStorage = {
    setItem: jest.fn().mockImplementation((key, value) => {
        mockStorage.set(key, value);
        return Promise.resolve();
    }),
    getItem: jest.fn().mockImplementation((key) => {
        return Promise.resolve(mockStorage.get(key) || null);
    }),
    removeItem: jest.fn().mockImplementation((key) => {
        mockStorage.delete(key);
        return Promise.resolve();
    }),
    clear: jest.fn().mockImplementation(() => {
        mockStorage.clear();
        return Promise.resolve();
    }),
};

export default AsyncStorage;

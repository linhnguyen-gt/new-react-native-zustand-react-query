const mockSecureStore = {
    setItemAsync: jest.fn().mockRejectedValue(new Error('SecureStore not available')),
    getItemAsync: jest.fn().mockRejectedValue(new Error('SecureStore not available')),
    deleteItemAsync: jest.fn().mockRejectedValue(new Error('SecureStore not available')),
};

export default mockSecureStore;

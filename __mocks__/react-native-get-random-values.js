// Mock crypto.getRandomValues
if (typeof global !== 'undefined' && !global.crypto) {
    global.crypto = {
        getRandomValues: jest.fn((array) => {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }),
    };
}

export default {};

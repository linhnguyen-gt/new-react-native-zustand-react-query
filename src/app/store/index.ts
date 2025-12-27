import { useCounterStore } from './counterStore';
import { resetAllStores } from './storeFactory';

const store = {
    useCounterStore,
    resetAllStores,
};

export default store;

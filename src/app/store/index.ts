import { useCounterStore } from './counterStore';
import { useResponseStore } from './responseStore';
import { resetAllStores } from './storeFactory';

const store = {
    useCounterStore,
    useResponseStore,
    resetAllStores,
};

export default store;

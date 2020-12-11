type RefreshFunction = (value: any) => any;

interface CacheEntry {
    value: any;
    refreshFunction?: RefreshFunction;
    ttl: number;
}

interface CacheEntryMeta extends CacheEntry {
    _expirationTime: number;
}

interface CacheRegistry {
    [key:string]: CacheEntryMeta;
}


/**
 * @author Gonzalo Perez Vizuete
 * @version 1.0
 * 
 * Singleton class for cache management in the server
 */
class Cache {
    public static LOOP_MILLIS: number = 10000;

    private static memory: CacheRegistry = {};
    private static cacheLoop: (NodeJS.Timeout | null) = null;

    /**
     * Initializes the cache storage.
     * Repeated calls to this method will take absolutey NO effect.
     * 
     * @param callBack - is called when cache is initialized the FIRST time.
     */
    public static async initCache(callBack: CallableFunction): Promise<void> {
        if (Cache.cacheLoop == null) {
            Cache.cacheLoop = setInterval(Cache.looper, Cache.LOOP_MILLIS);
            callBack();
        }
    }

    private static async looper(): Promise<void> {
        for (const key in Cache.memory) {
            const timestamp: number = Date.now(); //actual time
            const reg: CacheEntryMeta = Cache.memory[key]; //reference

            if (timestamp - reg._expirationTime > reg.ttl) {
                if (reg.refreshFunction != undefined) {
                    reg.value = reg.refreshFunction(reg.value); //update value
                    reg._expirationTime = timestamp + reg.ttl; //update ttl
                } else {
                    delete Cache.memory[key];
                }
            }
        }
    }

    /**
     * Gets the value from the cache linked to the key
     * @param key - the value assigned to this key or undefined
     */
    public static get(key: string): any {
        return Cache.exists(key) ? Cache.memory[key].value : undefined;
    }

    /**
     * Sets or updates a registry in the cache memory.
     * If none refresh function is passed, then tis registry will be deleted once the ttl
     * expires.
     * The refreshFunction must return a value, this value will be setted as new value
     * of this cache registry
     * 
     * Please do not use 'undefined' as value
     * 
     * @param key - key of the registry
     * @param value - value
     * @param refreshFunction - Function to be called every time the registry expyres
     * @param ttl - life time of this registry in seconds
     */
    public static async set(key: string, value: any,
        refreshFunction?: RefreshFunction, ttl: number = 300): Promise<void> {
        Cache.memory[key] = {
            value,
            refreshFunction,
            ttl: ttl * 1000,
            _expirationTime: Date.now() + ttl
        };
    }

    /**
     * Check if a value associated to the key exists in the cache.
     * If the value of the key is undefined it will return false as well
     * @param key - key to check if exists
     */
    public static exists(key: string): boolean {
        return Cache.memory[key] !== undefined;
    }
}

export { Cache }

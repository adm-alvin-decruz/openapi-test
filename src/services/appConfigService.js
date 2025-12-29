const configsModel = require('../db/models/configsModel');
const loggerService = require('../logs/logger');
const appConfig = require('../config/appConfig');

/**
 * App Config Service
 * 
 * Service to manage app-config from database with in-memory caching.
 * Loads all app-config values from database on initialization and caches them in memory.
 * Provides methods to get config values and refresh cache.
 */
class AppConfigService {
  constructor() {
    // In-memory cache for app-config values
    this.cache = new Map();
    // Flag to track if cache has been initialized
    this.initialized = false;
    // Flag to track if initialization is in progress (prevent concurrent loads)
    this.initializing = false;
    // Track last env var value for cache invalidation
    this.lastEnvVarValue = process.env.RELOAD_APP_ID_CACHE || null;
  }

  /**
   * Initialize cache by loading all app-config from database
   * Should be called once on application startup
   * 
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      loggerService.info(
        { appConfigService: { message: 'Cache already initialized' } },
        {},
        '[CIAM-MAIN] AppConfigService.initialize - Already initialized'
      );
      return;
    }

    if (this.initializing) {
      loggerService.info(
        { appConfigService: { message: 'Initialization already in progress' } },
        {},
        '[CIAM-MAIN] AppConfigService.initialize - Waiting for initialization'
      );
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;

    try {
      loggerService.info(
        { appConfigService: { message: 'Loading app-config from database' } },
        {},
        '[CIAM-MAIN] AppConfigService.initialize - Starting'
      );

      // Load all configs with config='app-config'
      const result = await configsModel.findByConfig('app-config');
      
      // pool.query returns [rows, fields]
      const configs = Array.isArray(result) && result.length > 0 ? result[0] : result;

      if (!configs || (Array.isArray(configs) && configs.length === 0)) {
        loggerService.warn(
          { appConfigService: { message: 'No app-config found in database, using file config as fallback' } },
          {},
          '[CIAM-MAIN] AppConfigService.initialize - No DB configs found'
        );
        // Fallback to file config
        this.loadFromFileConfig();
        this.initialized = true;
        this.initializing = false;
        return;
      }

      // Build cache map: key -> value
      // configs is an array of row objects
      const configsArray = Array.isArray(configs) ? configs : [configs];
      for (const config of configsArray) {
        if (config && config.key && config.value !== null) {
          this.cache.set(config.key, config.value);
        }
      }

      loggerService.info(
        {
          appConfigService: {
            message: 'Cache initialized successfully',
            keysCount: this.cache.size,
          },
        },
        {},
        '[CIAM-MAIN] AppConfigService.initialize - Completed'
      );

      this.initialized = true;
    } catch (error) {
      loggerService.error(
        {
          appConfigService: {
            error: error,
            message: 'Failed to initialize cache, using file config as fallback',
          },
        },
        {},
        '[CIAM-MAIN] AppConfigService.initialize - Failed'
      );
      // Fallback to file config on error
      this.loadFromFileConfig();
      this.initialized = true;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Load config from file as fallback
   * @private
   */
  loadFromFileConfig() {
    loggerService.info(
      { appConfigService: { message: 'Loading from file config' } },
      {},
      '[CIAM-MAIN] AppConfigService.loadFromFileConfig'
    );

    // Convert file config to cache format
    Object.keys(appConfig).forEach((key) => {
      let value = appConfig[key];
      
      // Parse JSON strings to actual JSON
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{')) && key !== 'LOG_APP_PREFIX') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          loggerService.warn(
            { appConfigService: { key, message: 'Failed to parse JSON, keeping as string', error: e } },
            {},
            'AppConfigService.loadFromFileConfig - Failed to parse JSON'
          );
        }
      }
      
      this.cache.set(key, value);
    });
  }

  /**
   * Get config value by key
   * 
   * @param {string} key - Config key (e.g., 'APP_ID_DEV')
   * @returns {*} Config value or undefined if not found
   */
  get(key) {
    if (!this.initialized) {
      loggerService.warn(
        { appConfigService: { key, message: 'Cache not initialized, returning undefined' } },
        {},
        'AppConfigService.get - Cache not initialized'
      );
      // Fallback to file config if cache not initialized
      return appConfig[key];
    }

    const value = this.cache.get(key);
    
    if (value === undefined) {
      loggerService.warn(
        { appConfigService: { key, message: 'Key not found in cache, falling back to file config' } },
        {},
        'AppConfigService.get - Key not found'
      );
      // Fallback to file config
      return appConfig[key];
    }

    return value;
  }

  /**
   * Get all cached configs
   * 
   * @returns {Map} Cache map
   */
  getAll() {
    return this.cache;
  }

  /**
   * Check if cache is initialized
   * 
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Refresh cache by reloading from database
   * 
   * @returns {Promise<void>}
   */
  async refresh() {
    loggerService.info(
      { appConfigService: { message: 'Refreshing cache' } },
      {},
      'AppConfigService.refresh - Starting'
    );

    try {
      // Clear existing cache
      this.cache.clear();
      this.initialized = false;

      // Reload from database
      await this.initialize();

      loggerService.info(
        { appConfigService: { message: 'Cache refreshed successfully' } },
        {},
        'AppConfigService.refresh - Completed'
      );
    } catch (error) {
      loggerService.error(
        {
          appConfigService: {
            error: error,
            message: 'Failed to refresh cache',
          },
        },
        {},
        'AppConfigService.refresh - Failed'
      );
      throw error;
    }
  }

  /**
   * Get config value with fallback to file config
   * This method is safe to use even if cache is not initialized
   * 
   * @param {string} key - Config key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Config value or defaultValue
   */
  getWithFallback(key, defaultValue = undefined) {
    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Try file config
    if (appConfig[key] !== undefined) {
      return appConfig[key];
    }

    return defaultValue;
  }

  /**
   * Clear cache (without reloading)
   * Useful for testing or manual cache invalidation
   * 
   * @returns {void}
   */
  clear() {
    loggerService.info(
      { appConfigService: { message: 'Clearing cache' } },
      {},
      'AppConfigService.clear'
    );
    this.cache.clear();
    this.initialized = false;
    this.lastEnvVarValue = null;
  }

  /**
   * Check if environment variable trigger has changed
   * If RELOAD_APP_ID_CACHE env var changes, cache should be refreshed
   * 
   * @returns {boolean} True if env var changed and cache should be refreshed
   */
  shouldRefreshFromEnvVar() {
    const currentEnvVar = process.env.RELOAD_APP_ID_CACHE || null;
    
    if (currentEnvVar !== this.lastEnvVarValue) {
      loggerService.info(
        {
          appConfigService: {
            message: 'Environment variable changed, cache refresh needed',
            oldValue: this.lastEnvVarValue,
            newValue: currentEnvVar,
          },
        },
        {},
        'AppConfigService.shouldRefreshFromEnvVar'
      );
      this.lastEnvVarValue = currentEnvVar;
      return true;
    }
    
    return false;
  }

  /**
   * Get cache statistics for monitoring
   * 
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      initialized: this.initialized,
      keysCount: this.cache.size,
      lastEnvVarValue: this.lastEnvVarValue,
      currentEnvVar: process.env.RELOAD_APP_ID_CACHE || null,
    };
  }
}

// Export singleton instance
module.exports = new AppConfigService();



class Config {
    constructor(config) {
      this._config = initConfig(config);
      this._scopeCache = new Map();
      this._resolverCache = new Map();
    }
    get type() {
      return this._config.type;
    }
    set type(type) {
      this._config.type = type;
    }
    get data() {
      return this._config.data;
    }
    set data(data) {
      this._config.data = data;
    }
    get options() {
      return this._config.options;
    }
    set options(options) {
      this._config.options = options;
    }
    get plugins() {
      return this._config.plugins;
    }
    update() {
      const config = this._config;
      this.clearCache();
      initOptions(config);
    }
    clearCache() {
      this._scopeCache.clear();
      this._resolverCache.clear();
    }
    datasetScopeKeys(datasetType) {
      return cachedKeys(datasetType,
        () => [[
          `datasets.${datasetType}`,
          ''
        ]]);
    }
    datasetAnimationScopeKeys(datasetType, transition) {
      return cachedKeys(`${datasetType}.transition.${transition}`,
        () => [
          [
            `datasets.${datasetType}.transitions.${transition}`,
            `transitions.${transition}`,
          ],
          [
            `datasets.${datasetType}`,
            ''
          ]
        ]);
    }
    datasetElementScopeKeys(datasetType, elementType) {
      return cachedKeys(`${datasetType}-${elementType}`,
        () => [[
          `datasets.${datasetType}.elements.${elementType}`,
          `datasets.${datasetType}`,
          `elements.${elementType}`,
          ''
        ]]);
    }
    pluginScopeKeys(plugin) {
      const id = plugin.id;
      const type = this.type;
      return cachedKeys(`${type}-plugin-${id}`,
        () => [[
          `plugins.${id}`,
          ...plugin.additionalOptionScopes || [],
        ]]);
    }
    _cachedScopes(mainScope, resetCache) {
      const _scopeCache = this._scopeCache;
      let cache = _scopeCache.get(mainScope);
      if (!cache || resetCache) {
        cache = new Map();
        _scopeCache.set(mainScope, cache);
      }
      return cache;
    }
    getOptionScopes(mainScope, keyLists, resetCache) {
      const {options, type} = this;
      const cache = this._cachedScopes(mainScope, resetCache);
      const cached = cache.get(keyLists);
      if (cached) {
        return cached;
      }
      const scopes = new Set();
      keyLists.forEach(keys => {
        if (mainScope) {
          scopes.add(mainScope);
          keys.forEach(key => addIfFound(scopes, mainScope, key));
        }
        keys.forEach(key => addIfFound(scopes, options, key));
        keys.forEach(key => addIfFound(scopes, overrides[type] || {}, key));
        keys.forEach(key => addIfFound(scopes, defaults, key));
        keys.forEach(key => addIfFound(scopes, descriptors, key));
      });
      const array = [...scopes];
      if (keysCached.has(keyLists)) {
        cache.set(keyLists, array);
      }
      return array;
    }
    chartOptionScopes() {
      const {options, type} = this;
      return [
        options,
        overrides[type] || {},
        defaults.datasets[type] || {},
        {type},
        defaults,
        descriptors
      ];
    }
    resolveNamedOptions(scopes, names, context, prefixes = ['']) {
      const result = {$shared: true};
      const {resolver, subPrefixes} = getResolver(this._resolverCache, scopes, prefixes);
      let options = resolver;
      if (needContext(resolver, names)) {
        result.$shared = false;
        context = isFunction(context) ? context() : context;
        const subResolver = this.createResolver(scopes, context, subPrefixes);
        options = _attachContext(resolver, context, subResolver);
      }
      for (const prop of names) {
        result[prop] = options[prop];
      }
      return result;
    }
    createResolver(scopes, context, prefixes = [''], descriptorDefaults) {
      const {resolver} = getResolver(this._resolverCache, scopes, prefixes);
      return isObject(context)
        ? _attachContext(resolver, context, undefined, descriptorDefaults)
        : resolver;
    }
  }

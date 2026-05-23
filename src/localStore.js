/**
 * localStore.js
 * A namespaced localStorage wrapper with SSR safety and error handling.
 */

const isClient = () => typeof window !== 'undefined';

/**
 * LocalStore
 * Wraps localStorage with a namespace prefix to avoid key collisions.
 * All methods are SSR-safe and will fail gracefully in non-browser environments.
 */
class LocalStore {
  /**
   * @param {string} namespace - Prefix applied to all storage keys (e.g. 'myApp:clock')
   */
  constructor(namespace = 'filebrige') {
    this.namespace = namespace;
  }

  /**
   * Builds the full namespaced key.
   * @param {string} key
   * @returns {string}
   */
  _buildKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Reads and parses a value from localStorage.
   * @param {string} key
   * @param {any} fallback - Returned if key doesn't exist or data is corrupted
   * @returns {any}
   */
  get(key, fallback = null) {
    if (!isClient()) return fallback;

    try {
      const raw = window.localStorage.getItem(this._buildKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw) ?? fallback;
    } catch (err) {
      console.error(`FileBridge LocalStore: failed to read key "${key}"`, err);
      return fallback;
    }
  }

  /**
   * Serializes and writes a value to localStorage.
   * @param {string} key
   * @param {any} value - Must be JSON serializable
   * @returns {boolean} true on success, false if unavailable or write fails
   */
  set(key, value) {
    if (!isClient()) return false;

    try {
      window.localStorage.setItem(this._buildKey(key), JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`FileBridge LocalStore: failed to write key "${key}"`, err);
      return false;
    }
  }

  /**
   * Removes a value from localStorage.
   * @param {string} key
   * @returns {boolean} true on success, false if unavailable
   */
  remove(key) {
    if (!isClient()) return false;

    try {
      window.localStorage.removeItem(this._buildKey(key));
      return true;
    } catch (err) {
      console.error(`FileBridge LocalStore: failed to remove key "${key}"`, err);
      return false;
    }
  }

  /**
   * Returns all keys in localStorage that belong to this namespace.
   * @returns {string[]} List of keys (without the namespace prefix)
   */
  keys() {
    if (!isClient()) return [];

    try {
      const prefix = `${this.namespace}:`;
      return Object.keys(window.localStorage)
        .filter(k => k.startsWith(prefix))
        .map(k => k.slice(prefix.length));
    } catch (err) {
      console.error('FileBridge LocalStore: failed to list keys', err);
      return [];
    }
  }

  /**
   * Removes all keys in localStorage that belong to this namespace.
   * @returns {boolean} true on success, false if unavailable
   */
  clear() {
    if (!isClient()) return false;

    try {
      this.keys().forEach(key => this.remove(key));
      return true;
    } catch (err) {
      console.error('FileBridge LocalStore: failed to clear namespace', err);
      return false;
    }
  }
}

export default LocalStore;

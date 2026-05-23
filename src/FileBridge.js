/**
 * FileBridge.js
 * Core class that bridges browser localStorage and portable data files.
 */

import LocalStore from './localStore.js';
import {
  buildHeader,
  parseHeader,
  validateHeader,
  migrateData
} from './headerParser.js';

const isClient = () => typeof window !== 'undefined';

/**
 * FileBridge
 *
 * @example
 * const bridge = new FileBridge({
 *   header: {
 *     fields: ['appId', 'system', 'version'],
 *     delimiter: '|',
 *     validate: ({ appId, system }) => appId === 'MYAPP' && system === 'CLOCK'
 *   },
 *   storage: { namespace: 'myApp:clock' }
 * });
 */
class FileBridge {
  /**
   * @param {Object} options
   * @param {Object} options.header - Header configuration
   * @param {string[]} options.header.fields - Ordered list of field names
   * @param {string} [options.header.delimiter='|'] - Character separating header fields
   * @param {Function} options.header.validate - Receives parsed header fields, returns boolean
   * @param {Function} [options.header.migrate] - Receives (fields, data), returns migrated data
   * @param {Object} [options.storage] - localStorage configuration
   * @param {string} [options.storage.namespace='filebridge'] - Prefix for all localStorage keys
   */
  constructor(options = {}) {
    this._validateOptions(options);

    this._fields = options.header.fields;
    this._delimiter = options.header.delimiter ?? '|';
    this._validateFn = options.header.validate;
    this._migrateFn = options.header.migrate;

    this.storage = new LocalStore(options.storage?.namespace ?? 'filebridge');
  }

  /**
   * Validates the options object passed to the constructor.
   * @param {Object} options
   */
  _validateOptions(options) {
    if (!options.header) {
      throw new Error('FileBridge: options.header is required');
    }
    if (!Array.isArray(options.header.fields) || options.header.fields.length === 0) {
      throw new Error('FileBridge: options.header.fields must be a non-empty array');
    }
    if (typeof options.header.validate !== 'function') {
      throw new Error('FileBridge: options.header.validate must be a function');
    }
  }

  /**
   * Exports data to a downloadable file.
   * Triggers a file download in the browser.
   *
   * @param {Object} options
   * @param {any} options.data - Data to export. Must be JSON serializable
   * @param {string} options.filename - Name of the downloaded file
   * @param {Object} options.headerValues - Values for each field defined in header.fields
   * @returns {boolean} true on success, false in SSR or non-browser environment
   */
  exportFile({ data, filename, headerValues }) {
    if (!isClient()) return false;

    try {
      const headerLine = buildHeader(this._fields, headerValues, this._delimiter);
      const dataLine = JSON.stringify(data);
      const fileContent = `${headerLine}\n${dataLine}`;

      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('FileBridge: exportFile failed', err);
      return false;
    }
  }

  /**
   * Opens the browser file picker and imports a FileBridge file.
   * Validates the header before parsing data.
   * Runs migration if a migrate function was provided.
   *
   * @param {Object} options
   * @param {Function} options.onSuccess - Called with (data, headerFields) on success
   * @param {Function} options.onError - Called with an error object on failure
   *   Error object shape: { code: string, message: string }
   *   Error codes: INVALID_FORMAT | INVALID_HEADER | INVALID_DATA | READ_ERROR | SSR_ERROR
   */
  importFile({ onSuccess, onError }) {
    if (!isClient()) {
      onError({ code: 'SSR_ERROR', message: 'FileBridge: importFile cannot run in a server environment' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dat,.txt';

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const contents = event.target.result;
          const lines = contents.split('\n');

          // Must have at least a header line and a data line
          if (lines.length < 2) {
            onError({
              code: 'INVALID_FORMAT',
              message: 'File does not have the expected structure (missing header or data)'
            });
            return;
          }

          // Parse the header
          const parsedFields = parseHeader(lines[0], this._fields, this._delimiter);
          if (!parsedFields) {
            onError({
              code: 'INVALID_FORMAT',
              message: `Header could not be parsed. Expected ${this._fields.length} fields separated by "${this._delimiter}"`
            });
            return;
          }

          // Validate the header
          const { valid, error } = validateHeader(parsedFields, this._validateFn);
          if (!valid) {
            onError({ code: 'INVALID_HEADER', message: error });
            return;
          }

          // Parse the data
          let data;
          try {
            data = JSON.parse(lines[1]);
          } catch {
            onError({
              code: 'INVALID_DATA',
              message: 'Data section of file could not be parsed as JSON'
            });
            return;
          }

          // Run migration if provided
          try {
            data = migrateData(parsedFields, data, this._migrateFn);
          } catch (err) {
            onError({ code: 'INVALID_DATA', message: err.message });
            return;
          }

          onSuccess(data, parsedFields);
        } catch (err) {
          onError({ code: 'READ_ERROR', message: `Unexpected error reading file: ${err.message}` });
        }
      };

      reader.onerror = () => {
        onError({ code: 'READ_ERROR', message: 'Browser could not read the file' });
      };

      reader.readAsText(file);

      // Clean up the input element
      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  }
}

export default FileBridge;

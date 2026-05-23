/**
 * headerParser.js
 * Handles building, parsing, and validating FileBridge file headers.
 */

/**
 * Builds a header string from the provided field values.
 * @param {string[]} fields - Ordered list of field names defined in config
 * @param {Object} headerValues - Key-value pairs matching the field names
 * @param {string} delimiter - Character used to separate fields
 * @returns {string} The assembled header string
 */
export const buildHeader = (fields, headerValues, delimiter) => {
  const missing = fields.filter(f => headerValues[f] === undefined);
  if (missing.length > 0) {
    throw new Error(`FileBridge: missing header fields: ${missing.join(', ')}`);
  }
  return fields.map(f => String(headerValues[f])).join(delimiter);
};

/**
 * Parses a header string into a key-value object.
 * @param {string} headerLine - The raw first line of a FileBridge file
 * @param {string[]} fields - Ordered list of field names defined in config
 * @param {string} delimiter - Character used to separate fields
 * @returns {Object|null} Parsed header as key-value object, or null if parsing fails
 */
export const parseHeader = (headerLine, fields, delimiter) => {
  if (!headerLine || typeof headerLine !== 'string') return null;

  const parts = headerLine.split(delimiter);

  if (parts.length !== fields.length) return null;

  const parsed = {};
  fields.forEach((field, i) => {
    parsed[field] = parts[i];
  });

  return parsed;
};

/**
 * Validates parsed header fields against the developer-provided validate function.
 * @param {Object} parsedFields - Key-value object from parseHeader
 * @param {Function} validateFn - Developer-provided validation function
 * @returns {{ valid: boolean, error: string|null }}
 */
export const validateHeader = (parsedFields, validateFn) => {
  if (!parsedFields) {
    return { valid: false, error: 'Header could not be parsed' };
  }

  try {
    const result = validateFn(parsedFields);
    if (result === true) {
      return { valid: true, error: null };
    }
    return { valid: false, error: 'Header did not pass validation' };
  } catch (err) {
    return { valid: false, error: `Header validation threw an error: ${err.message}` };
  }
};

/**
 * Runs the developer-provided migrate function on the data if defined.
 * @param {Object} parsedFields - Parsed header fields
 * @param {any} data - Parsed data from the file
 * @param {Function|undefined} migrateFn - Optional developer-provided migration function
 * @returns {any} Migrated data, or original data if no migrate function is defined
 */
export const migrateData = (parsedFields, data, migrateFn) => {
  if (typeof migrateFn !== 'function') return data;

  try {
    return migrateFn(parsedFields, data);
  } catch (err) {
    throw new Error(`FileBridge: migration failed: ${err.message}`);
  }
};

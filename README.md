# FileBridge

A lightweight JavaScript library for bridging browser localStorage and portable data files. Define your own file header format, validate imports, and move user data between devices without a backend.

---

## Why FileBridge?

Most web apps that store user data either require a backend database or lose everything when the user clears their browser. FileBridge takes a different approach:

- **No backend required** — all data stays on the user's device
- **Portable** — users can export their data to a file and import it on any other device or browser
- **Validated** — every imported file is checked against your defined header format before any data is loaded
- **Versioned** — built-in support for migrating older file formats to newer ones
- **Framework agnostic** — works with React, Vue, Svelte, vanilla JS, or any other setup

---

## Installation

```bash
npm install filebridge
```

Or include it directly in your project:

```js
import FileBridge from 'filebridge';
```

---

## Core Concepts

FileBridge is built around three ideas:

**1. The Header** — every file exported by FileBridge starts with a single line containing structured metadata about the file. You define what fields go in the header and how to validate them. This lets FileBridge reject files that weren't created by your app before any data is parsed.

**2. The Data** — everything after the header line is your application data, serialized as JSON. FileBridge handles the serialization and deserialization for you.

**3. The Bridge** — FileBridge connects three storage contexts: runtime memory, browser localStorage, and the file system. You decide which ones you need.

```
[ localStorage ] <---> [ Runtime / Redux ] <---> [ Exported File ]
```

---

## Quick Start

```js
import FileBridge from 'filebridge';

// 1. Create an instance with your header configuration
const bridge = new FileBridge({
  header: {
    fields: ['appId', 'systemCode', 'version'],
    delimiter: '|',
    validate: (fields) => {
      return fields.appId === 'MYAPP' && fields.systemCode === 'SETTINGS';
    }
  }
});

// 2. Export data to a file
const userData = { theme: 'dark', fontSize: 14 };
bridge.exportFile({
  data: userData,
  filename: 'my_settings.dat',
  headerValues: {
    appId: 'MYAPP',
    systemCode: 'SETTINGS',
    version: '1'
  }
});

// 3. Import data from a file
bridge.importFile({
  onSuccess: (data, headerFields) => {
    console.log('Loaded data:', data);
  },
  onError: (err) => {
    console.error('Import failed:', err);
  }
});
```

---

## API Reference

### `new FileBridge(options)`

Creates a new FileBridge instance.

| Option | Type | Required | Description |
|---|---|---|---|
| `header.fields` | `string[]` | Yes | Ordered list of field names in the header |
| `header.delimiter` | `string` | No | Character separating header fields. Default: `\|` |
| `header.validate` | `Function` | Yes | Function that receives parsed header fields and returns `true` if valid |
| `header.migrate` | `Function` | No | Function to upgrade data from older file versions |
| `storage.namespace` | `string` | No | Prefix for all localStorage keys to avoid collisions |

---

### `bridge.exportFile(options)`

Triggers a file download in the browser containing your header and data.

```js
bridge.exportFile({
  data: myData,           // any JSON-serializable value
  filename: 'export.dat', // name of the downloaded file
  headerValues: {         // values for each field defined in header.fields
    appId: 'MYAPP',
    systemCode: 'CLOCK',
    version: '2'
  }
});
```

| Option | Type | Required | Description |
|---|---|---|---|
| `data` | `any` | Yes | The data to export. Must be JSON serializable |
| `filename` | `string` | Yes | The filename for the downloaded file |
| `headerValues` | `Object` | Yes | Key-value pairs matching your defined header fields |

---

### `bridge.importFile(options)`

Opens the browser file picker and imports a file. Validates the header before parsing data.

```js
bridge.importFile({
  onSuccess: (data, headerFields) => {
    // data: your parsed application data
    // headerFields: the parsed header as a key-value object
  },
  onError: (err) => {
    // err.code: 'INVALID_FORMAT' | 'INVALID_HEADER' | 'INVALID_DATA' | 'READ_ERROR'
    // err.message: human readable description
  }
});
```

| Option | Type | Required | Description |
|---|---|---|---|
| `onSuccess` | `Function` | Yes | Called with `(data, headerFields)` on successful import |
| `onError` | `Function` | Yes | Called with an error object if import fails at any stage |

**Error codes:**

| Code | Description |
|---|---|
| `INVALID_FORMAT` | File does not have the expected structure (missing header or data) |
| `INVALID_HEADER` | File header did not pass your `validate` function |
| `INVALID_DATA` | Data section could not be parsed as JSON |
| `READ_ERROR` | Browser could not read the file |

---

### `bridge.storage.get(key, fallback?)`

Reads a value from localStorage under your configured namespace.

```js
const settings = bridge.storage.get('settings', { theme: 'light' });
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `key` | `string` | Yes | The storage key (will be prefixed with your namespace) |
| `fallback` | `any` | No | Value to return if key does not exist or data is corrupted |

---

### `bridge.storage.set(key, value)`

Writes a value to localStorage under your configured namespace.

```js
bridge.storage.set('settings', { theme: 'dark' });
```

Returns `true` on success, `false` if localStorage is unavailable (e.g. SSR environments).

---

### `bridge.storage.remove(key)`

Removes a value from localStorage.

```js
bridge.storage.remove('settings');
```

---

## Header Validation

The `validate` function receives a key-value object built from your `fields` definition and the delimiter-split header line. Return `true` to accept the file, return `false` or throw to reject it.

```js
const bridge = new FileBridge({
  header: {
    fields: ['appId', 'systemCode', 'version'],
    delimiter: '|',
    validate: ({ appId, systemCode, version }) => {
      if (appId !== 'MYAPP') return false;
      if (!['CLOCK', 'SETTINGS'].includes(systemCode)) return false;
      if (parseInt(version) < 1) return false;
      return true;
    }
  }
});
```

---

## File Version Migration

When your data format changes between versions, use the `migrate` option to upgrade older files automatically on import. The `migrate` function receives the parsed header fields and raw data, and should return the upgraded data.

```js
const bridge = new FileBridge({
  header: {
    fields: ['appId', 'systemCode', 'version'],
    delimiter: '|',
    validate: ({ appId }) => appId === 'MYAPP',
    migrate: ({ version }, data) => {
      if (version === '1') {
        // v1 stored timers as an object, v2 uses an array
        return Object.values(data.timers);
      }
      return data;
    }
  }
});
```

---

## SSR / Server-Side Rendering

FileBridge is designed for browser environments but handles SSR gracefully. All methods that require browser APIs (`window`, `localStorage`, `FileReader`) will return `false` or call `onError` rather than throwing when run in a server context. No special configuration needed.

---

## Multiple Instances

You can create multiple FileBridge instances in the same app for different subsystems, each with their own header configuration and storage namespace:

```js
const clockBridge = new FileBridge({
  header: { fields: ['appId', 'system', 'version'], validate: (f) => f.system === 'CLOCK' },
  storage: { namespace: 'myApp:clock' }
});

const settingsBridge = new FileBridge({
  header: { fields: ['appId', 'system', 'version'], validate: (f) => f.system === 'SETTINGS' },
  storage: { namespace: 'myApp:settings' }
});
```

---

## Real World Example — Timer App

This example mirrors a real use case: a timer application where users can export their timers to a file, move to another computer, and import them back.

```js
import FileBridge from 'filebridge';

const bridge = new FileBridge({
  header: {
    fields: ['appId', 'system', 'version'],
    delimiter: '|',
    validate: ({ appId, system }) => appId === 'MYAPP' && system === 'CLOCK'
  },
  storage: { namespace: 'myApp:clock' }
});

// Save timers to localStorage
function saveTimers(timers) {
  bridge.storage.set('timers', timers);
}

// Load timers from localStorage
function loadTimers() {
  return bridge.storage.get('timers', []);
}

// Export timers to a file
function exportTimers(timers) {
  bridge.exportFile({
    data: timers,
    filename: 'my_timers.dat',
    headerValues: { appId: 'MYAPP', system: 'CLOCK', version: '1' }
  });
}

// Import timers from a file
function importTimers(onLoaded) {
  bridge.importFile({
    onSuccess: (data) => {
      bridge.storage.set('timers', data);
      onLoaded(data);
    },
    onError: (err) => {
      alert(`Could not load file: ${err.message}`);
    }
  });
}
```

---

## File Format

FileBridge files are plain text with two lines:

```
MYAPP|CLOCK|1
[{"id":1,"label":"Morning PT","hours":0,"minutes":30,"seconds":0}]
```

Line 1 is the header — your defined fields joined by the delimiter.
Line 2 is your data serialized as JSON.

This format is human-readable, easy to inspect in a text editor, and simple to parse or generate in any language if a user ever needs to work with their data outside of your app.

---

## Browser Support

FileBridge uses `localStorage`, `FileReader`, `Blob`, and `URL.createObjectURL` — all of which are supported in every modern browser. No polyfills required for current browser versions.

---

## Contributing

Issues and pull requests are welcome. Please open an issue first to discuss any significant changes.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

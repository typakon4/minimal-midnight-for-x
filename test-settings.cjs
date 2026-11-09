const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const attributes = new Map();
const properties = new Map();
let injectedStyle;
let onChanged;
let siteStorageAccesses = 0;
const root = {
  style: { setProperty: (key, value) => properties.set(key, value) },
  setAttribute: (key, value) => attributes.set(key, value),
  getAttribute: (key) => attributes.get(key),
};
const document = {
  documentElement: root,
  head: { appendChild: (style) => { injectedStyle = style; } },
  getElementById: (id) => injectedStyle?.id === id ? injectedStyle : null,
  createElement: () => ({}),
  addEventListener: () => {},
  title: 'Home / X',
};
const chrome = {
  storage: {
    local: {
      get: (defaults, callback) => callback({ ...defaults, timelineWidth: '750' }),
      set: () => {},
    },
    onChanged: { addListener: (callback) => { onChanged = callback; } },
  },
};
const localStorage = {
  getItem: () => { siteStorageAccesses++; return null; },
  setItem: () => { siteStorageAccesses++; },
};
const context = {
  document, chrome, localStorage,
  location: { pathname: '/home' },
  MutationObserver: class { observe() {} },
  requestAnimationFrame: (callback) => callback(),
};
const source = ['settings.js', 'features.js']
  .map((file) => fs.readFileSync(path.join(__dirname, file), 'utf8'))
  .join('\n');
vm.runInNewContext(source, context);

assert.equal(attributes.get('data-xm-compact-nav'), 'on');
assert.equal(attributes.get('data-xm-page'), 'home');
assert.equal(properties.get('--xm-timeline-width'), '750px');
onChanged({ compactNav: { newValue: 'off' } }, 'local');
assert.equal(attributes.get('data-xm-compact-nav'), 'off');
onChanged({ compactNav: { newValue: 'on' } }, 'sync');
assert.equal(attributes.get('data-xm-compact-nav'), 'off');
onChanged({ compactNav: { newValue: undefined } }, 'local');
assert.equal(attributes.get('data-xm-compact-nav'), 'on');
assert.equal(siteStorageAccesses, 0);
console.log('Settings transitions and site-storage isolation: OK');

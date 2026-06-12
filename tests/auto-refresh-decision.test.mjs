import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../chaoxing-homework-checker.user.js', import.meta.url), 'utf8');
const instrumented = source.replace(
  /\r?\n\s*if \(document\.readyState === "complete"\) init\(\);\r?\n\s*else window\.addEventListener\("load", init\);\r?\n\}\)\(\);\s*$/,
  '\n    globalThis.__cxhwTest = { isChaoxingUrl, shouldAutoRefreshOnLoad };\n})();\n'
);

const context = {
  console,
  URL,
  Date,
  setInterval: () => 1,
  clearInterval: () => {},
  GM_addStyle: () => {},
  GM_xmlhttpRequest: () => {},
  GM_getValue: (_key, defaultValue) => defaultValue,
  GM_setValue: () => {},
  location: { href: 'https://mooc1.chaoxing.com/mooc-ans/mooc2/work/list' },
  performance: { getEntriesByType: () => [] },
  sessionStorage: { getItem: () => null, setItem: () => {} },
  document: { readyState: 'loading' },
  window: {}
};
context.window.top = context.window;
context.window.addEventListener = () => {};

vm.createContext(context);
vm.runInContext(instrumented, context);

const { shouldAutoRefreshOnLoad } = context.__cxhwTest;
const now = 1_800_000_000_000;

assert.equal(
  shouldAutoRefreshOnLoad({
    autoRefreshOnLoad: true,
    isReload: true,
    storedUrl: 'https://mooc1.chaoxing.com/old',
    referrer: '',
    currentUrl: 'https://mooc1.chaoxing.com/new',
    internalOpenUntil: 0,
    now
  }),
  true,
  'browser reload should still auto-refresh'
);

assert.equal(
  shouldAutoRefreshOnLoad({
    autoRefreshOnLoad: true,
    isReload: false,
    storedUrl: null,
    referrer: 'https://chaoxing.com/',
    currentUrl: 'https://mooc1.chaoxing.com/visit/stucoursemiddle',
    internalOpenUntil: 0,
    now
  }),
  false,
  'chaoxing cross-subdomain new tabs should not auto-refresh'
);

assert.equal(
  shouldAutoRefreshOnLoad({
    autoRefreshOnLoad: true,
    isReload: false,
    storedUrl: null,
    referrer: '',
    currentUrl: 'https://mooc2-ans.chaoxing.com/mooc2-ans/mycourse/stu',
    internalOpenUntil: now + 10_000,
    now
  }),
  false,
  'recent plugin-opened chaoxing tabs should not auto-refresh even without referrer'
);

assert.equal(
  shouldAutoRefreshOnLoad({
    autoRefreshOnLoad: true,
    isReload: false,
    storedUrl: null,
    referrer: '',
    currentUrl: 'https://mooc1.chaoxing.com/',
    internalOpenUntil: 0,
    now
  }),
  true,
  'fresh address-bar/bookmark entry should still auto-refresh'
);

assert.equal(
  shouldAutoRefreshOnLoad({
    autoRefreshOnLoad: true,
    isReload: false,
    storedUrl: 'https://mooc1.chaoxing.com/old',
    referrer: '',
    currentUrl: 'https://mooc1.chaoxing.com/new',
    internalOpenUntil: 0,
    now
  }),
  false,
  'in-tab navigation should not auto-refresh'
);

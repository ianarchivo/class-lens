'use strict';

(function () {
  const lens = window.ClassLens;
  const tw = window.ClassLensTailwind;
  const byId = (id) => document.getElementById(id);
  const ui = {
    target: byId('target'),
    summary: byId('summary'),
    reset: byId('reset'),
    refresh: byId('refresh'),
    tabStyles: byId('tabStyles'),
    tabConvert: byId('tabConvert'),
    styleTools: byId('styleTools'),
    stylesView: byId('stylesView'),
    convertView: byId('convertView'),
    filter: byId('filter'),
    filterWrap: byId('filterWrap'),
    filterToggle: byId('filterToggle'),
    filterClose: byId('filterClose'),
    show: byId('show'),
    copyFormat: byId('copyFormat'),
    copyAll: byId('copyAll'),
    list: byId('list'),
    suggest: byId('suggest'),
    toast: byId('toast'),
    convertInput: byId('convertInput'),
    convertOutput: byId('convertOutput'),
    convertCopy: byId('convertCopy'),
    convertApply: byId('convertApply'),
    fromElement: byId('fromElement'),
  };

  document.documentElement.dataset.theme = chrome.devtools.panels.themeName === 'dark' ? 'dark' : 'light';

  function pageCollect(el, opts) {
    if (!el || el.nodeType !== 1) return { none: true };
    const store = (window.__classLens = window.__classLens || { off: new WeakMap() });
    store.decls = (store.decls || []).filter((x) => x.rule && x.rule.parentStyleSheet);
    const root = el.getRootNode();
    const own = (r) => Array.from(r.styleSheets || []).concat(Array.from(r.adoptedStyleSheets || []));
    const sheets = root && root !== document && root.host ? own(document).concat(own(root)) : own(document);
    const count = (s) => {
      try {
        return s.cssRules.length;
      } catch (e) {
        return 'x';
      }
    };
    const preview = document.getElementById('class-lens-preview');
    const sig = [sheets.map((s, i) => (s.href || 'inline' + i) + ':' + count(s) + (s.disabled ? 'd' : '')).join('|'), preview ? preview.textContent.length : 0, store.version || 0].join('|');
    const present = Array.from(el.classList);
    const off = (store.off.get(el) || []).filter((c) => !present.includes(c));
    const saved = (store.order && store.order.get(el)) || [];
    const ordered = saved
      .filter((c) => present.includes(c) || off.includes(c))
      .concat(present.filter((c) => !saved.includes(c)))
      .concat(off.filter((c) => !saved.includes(c)));
    const original = store.original && store.original.has(el) ? store.original.get(el) : null;
    const out = {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: present,
      ordered,
      off,
      inline: el.getAttribute('style') || '',
      edited: original !== null && (original || '') !== (el.getAttribute('class') || ''),
      previews: Object.keys(store.previews || {}),
      inlineOff: (store.inlineOff && store.inlineOff.get(el)) || [],
      disabledDecls: store.decls.map((x) => ({ selector: x.selector, media: x.media, prop: x.prop, value: x.value, important: x.priority === 'important', meta: x.meta || {} })),
      sig,
    };
    if (opts && opts.css) {
      const text = (sheet) =>
        Array.from(sheet.cssRules)
          .map((r) => {
            if (r.styleSheet) {
              try {
                return text(r.styleSheet);
              } catch (e) {
                return '';
              }
            }
            return r.cssText;
          })
          .join('\n');
      out.sheets = sheets
        .filter((s) => !s.disabled)
        .map((s) => {
          const media = s.media && s.media.mediaText && s.media.mediaText !== 'all' ? s.media.mediaText : '';
          try {
            const body = text(s);
            return { href: s.href, text: media ? `@media ${media} {\n${body}\n}` : body };
          } catch (e) {
            return { href: s.href, text: null, media };
          }
        });
    }
    return out;
  }

  function pageEvaluate(el, p) {
    if (!el || el.nodeType !== 1) el = document.documentElement;
    const cs = getComputedStyle(el);
    const attempt = (fn) => {
      try {
        return fn();
      } catch (e) {
        return null;
      }
    };
    const vars = {};
    const readVar = (name) => {
      if (!(name in vars)) vars[name] = cs.getPropertyValue(name).trim();
      return vars[name];
    };
    const topComma = (s) => {
      let depth = 0;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '(') depth++;
        else if (c === ')') depth--;
        else if (c === ',' && depth === 0) return i;
      }
      return -1;
    };
    const substitute = (value, depth) => {
      if (depth > 8 || value.indexOf('var(') === -1) return value;
      let out = '';
      let i = 0;
      while (i < value.length) {
        const at = value.indexOf('var(', i);
        if (at === -1) {
          out += value.slice(i);
          break;
        }
        out += value.slice(i, at);
        let j = at + 4;
        let d = 1;
        while (j < value.length && d > 0) {
          if (value[j] === '(') d++;
          else if (value[j] === ')') d--;
          j++;
        }
        const inner = value.slice(at + 4, j - 1);
        const comma = topComma(inner);
        const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
        const fallback = comma === -1 ? '' : inner.slice(comma + 1).trim();
        const found = readVar(name);
        out += ` ${found !== '' ? found : substitute(fallback, depth + 1)} `;
        i = j;
      }
      const tidy = out
        .replace(/\s+/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .replace(/\s+,/g, ',')
        .trim();
      return substitute(tidy, depth + 1);
    };
    const wrap = document.createElement('div');
    wrap.setAttribute('data-class-lens-probe', '');
    wrap.style.cssText = 'display:none !important';
    wrap.style.fontSize = cs.fontSize;
    const probe = document.createElement('div');
    wrap.appendChild(probe);
    document.documentElement.appendChild(wrap);
    const pcs = getComputedStyle(probe);
    const decls = p.decls.map(({ prop, value }) => {
      const resolved = substitute(value, 0);
      if (prop.indexOf('--') === 0) return { resolved, computed: resolved, parts: {}, valid: true };
      probe.style.cssText = '';
      probe.style.setProperty(prop, resolved);
      const longhands = Array.from(probe.style);
      const parts = {};
      longhands.forEach((l) => {
        parts[l] = pcs.getPropertyValue(l);
      });
      const values = Object.values(parts);
      let computed = longhands.length ? pcs.getPropertyValue(prop) : '';
      if (!computed && values.length) computed = values.every((v) => v === values[0]) ? values[0] : values.join(' ');
      return { resolved, computed, parts, valid: longhands.length > 0 };
    });
    wrap.remove();
    const finals = {};
    p.props.forEach((prop) => {
      finals[prop] = cs.getPropertyValue(prop);
    });
    return {
      matches: p.selectors.map((s) => attempt(() => el.matches(s))),
      media: p.media.map((m) => attempt(() => matchMedia(m).matches)),
      supports: p.supports.map((c) => attempt(() => CSS.supports(c))),
      decls,
      finals,
      vars,
      rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
    };
  }

  function pageCommit(el, p) {
    if (!el || el.nodeType !== 1) return false;
    const store = (window.__classLens = window.__classLens || { off: new WeakMap() });
    store.order = store.order || new WeakMap();
    store.original = store.original || new WeakMap();
    store.previews = store.previews || {};
    if (!store.original.has(el)) store.original.set(el, el.getAttribute('class') || '');
    if (p.previews && p.previews.length) {
      p.previews.forEach(({ cls, css }) => {
        store.previews[cls] = css;
      });
      let tag = document.getElementById('class-lens-preview');
      if (!tag) {
        tag = document.createElement('style');
        tag.id = 'class-lens-preview';
        (document.head || document.documentElement).appendChild(tag);
      }
      tag.textContent = Object.values(store.previews).join('\n');
    }
    const off = p.off.filter((c) => p.ordered.includes(c));
    store.order.set(el, p.ordered.slice());
    store.off.set(el, off);
    const live = p.ordered.filter((c) => !off.includes(c));
    if (live.length) el.setAttribute('class', live.join(' '));
    else el.removeAttribute('class');
    return true;
  }

  function pageRule(el, p) {
    const store = (window.__classLens = window.__classLens || { off: new WeakMap() });
    store.decls = store.decls || [];
    const key = [p.selector, p.media.join('\u0001'), p.prop].join('\u0000');
    if (p.action === 'on') {
      const at = store.decls.findIndex((x) => x.key === key);
      if (at === -1) return false;
      const x = store.decls[at];
      x.rule.style.setProperty(x.prop, x.value, x.priority);
      store.decls.splice(at, 1);
      store.version = (store.version || 0) + 1;
      return true;
    }
    const hex = /[0-9a-fA-F]/;
    const skip = (t, i) => {
      let j = i + 1;
      if (hex.test(t[j] || '')) {
        let n = 0;
        while (n < 6 && hex.test(t[j] || '')) {
          j++;
          n++;
        }
        if (/[ \t\n\r\f]/.test(t[j] || '')) j++;
        return j;
      }
      return j + 1;
    };
    const split = (t) => {
      const out = [];
      let depth = 0;
      let quote = null;
      let start = 0;
      let i = 0;
      while (i < t.length) {
        const ch = t[i];
        if (ch === '\\') {
          i = skip(t, i);
          continue;
        }
        if (quote) {
          if (ch === quote) quote = null;
          i++;
          continue;
        }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(' || ch === '[') depth++;
        else if (ch === ')' || ch === ']') depth--;
        else if (ch === ',' && depth === 0) {
          out.push(t.slice(start, i));
          start = i + 1;
        }
        i++;
      }
      out.push(t.slice(start));
      return out.map((s) => s.trim()).filter(Boolean);
    };
    const nest = (child, parent) => {
      if (!parent) return child;
      const parents = split(parent);
      const scope = parents.length === 1 ? parents[0] : ':is(' + parents.join(', ') + ')';
      return split(child)
        .map((part) => {
          let out = '';
          let found = false;
          let i = 0;
          while (i < part.length) {
            const ch = part[i];
            if (ch === '\\') {
              const j = skip(part, i);
              out += part.slice(i, j);
              i = j;
              continue;
            }
            if (ch === '&') {
              out += scope;
              found = true;
            } else out += ch;
            i++;
          }
          return found ? out : scope + ' ' + part;
        })
        .join(', ');
    };
    const wanted = p.media.join('\u0001');
    let found = null;
    const visit = (rules, parent, media) => {
      for (const rule of rules) {
        if (found) return;
        const kind = rule.constructor.name;
        const hasProp = (r) => p.action === 'add' || r.style.getPropertyValue(p.prop) !== '';
        if (kind === 'CSSStyleRule') {
          const sel = nest(rule.selectorText, parent);
          if (sel === p.selector && media.join('\u0001') === wanted && hasProp(rule)) {
            found = rule;
            return;
          }
          if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules, sel, media);
        } else if (kind === 'CSSNestedDeclarations') {
          if (parent === p.selector && media.join('\u0001') === wanted && hasProp(rule)) found = rule;
        } else if (kind === 'CSSMediaRule') visit(rule.cssRules, parent, media.concat(rule.media.mediaText));
        else if (kind === 'CSSImportRule') {
          try {
            visit(rule.styleSheet.cssRules, parent, media);
          } catch (e) {
            continue;
          }
        } else if (kind !== 'CSSKeyframesRule' && rule.cssRules) visit(rule.cssRules, parent, media);
      }
    };
    const root = el && el.getRootNode ? el.getRootNode() : document;
    const sheets = Array.from(document.styleSheets).concat(Array.from(document.adoptedStyleSheets || []), root !== document && root.styleSheets ? Array.from(root.styleSheets) : []);
    for (const sheet of sheets) {
      try {
        visit(sheet.cssRules, '', []);
      } catch (e) {
        continue;
      }
      if (found) break;
    }
    if (!found) return false;
    if (p.action === 'off') {
      store.decls.push({ key, rule: found, prop: p.prop, value: found.style.getPropertyValue(p.prop), priority: found.style.getPropertyPriority(p.prop), selector: p.selector, media: p.media, meta: p.meta || {} });
      found.style.removeProperty(p.prop);
    } else if (p.action === 'set') {
      const old = found.style.getPropertyValue(p.prop);
      const priority = found.style.getPropertyPriority(p.prop);
      if (p.newProp !== p.prop) found.style.removeProperty(p.prop);
      found.style.setProperty(p.newProp, p.value, priority);
      if (!found.style.getPropertyValue(p.newProp)) {
        found.style.setProperty(p.prop, old, priority);
        return false;
      }
    } else if (p.action === 'add') {
      found.style.setProperty(p.prop, p.value);
      if (!found.style.getPropertyValue(p.prop)) return false;
    }
    store.version = (store.version || 0) + 1;
    return true;
  }

  function pageInline(el, p) {
    if (!el || el.nodeType !== 1) return false;
    const store = (window.__classLens = window.__classLens || { off: new WeakMap() });
    store.inlineOff = store.inlineOff || new WeakMap();
    const off = (store.inlineOff.get(el) || []).slice();
    let ok = true;
    if (p.action === 'off') {
      off.push({ prop: p.prop, value: el.style.getPropertyValue(p.prop), important: el.style.getPropertyPriority(p.prop) === 'important' });
      el.style.removeProperty(p.prop);
    } else if (p.action === 'on') {
      const at = off.findIndex((x) => x.prop === p.prop);
      if (at !== -1) {
        el.style.setProperty(off[at].prop, off[at].value, off[at].important ? 'important' : '');
        off.splice(at, 1);
      }
    } else if (p.action === 'set') {
      const old = el.style.getPropertyValue(p.prop);
      const priority = el.style.getPropertyPriority(p.prop);
      if (p.newProp !== p.prop) el.style.removeProperty(p.prop);
      el.style.setProperty(p.newProp, p.value, priority);
      if (!el.style.getPropertyValue(p.newProp)) {
        el.style.setProperty(p.prop, old, priority);
        ok = false;
      }
    } else if (p.action === 'remove') {
      el.style.removeProperty(p.prop);
      const at = off.findIndex((x) => x.prop === p.prop);
      if (at !== -1) off.splice(at, 1);
    }
    if (!el.getAttribute('style')) el.removeAttribute('style');
    store.inlineOff.set(el, off);
    return ok;
  }

  function pageVars(el, p) {
    const cs = getComputedStyle(el && el.nodeType === 1 ? el : document.documentElement);
    const out = {};
    p.names.forEach((name) => {
      out[name] = cs.getPropertyValue(name).trim();
    });
    return { values: out, rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 };
  }

  function pageReset(el) {
    const store = window.__classLens;
    if (!el || !store || !store.original || !store.original.has(el)) return false;
    const original = store.original.get(el);
    if (original) el.setAttribute('class', original);
    else el.removeAttribute('class');
    store.original.delete(el);
    store.off.delete(el);
    if (store.order) store.order.delete(el);
    return true;
  }

  function pageUsage(el, p) {
    const counts = {};
    p.classes.forEach((cls) => {
      counts[cls] = document.getElementsByClassName(cls).length;
    });
    return counts;
  }

  function pageWatch(el) {
    if (!el || el.nodeType !== 1) return { key: '', look: 0 };
    const cs = getComputedStyle(el);
    let look = 0;
    for (let i = 0; i < cs.length; i++) {
      const value = cs.getPropertyValue(cs[i]);
      for (let j = 0; j < value.length; j++) look = (look * 31 + value.charCodeAt(j)) | 0;
    }
    return { key: [el.getAttribute('class') || '', el.getAttribute('style') || '', document.styleSheets.length, innerWidth, innerHeight].join('|'), look };
  }

  function evalPage(fn, arg) {
    const expression = `(${fn.toString()})($0, ${JSON.stringify(arg == null ? null : arg)})`;
    return new Promise((resolve, reject) => {
      chrome.devtools.inspectedWindow.eval(expression, (result, exception) => {
        if (exception && (exception.isException || exception.isError)) {
          reject(new Error(exception.value || exception.description || 'Could not read the page'));
        } else resolve(result);
      });
    });
  }

  function collectSheets(sheets) {
    return new Promise((resolve) => {
      const finish = (resources) => {
        const styles = (resources || []).filter((r) => r.type === 'stylesheet');
        const byUrl = new Map(styles.map((r) => [r.url, r]));
        const hrefs = new Set(sheets.map((s) => s.href).filter(Boolean));
        const extras = styles.filter((r) => !hrefs.has(r.url) && !/^(https?|file|blob|data|chrome-extension|chrome|about|opera):/i.test(r.url || ''));
        const name = (href) => (href ? href.split('/').pop().split('?')[0] || href : '<style>');
        const jobs = sheets.map(
          (s) =>
            new Promise((done) => {
              if (s.text != null) return done({ text: s.text, source: name(s.href), kind: 'cssom' });
              const resource = byUrl.get(s.href);
              if (!resource) return done({ text: '', source: name(s.href), kind: 'cssom' });
              resource.getContent((content) => done({ text: content ? (s.media ? `@media ${s.media} {\n${content}\n}` : content) : '', source: name(s.href), kind: 'cssom' }));
            }),
        );
        state.resources = new Map();
        for (const resource of extras) {
          const source = resource.url || 'inspector-stylesheet';
          state.resources.set(source, resource);
          jobs.push(new Promise((done) => resource.getContent((content) => done({ text: content || '', source, kind: 'resource' }))));
        }
        Promise.all(jobs).then(resolve);
      };
      try {
        chrome.devtools.inspectedWindow.getResources(finish);
      } catch (error) {
        finish([]);
      }
    });
  }

  const readSetting = (key, fallback) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  };
  const writeSetting = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  };

  const state = {
    sig: null,
    index: null,
    tw: null,
    previewText: new Map(),
    resolvedText: null,
    known: new Set(),
    reverse: null,
    reverseSig: null,
    usage: {},
    seq: 0,
    view: null,
    watch: '',
    tab: 'styles',
    editing: 0,
    renderPending: false,
    convertDir: 'css',
    convertResult: null,
    tokens: null,
    tokensSig: null,
    resources: new Map(),
    resourceOff: [],
    forceIndex: false,
    filterOpen: false,
  };
  ui.copyFormat.value = readSetting('classLens.format', 'tailwind');
  ui.show.value = readSetting('classLens.show', 'all');

  function simplifyValue(value) {
    return value.replace(/calc\(var\(--spacing\)\s*\*\s*(-?[\d.]+)\)/g, (_, n) => `${+(parseFloat(n) * 4).toFixed(2)}px`);
  }

  function rebuildIndex(texts, rootPx) {
    state.index = lens.buildIndex(texts);
    state.tw = tw.context(state.index, rootPx);
    state.known = new Set(state.index.classNames);
    state.previewText = new Map();
    for (const [cls, decls] of state.tw.singles) {
      const visible = decls.filter((d) => !d.prop.startsWith('--'));
      if (visible.length) state.previewText.set(cls, visible.map((d) => `${d.prop}: ${simplifyValue(d.value)}`).join('; '));
    }
  }

  function elementRules(info) {
    const hits = [];
    for (const rule of state.index.rules) {
      if (/^(theme|base|properties)(\.|$)/.test(rule.layer || '')) continue;
      for (const part of rule.parts) {
        const compounds = lens.splitCompounds(part);
        const last = lens.stripParens(compounds[compounds.length - 1] || '');
        if (/(^|[^\\])\./.test(last.replace(/\[[^\]]*\]/g, ''))) continue;
        const type = last.match(/^([a-z][a-z0-9-]*)/i);
        if (type && type[1].toLowerCase() !== info.tag) continue;
        const id = last.match(/#((?:\\.|[\w-])+)/);
        if (id && lens.unescapeIdent(id[1]) !== info.id) continue;
        if (/^:root\b/.test(last) && info.tag !== 'html') continue;
        const { base, pseudo } = lens.stripPseudoElements(part);
        hits.push({ rule, part, base, pseudo, spec: lens.specificity(part) });
        break;
      }
    }
    return hits.length ? { cls: null, variants: [], utility: '', hits, related: [], markers: 0, markerExample: '' } : null;
  }

  function isUtility(entry, hit) {
    if (!entry.cls || hit.rule.kind === 'resource') return false;
    if (state.index.layers.length && !/^utilities(\.|$)/.test(hit.rule.layer || '')) return false;
    const compounds = lens.splitCompounds(hit.base);
    const last = lens.stripParens(compounds[compounds.length - 1] || '');
    return [...last.matchAll(lens.CLASS_TOKEN)].length === 1;
  }

  function singleClass(entry, hit) {
    if (!entry.cls) return false;
    const compounds = lens.splitCompounds(hit.base);
    const last = lens.stripParens(compounds[compounds.length - 1] || '');
    return [...last.matchAll(lens.CLASS_TOKEN)].length === 1;
  }

  function findRuleIn(sheet, selector, media, prop) {
    let found = null;
    const visit = (rules, parent, chain) => {
      for (const rule of rules) {
        if (found) return;
        const kind = rule.constructor.name;
        if (kind === 'CSSStyleRule') {
          const sel = lens.resolveNested(rule.selectorText, parent);
          if (sel === selector && chain.join('\u0001') === media.join('\u0001') && (!prop || rule.style.getPropertyValue(prop) !== '')) {
            found = rule;
            return;
          }
          if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules, sel, chain);
        } else if (kind === 'CSSMediaRule') visit(rule.cssRules, parent, chain.concat(rule.media.mediaText));
        else if (kind !== 'CSSKeyframesRule' && rule.cssRules) visit(rule.cssRules, parent, chain);
      }
    };
    visit(sheet.cssRules, '', []);
    return found;
  }

  function editResource(source, change) {
    const resource = state.resources.get(source);
    if (!resource) return Promise.resolve(false);
    return new Promise((resolve) => {
      resource.getContent((text) => {
        const sheet = new CSSStyleSheet();
        try {
          sheet.replaceSync(text || '');
        } catch (error) {
          resolve(false);
          return;
        }
        const ok = change(sheet);
        if (!ok) {
          resolve(false);
          return;
        }
        const next = Array.from(sheet.cssRules)
          .map((r) => r.cssText)
          .join('\n');
        resource.setContent(next, true, (status) => resolve(!(status && status.isError)));
      });
    });
  }

  async function changeRule(hit, action, payload) {
    const meta = { id: hit.rule.id, layer: hit.rule.layer, supports: hit.rule.supports, container: hit.rule.container };
    if (hit.rule.kind === 'resource') {
      const { selector, media } = hit.rule;
      if (action === 'on') {
        const at = state.resourceOff.findIndex((x) => x.selector === selector && x.prop === payload.prop && x.source === hit.rule.source);
        if (at === -1) return false;
        const x = state.resourceOff[at];
        const ok = await editResource(hit.rule.source, (sheet) => {
          const rule = findRuleIn(sheet, selector, media) || null;
          if (!rule) return false;
          rule.style.setProperty(x.prop, x.value, x.important ? 'important' : '');
          return true;
        });
        if (ok) state.resourceOff.splice(at, 1);
        return ok;
      }
      return editResource(hit.rule.source, (sheet) => {
        const rule = findRuleIn(sheet, selector, media, action === 'add' ? null : payload.prop);
        if (!rule) return false;
        if (action === 'off') {
          state.resourceOff.push({ source: hit.rule.source, selector, media, prop: payload.prop, value: rule.style.getPropertyValue(payload.prop), important: rule.style.getPropertyPriority(payload.prop) === 'important', meta });
          rule.style.removeProperty(payload.prop);
        } else if (action === 'set') {
          const priority = rule.style.getPropertyPriority(payload.prop);
          if (payload.newProp !== payload.prop) rule.style.removeProperty(payload.prop);
          rule.style.setProperty(payload.newProp, payload.value, priority);
        } else if (action === 'add') rule.style.setProperty(payload.prop, payload.value);
        return true;
      });
    }
    return evalPage(pageRule, { selector: hit.rule.selector, media: hit.rule.media, action, meta, ...payload });
  }

  async function editRule(hit, d, change) {
    const prop = change.prop.trim().toLowerCase();
    const value = change.value.trim().replace(/;$/, '');
    if (prop === d.prop && (value === lens.displayValue(d) || value === d.value)) return;
    if (!prop || !value) {
      await toggleDecl(null, hit, d, false);
      return;
    }
    const ok = await changeRule(hit, 'set', { prop: d.prop, newProp: prop, value }).catch(() => false);
    toast(ok ? `${prop}: ${value}` : 'The browser rejected that value');
    state.forceIndex = true;
    await refresh();
  }

  async function addToRule(hit, prop, value) {
    const ok = await changeRule(hit, 'add', { prop, value }).catch(() => false);
    toast(ok ? `Added ${prop}: ${value}` : 'The browser rejected that value');
    state.forceIndex = true;
    await refresh();
  }

  async function changeInline(action, payload) {
    const ok = await evalPage(pageInline, { action, ...payload }).catch(() => false);
    if (!ok && action === 'set') toast('The browser rejected that value');
    await refresh();
    return ok;
  }

  async function inlineToClass(d) {
    const items = await toTailwind([{ prop: d.prop, value: d.value, important: d.important }], []);
    const classes = items.map((item) => item.cls);
    await evalPage(pageInline, { action: 'remove', prop: d.prop }).catch(() => false);
    await addFromText(classes.join(' '));
  }

  function mergeDisabled(entries, info) {
    if (!info.disabledDecls.length) return;
    const ruleKey = (selector, media) => selector + '\u0000' + media.join('\u0001');
    const asDecl = (x) => ({ prop: x.prop, value: x.value, important: x.important, disabled: true });
    const used = new Set();
    for (const entry of entries) {
      for (const hit of entry.hits) {
        const extra = info.disabledDecls.filter((x) => ruleKey(x.selector, x.media) === ruleKey(hit.rule.selector, hit.rule.media));
        if (!extra.length) continue;
        extra.forEach((x) => used.add(x));
        hit.rule = { ...hit.rule, decls: [...hit.rule.decls, ...extra.map(asDecl)] };
      }
    }
    const groups = new Map();
    for (const x of info.disabledDecls) {
      if (used.has(x)) continue;
      const key = ruleKey(x.selector, x.media);
      if (!groups.has(key)) {
        groups.set(key, {
          id: x.meta.id != null ? x.meta.id : 1e6 + groups.size,
          selector: x.selector,
          parts: lens.splitTop(x.selector, ','),
          decls: [],
          media: x.media,
          supports: x.meta.supports || [],
          container: x.meta.container || [],
          layer: x.meta.layer || '',
          starting: false,
        });
      }
      groups.get(key).decls.push(asDecl(x));
    }
    if (!groups.size) return;
    const mini = { rules: [...groups.values()] };
    const placed = new Set();
    for (const entry of entries) {
      if (!entry.cls) continue;
      const [found] = lens.matchClasses(mini, [entry.cls]);
      found.hits.forEach((hit) => placed.add(hit.rule));
      if (found.hits.length) entry.hits.push(...found.hits);
    }
    const loose = mini.rules.filter((rule) => !placed.has(rule));
    if (!loose.length) return;
    let elementEntry = entries.find((entry) => !entry.cls);
    if (!elementEntry) {
      elementEntry = { cls: null, variants: [], utility: '', hits: [], related: [], markers: 0, markerExample: '' };
      entries.push(elementEntry);
    }
    for (const rule of loose) {
      const part = rule.parts[0];
      const { base, pseudo } = lens.stripPseudoElements(part);
      elementEntry.hits.push({ rule, part, base, pseudo, spec: lens.specificity(part) });
    }
  }

  async function refresh() {
    const seq = ++state.seq;
    try {
      const info = await evalPage(pageCollect, { css: false });
      if (seq !== state.seq) return;
      if (!info || info.none) {
        state.view = null;
        renderMessage('Select an element in the Elements panel.');
        return;
      }
      if (!state.index || info.sig !== state.sig || state.forceIndex) {
        state.forceIndex = false;
        const full = await evalPage(pageCollect, { css: true });
        if (seq !== state.seq) return;
        const texts = await collectSheets(full.sheets);
        if (seq !== state.seq) return;
        rebuildIndex(texts, state.view ? state.view.res.rootPx : 16);
        if (info.sig !== state.sig) state.tokensSig = null;
        state.sig = info.sig;
      }
      const entries = lens.matchClasses(state.index, info.ordered);
      const found = elementRules(info);
      if (found) entries.push(found);
      info.disabledDecls = info.disabledDecls.concat(state.resourceOff);
      mergeDisabled(entries, info);
      const elementEntry = entries.find((entry) => !entry.cls) || null;
      const inline = lens.parseDecls(info.inline);
      const res = await evalPage(pageEvaluate, lens.buildRequest(entries));
      if (seq !== state.seq || !res) return;
      lens.analyze({ entries, res, index: state.index, info, inline });
      if (elementEntry) {
        elementEntry.hits = elementEntry.hits.filter((hit) => res.matches[hit.selIdx] === true || hit.decls.some((d) => d.state === 'disabled'));
        if (!elementEntry.hits.length) entries.splice(entries.indexOf(elementEntry), 1);
      }
      state.view = { info, entries, inline, res };
      state.watch = await evalPage(pageWatch).catch(() => ({ key: '', look: 0 }));
      render();
      if (state.reverseSig !== state.sig) setTimeout(() => ensureReverse().catch(() => undefined), 400);
    } catch (error) {
      if (seq === state.seq) renderMessage(`Can't read this page: ${error.message}`);
    }
  }

  function h(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value == null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value === true ? '' : value);
      }
    }
    for (const child of [].concat(children || [])) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function marked(text, query) {
    if (!query) return [text];
    const lower = text.toLowerCase();
    const out = [];
    let at = 0;
    let found = lower.indexOf(query);
    while (found !== -1) {
      if (found > at) out.push(text.slice(at, found));
      out.push(h('mark', { text: text.slice(found, found + query.length) }));
      at = found + query.length;
      found = lower.indexOf(query, at);
    }
    if (at < text.length) out.push(text.slice(at));
    return out;
  }

  function renderMessage(text) {
    ui.target.textContent = 'No element selected';
    ui.summary.textContent = '';
    ui.reset.hidden = true;
    ui.list.replaceChildren(h('p', { class: 'empty', text }));
  }

  let toastTimer = 0;
  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2400);
  }

  async function copyText(text, label) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (error) {
      const area = h('textarea', { class: 'clip' });
      area.value = text;
      document.body.append(area);
      area.select();
      ok = document.execCommand('copy');
      area.remove();
    }
    toast(ok ? `Copied ${label}` : 'Could not copy');
  }

  function liveClasses() {
    const { info } = state.view;
    return info.ordered.filter((cls) => !info.off.includes(cls));
  }

  async function commit({ ordered, off, message }) {
    const previews = [];
    for (const cls of ordered) {
      if (state.known.has(cls)) continue;
      const css = tw.classToCss(cls, state.tw);
      if (css) previews.push({ cls, css });
    }
    try {
      await evalPage(pageCommit, { ordered, off, previews });
      if (message) toast(message);
      await refresh();
    } catch (error) {
      toast(error.message);
    }
  }

  function splitClasses(text) {
    return text.split(/\s+/).map((c) => c.trim()).filter(Boolean);
  }

  const CSS_PROPERTIES = (() => {
    const list = new Set(Array.from(getComputedStyle(document.documentElement)).filter((p) => !p.startsWith('-')));
    ['padding', 'margin', 'inset', 'gap', 'border', 'border-radius', 'background', 'flex', 'font', 'overflow', 'transition', 'outline', 'place-items', 'grid-template-columns'].forEach((p) => list.add(p));
    return [...list].sort();
  })();

  function isCssProperty(name) {
    const lower = name.trim().toLowerCase();
    return lower.startsWith('--') || CSS_PROPERTIES.includes(lower);
  }

  function looksLikeCss(text) {
    const trimmed = text.trim();
    if (/[{}]/.test(trimmed)) return true;
    const first = trimmed.split(';')[0];
    const colon = first.indexOf(':');
    return colon > 0 && isCssProperty(first.slice(0, colon));
  }

  function normalizedKey(prop, r) {
    if (!r) return null;
    const value = lens.toHex(r.computed) || lens.toHex(r.resolved) || (r.computed || r.resolved || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return value ? `${prop}|${value}` : null;
  }

  function ensureReverse() {
    if (state.reverseSig === state.sig && state.reverse) return Promise.resolve();
    if (state.reversePromise && state.reversePromiseSig === state.sig) return state.reversePromise;
    state.reversePromiseSig = state.sig;
    state.reversePromise = buildReverse().finally(() => {
      state.reversePromise = null;
    });
    return state.reversePromise;
  }

  async function buildReverse() {
    const sig = state.sig;
    const candidates = [];
    for (const [cls, decls] of state.tw.singles) {
      if (/[[(]/.test(cls) || /\/[\d.]+$/.test(cls) || lens.variantsOf(cls).variants.length) continue;
      const visible = decls.filter((d) => !d.prop.startsWith('--'));
      if (visible.length < 1 || visible.length > 2) continue;
      visible.forEach((d) => candidates.push({ cls, d, n: visible.length }));
    }
    const unique = new Map();
    candidates.forEach((c) => unique.set(c.d.prop + '\u0000' + c.d.value, c.d));
    const decls = [...unique.values()].map((d) => ({ prop: d.prop, value: d.value }));
    const res = await evalPage(pageEvaluate, { selectors: [], media: [], supports: [], decls, props: [] });
    const keyOf = new Map(decls.map((d, i) => [d.prop + '\u0000' + d.value, normalizedKey(d.prop, res.decls[i])]));
    const shown = new Map(decls.map((d, i) => [d.prop + '\u0000' + d.value, lens.displayValue({ ...d, resolved: res.decls[i].resolved, computed: res.decls[i].computed })]));
    const reverse = new Map();
    const resolvedText = new Map();
    for (const c of candidates) {
      const id = c.d.prop + '\u0000' + c.d.value;
      const key = keyOf.get(id);
      if (key) {
        if (!reverse.has(key)) reverse.set(key, []);
        reverse.get(key).push({ cls: c.cls, n: c.n });
      }
      const value = shown.get(id);
      if (!resolvedText.has(c.cls)) resolvedText.set(c.cls, { text: [], hex: null });
      const entry = resolvedText.get(c.cls);
      entry.text.push(`${c.d.prop}: ${value}`);
      if (!entry.hex && /^#[0-9A-F]{6,8}$/.test(value)) entry.hex = value;
    }
    state.usage = await evalPage(pageUsage, { classes: [...new Set(candidates.map((c) => c.cls))] }).catch(() => ({}));
    state.resolvedText = resolvedText;
    state.reverse = reverse;
    state.reverseSig = sig;
  }

  function family(cls) {
    const { utility } = lens.variantsOf(cls);
    const parts = utility.replace(/^-/, '').split('-');
    return parts.length > 2 ? parts.slice(0, -1).join('-') : parts[0];
  }

  function familyScore(cls, prefer) {
    if (!prefer) return 2;
    const own = family(cls);
    if (own === prefer) return 0;
    return own.split('-')[0] === prefer.split('-')[0] ? 1 : 2;
  }

  async function toTailwind(input, variants, prefer) {
    const decls = tw.expandShorthands(input);
    await ensureReverse();
    const res = await evalPage(pageEvaluate, { selectors: [], media: [], supports: [], decls: decls.map((d) => ({ prop: d.prop, value: d.value })), props: [] });
    const alternatives = new Map();
    const usage = state.usage || {};
    const lookup = (prop, value) => {
      const token = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
      if (token) {
        const users = [];
        for (const [cls, list] of state.tw.singles) {
          if (/[[(]/.test(cls) || lens.variantsOf(cls).variants.length) continue;
          if (list.some((x) => (x.prop === prop || (prop === 'background' && x.prop === 'background-color')) && x.value.replace(/\s/g, '') === `var(${token[1]})`)) users.push(cls);
        }
        if (users.length) {
          users.sort((a, b) => familyScore(a, prefer) - familyScore(b, prefer) || (usage[b] || 0) - (usage[a] || 0) || a.length - b.length);
          alternatives.set(prop + '\u0000' + value, users);
          return users[0];
        }
      }
      const i = decls.findIndex((d) => d.prop === prop && d.value === value);
      if (i < 0) return null;
      const list = state.reverse.get(normalizedKey(prop, res.decls[i]));
      if (!list) return null;
      const ranked = list.slice().sort((a, b) => familyScore(a.cls, prefer) - familyScore(b.cls, prefer) || (usage[b.cls] || 0) - (usage[a.cls] || 0) || a.n - b.n || a.cls.length - b.cls.length);
      alternatives.set(prop + '\u0000' + value, ranked.map((item) => item.cls));
      return ranked[0].cls;
    };
    const items = tw.convertDecls(decls, { ...state.tw, rootPx: res.rootPx, lookup });
    const prefix = variants && variants.length ? variants.join(':') + ':' : '';
    return items.map((item) => ({
      ...item,
      cls: prefix + item.cls,
      options: item.source === 'build' ? (alternatives.get(item.from.prop + '\u0000' + item.from.value) || [item.cls]).map((cls) => prefix + cls) : [prefix + item.cls],
    }));
  }

  function insertAfter(ordered, after, classes) {
    const rest = ordered.filter((c) => !classes.includes(c));
    const at = after == null ? -1 : rest.indexOf(after);
    return at === -1 ? rest.concat(classes) : [...rest.slice(0, at + 1), ...classes, ...rest.slice(at + 1)];
  }

  async function addFromText(text, context) {
    const trimmed = text.trim();
    if (!trimmed || !state.view) return;
    const { info } = state.view;
    const variants = (context && context.variants) || [];
    let classes;
    if (looksLikeCss(trimmed)) {
      classes = [];
      for (const group of tw.cssToTailwind(trimmed, state.tw)) {
        const items = await toTailwind(group.decls, [...variants, ...group.variants]);
        classes.push(...items.map((item) => item.cls));
      }
    } else {
      const prefix = variants.length ? variants.join(':') + ':' : '';
      classes = splitClasses(trimmed).map((cls) => (prefix && !cls.startsWith(prefix) ? prefix + cls : cls));
    }
    if (!classes.length) {
      toast('Nothing to add');
      return;
    }
    const ordered = insertAfter(info.ordered, context && context.after, classes);
    const off = info.off.filter((c) => !classes.includes(c));
    await commit({ ordered, off, message: `Added ${classes.join(' ')}` });
  }

  async function renameClass(entry, text) {
    const { info } = state.view;
    const next = splitClasses(text);
    if (next.length === 1 && next[0] === entry.cls) return;
    const ordered = info.ordered.flatMap((c) => (c === entry.cls ? next : [c])).filter((c, i, all) => all.indexOf(c) === i);
    const off = info.off.filter((c) => c !== entry.cls);
    await commit({ ordered, off, message: next.length ? `${entry.cls} → ${next.join(' ')}` : `Removed ${entry.cls}` });
  }

  async function editDecl(entry, d, change) {
    const prop = change.prop.trim().toLowerCase();
    const value = change.value.trim().replace(/;$/, '');
    if (prop === d.prop && (value === lens.displayValue(d) || value === d.value)) return;
    const { info } = state.view;
    const visible = entry.hits.flatMap((hit) => hit.decls.filter((x) => !x.internal && x.state !== 'disabled'));
    if (!prop || !value) {
      if (entry.hits.length === 1 && visible.length === 1) await renameClass(entry, '');
      else toast('Turn the property off with its checkbox, or remove the class');
      return;
    }
    if (!isCssProperty(prop)) {
      toast(`${prop} isn't a CSS property`);
      return;
    }
    const items = await toTailwind([{ prop, value, important: d.important }], entry.variants, family(entry.cls));
    const classes = items.map((item) => item.cls);
    const touched = new Set([d.prop, ...d.longhands]);
    const visibleProps = visible.map((x) => x.prop);
    const onlyThis = entry.hits.length === 1 && visibleProps.every((p) => touched.has(p) || lens.longhandsOf(p).every((l) => touched.has(l)));
    const sameFamily = classes.length === 1 && family(classes[0]) === family(entry.cls) && entry.hits.length === 1;
    const swap = onlyThis || sameFamily;
    const ordered = (swap ? info.ordered.flatMap((c) => (c === entry.cls ? classes : [c])) : insertAfter(info.ordered, entry.cls, classes)).filter((c, i, all) => all.indexOf(c) === i);
    const off = info.off.filter((c) => c !== entry.cls);
    await commit({ ordered, off, message: swap ? `${entry.cls} → ${classes.join(' ')}` : `Added ${classes.join(' ')}` });
  }

  async function setOff(classes, turnOff) {
    const { info } = state.view;
    const off = turnOff ? [...new Set([...info.off, ...classes])] : info.off.filter((c) => !classes.includes(c));
    await commit({ ordered: info.ordered, off });
  }

  async function toggleDecl(entry, hit, d, on) {
    try {
      const ok = await changeRule(hit, on ? 'on' : 'off', { prop: d.prop });
      if (!ok) toast("Couldn't find this rule in the page's stylesheets");
      else if (!on) toast(entry && entry.cls && singleClass(entry, hit) ? `${d.prop} off in .${entry.cls}, for every element with this class` : `${d.prop} off in this rule`);
      if (hit.rule.kind === 'resource') state.forceIndex = true;
      await refresh();
    } catch (error) {
      toast(error.message);
    }
  }

  const COLOR_PROPS = /^(color|background|background-color|border(-(top|right|bottom|left|inline|block))?-color|outline-color|fill|stroke|text-decoration-color|caret-color|accent-color|column-rule-color)$/;
  const LENGTH_PROPS = /^(padding|margin|gap|row-gap|column-gap|top|right|bottom|left|inset|width|height|min-width|min-height|max-width|max-height|flex-basis|text-indent|border(-(top|right|bottom|left))?-width|outline-width|outline-offset|font-size|letter-spacing|border(-\w+)*-radius|translate|scroll-margin|scroll-padding)(-.*)?$/;
  const PROP_HINTS = [
    [/^(background|background-color)$/, /surface|bg|background|fill|canvas/],
    [/^color$/, /text|foreground|fg|content|ink/],
    [/border.*color|outline-color/, /border|stroke|line|divider|outline/],
    [/^(fill|stroke)$/, /icon|fill|stroke/],
    [/^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)/, /spacing|space|gap|inset|pad|margin|gutter/],
    [/^(width|height|min-|max-|flex-basis)/, /size|width|height|container|spacing/],
    [/^font-size$/, /text|font-size|type/],
    [/^line-height$/, /leading|line-height/],
    [/^font-weight$/, /weight/],
    [/^letter-spacing$/, /tracking|letter/],
    [/radius/, /radius|rounded|corner/],
    [/^box-shadow$/, /shadow|elevation/],
    [/^font-family$/, /font|family/],
    [/duration|delay/, /duration|motion|speed/],
    [/timing-function/, /ease|motion|curve/],
    [/^opacity$/, /opacity|alpha/],
    [/^z-index$/, /^--z|layer|z-index/],
  ];

  function tokenKind(value) {
    const v = value.trim();
    if (!v) return null;
    if (/^-?\d*\.?\d+m?s$/.test(v)) return 'time';
    if (/^(cubic-bezier|steps|linear|ease)/.test(v)) return 'easing';
    if (/\d(px|rem|em)\b.*\d(px|rem|em)\b/.test(v) && /(rgb|#|oklch|hsl|color)/.test(v)) return 'shadow';
    if (!/^(inherit|initial|unset|none|auto)$/i.test(v) && CSS.supports('color', v)) return 'color';
    if (/^-?\d*\.?\d+(px|rem|em|%|vw|vh|ch)$/.test(v) || /^calc\(/.test(v)) return 'length';
    if (/^-?\d*\.?\d+$/.test(v)) return 'number';
    if (/[a-z]/i.test(v) && /,|"|'/.test(v)) return 'font';
    return 'other';
  }

  function kindsFor(prop) {
    if (COLOR_PROPS.test(prop)) return ['color'];
    if (prop === 'line-height') return ['number', 'length'];
    if (LENGTH_PROPS.test(prop)) return ['length'];
    if (prop === 'box-shadow') return ['shadow'];
    if (/duration|delay/.test(prop)) return ['time'];
    if (/timing-function/.test(prop)) return ['easing'];
    if (prop === 'font-family') return ['font'];
    if (/^(font-weight|opacity|z-index|flex-grow|flex-shrink|order)$/.test(prop)) return ['number'];
    return null;
  }

  function ensureTokens() {
    if (state.tokens && state.tokensSig === state.sig) return Promise.resolve(state.tokens);
    if (state.tokensPromise && state.tokensPromiseSig === state.sig) return state.tokensPromise;
    state.tokensPromiseSig = state.sig;
    const names = new Set();
    for (const rule of state.index.rules) for (const d of rule.decls) if (d.prop.startsWith('--') && !d.prop.startsWith('--tw-')) names.add(d.prop);
    state.tokensPromise = evalPage(pageVars, { names: [...names] })
      .then(({ values, rootPx }) => {
        const tokens = [];
        for (const name of names) {
          const value = values[name];
          const kind = tokenKind(value || '');
          if (!kind || kind === 'other') continue;
          const hex = kind === 'color' ? lens.toHex(value) : null;
          const rem = value.match(/^(-?\d*\.?\d+)rem$/);
          const shown = hex || (rem ? `${value} · ${+(parseFloat(rem[1]) * rootPx).toFixed(2)}px` : value);
          tokens.push({ name, value, kind, hex, shown, palette: /^--color-[a-z]+-\d{2,3}$/.test(name) });
        }
        state.tokens = tokens;
        state.tokensSig = state.sig;
        return tokens;
      })
      .finally(() => {
        state.tokensPromise = null;
      });
    return state.tokensPromise;
  }

  const SPACING_PROPS = /^(padding|margin|gap|row-gap|column-gap|top|right|bottom|left|inset|width|height|min-width|min-height|max-width|max-height|flex-basis|translate|scroll-margin|scroll-padding)/;
  const SPACING_NOISE = /blur|breakpoint|radius|shadow|motion|duration|ease|animate|perspective|aspect|leading|tracking|font|text-|weight|offset/;
  const SCALE_STEPS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24];

  function valueItems(d) {
    const kinds = kindsFor(d.prop);
    const hint = (PROP_HINTS.find(([test]) => test.test(d.prop)) || [null, null])[1];
    const current = (d.value ? lens.displayValue(d) : '').toLowerCase();
    const spacingProp = SPACING_PROPS.test(d.prop);
    return (text) => {
      if (!state.tokens || !kinds) return [];
      const typed = text.trim().toLowerCase();
      const fresh = !typed || typed === current;
      const query = typed.replace(/^var\(/, '').replace(/\)$/, '');
      const scored = [];
      for (const token of state.tokens) {
        if (!kinds.includes(token.kind)) continue;
        const hinted = Boolean(hint && hint.test(token.name));
        if (spacingProp && !hinted && SPACING_NOISE.test(token.name)) continue;
        if (!fresh && !token.name.toLowerCase().includes(query) && !token.shown.toLowerCase().includes(query)) continue;
        let score = 0;
        if (hinted) score += 4;
        if (!token.palette) score += 1;
        if (token.shown.toLowerCase() === current || token.value.toLowerCase() === current) score += 2;
        if (d.value && d.value.includes(`var(${token.name})`)) score += 3;
        scored.push({ token, score });
      }
      scored.sort((a, b) => b.score - a.score || a.token.name.localeCompare(b.token.name));
      const items = scored.slice(0, 40).map(({ token, score }) => ({ value: `var(${token.name})`, label: token.name, detail: token.shown, hex: token.hex, kind: 'token', score }));
      const spacing = spacingProp && state.tokens.find((token) => token.name === '--spacing');
      if (spacing) {
        const unit = parseFloat((spacing.shown.match(/([\d.]+)px/) || [])[1]) || 4;
        const scale = SCALE_STEPS.map((n) => ({ value: `calc(var(--spacing) * ${n})`, label: `--spacing × ${n}`, detail: `${+(n * unit).toFixed(2)}px`, kind: 'token', score: 3 })).filter(
          (item) => fresh || item.detail.startsWith(query) || item.label.includes(query),
        );
        const hinted = items.filter((item) => item.score >= 4);
        const rest = items.filter((item) => item.score < 4);
        return [...hinted, ...scale, ...rest].slice(0, 40);
      }
      return items;
    };
  }

  function classItems(text) {
    const tokens = text.split(/\s+/);
    const token = tokens[tokens.length - 1] || '';
    const cut = token.lastIndexOf(':');
    const variantPart = cut === -1 ? '' : token.slice(0, cut + 1);
    const partial = cut === -1 ? token : token.slice(cut + 1);
    const ranked = [];
    const lowerPartial = partial.toLowerCase();
    for (const [cls, detail] of state.previewText) {
      if (cls.includes(':')) continue;
      const lower = cls.toLowerCase();
      const rank = !lowerPartial ? 2 : lower.startsWith(lowerPartial) ? 0 : lower.includes(lowerPartial) ? 1 : -1;
      if (rank >= 0) ranked.push({ rank, cls, detail });
    }
    ranked.sort((a, b) => a.rank - b.rank || a.cls.length - b.cls.length || a.cls.localeCompare(b.cls));
    const head = tokens.slice(0, -1).join(' ');
    const items = ranked.slice(0, 30).map((item) => {
      const resolved = state.resolvedText && state.resolvedText.get(item.cls);
      return {
        value: (head ? head + ' ' : '') + variantPart + item.cls,
        label: variantPart + item.cls,
        detail: resolved ? resolved.text.join('; ') : item.detail,
        hex: resolved ? resolved.hex : null,
      };
    });
    if (!items.length && partial.includes('-')) {
      const candidate = variantPart + partial;
      if (tw.classToCss(candidate, state.tw)) items.push({ value: (head ? head + ' ' : '') + candidate, label: candidate, detail: 'not in your build: preview' });
    }
    return items;
  }

  function propertyItems(text) {
    const partial = text.trim().toLowerCase();
    if (!partial) return [];
    return CSS_PROPERTIES.filter((p) => p.startsWith(partial))
      .slice(0, 12)
      .map((p) => ({ value: p, label: p, detail: 'property', kind: 'prop' }));
  }

  const suggest = { input: null, items: [], active: -1, navigated: false, provider: null, onPick: null };

  function openSuggest(input, provider, onPick) {
    suggest.input = input;
    suggest.provider = provider;
    suggest.onPick = onPick || null;
    updateSuggest();
    if (state.reverseSig !== state.sig && state.tw) {
      ensureReverse()
        .then(() => {
          if (suggest.input === input && !ui.suggest.hidden) updateSuggest();
        })
        .catch(() => undefined);
    }
  }

  function updateSuggest() {
    if (!suggest.input || !suggest.input.isConnected) {
      closeSuggest();
      return;
    }
    suggest.items = suggest.provider(suggest.input.value);
    suggest.active = suggest.items.length ? 0 : -1;
    suggest.navigated = false;
    if (!suggest.items.length) {
      closeSuggest();
      return;
    }
    const rect = suggest.input.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 260), window.innerWidth - 8);
    ui.suggest.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - width - 4))}px`;
    ui.suggest.style.top = `${rect.bottom + 2}px`;
    ui.suggest.style.width = `${width}px`;
    ui.suggest.replaceChildren(
      ...suggest.items.map((item, i) =>
        h(
          'div',
          {
            class: `option${i === suggest.active ? ' active' : ''}`,
            role: 'option',
            onmousedown: (event) => {
              event.preventDefault();
              accept(i);
            },
          },
          [h('span', { class: `label${item.kind === 'prop' ? ' is-prop' : ''}`, text: item.label }), item.hex ? h('span', { class: 'swatch', style: `--swatch:${item.hex}` }) : null, item.detail ? h('span', { class: 'detail', text: item.detail }) : null],
        ),
      ),
    );
    ui.suggest.hidden = false;
  }

  function closeSuggest() {
    ui.suggest.hidden = true;
    suggest.items = [];
    suggest.active = -1;
  }

  function accept(i) {
    const item = suggest.items[i];
    if (!item) return false;
    const input = suggest.input;
    const onPick = suggest.onPick;
    closeSuggest();
    if (onPick && onPick(item)) return true;
    input.value = item.value;
    input.dispatchEvent(new Event('input'));
    input.focus();
    closeSuggest();
    return true;
  }

  function suggestKeys(event) {
    if (ui.suggest.hidden || !suggest.items.length) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      suggest.active = (suggest.active + step + suggest.items.length) % suggest.items.length;
      suggest.navigated = true;
      [...ui.suggest.children].forEach((node, i) => node.classList.toggle('active', i === suggest.active));
      ui.suggest.children[suggest.active].scrollIntoView({ block: 'nearest' });
      return true;
    }
    if (event.key === 'Tab' && suggest.active >= 0) {
      event.preventDefault();
      return accept(suggest.active);
    }
    if (event.key === 'Enter' && suggest.navigated && suggest.active >= 0) {
      event.preventDefault();
      return accept(suggest.active);
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeSuggest();
      return true;
    }
    return false;
  }

  function endEdit() {
    state.editing = Math.max(0, state.editing - 1);
    if (!state.editing && state.renderPending) render();
  }

  function inlineEditor({ anchor, value, provider, onCommit, showOnOpen, commitOnPick, warm }) {
    state.editing++;
    const input = h('input', { class: 'inline-edit', spellcheck: 'false', autocomplete: 'off' });
    input.value = value;
    const size = () => {
      input.style.width = `${Math.max(4, input.value.length + 1)}ch`;
    };
    size();
    anchor.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      closeSuggest();
      if (save && input.value !== value) {
        state.editing--;
        await onCommit(input.value);
        if (!state.editing && state.renderPending) render();
        return;
      }
      if (input.isConnected) input.replaceWith(anchor);
      endEdit();
    };
    const pick = commitOnPick
      ? (item) => {
          input.value = item.value;
          finish(true);
          return true;
        }
      : null;
    input.addEventListener('input', () => {
      size();
      if (provider) openSuggest(input, provider, pick);
    });
    input.addEventListener('keydown', (event) => {
      if (suggestKeys(event)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    input.addEventListener('blur', () => setTimeout(() => finish(true), 120));
    if (provider && showOnOpen) {
      openSuggest(input, provider, pick);
      if (warm)
        warm()
          .then(() => {
            if (!done && suggest.input === input) updateSuggest();
            else if (!done && document.activeElement === input) openSuggest(input, provider, pick);
          })
          .catch(() => undefined);
    }
  }

  function startAdd(line, context) {
    state.editing++;
    const name = h('input', { class: 'inline-edit add-name', spellcheck: 'false', autocomplete: 'off', placeholder: 'property or class' });
    const colon = h('span', { class: 'punct', text: ': ' });
    const value = h('input', { class: 'inline-edit add-value', spellcheck: 'false', autocomplete: 'off', placeholder: 'value' });
    const hint = h('span', { class: 'add-hint' });
    colon.hidden = true;
    value.hidden = true;
    const row = h('div', { class: 'decl adding' }, [h('span', { class: 'tick-space' }), name, colon, value, hint]);
    line.replaceWith(row);
    name.focus();
    let done = false;
    let hintTimer = 0;
    let hintSeq = 0;
    const size = (input) => {
      input.style.width = `${Math.max(input.placeholder.length, input.value.length + 1)}ch`;
    };
    size(name);
    size(value);
    const finish = async (save) => {
      if (done) return;
      done = true;
      clearTimeout(hintTimer);
      closeSuggest();
      const n = name.value.trim();
      const v = value.value.trim();
      state.editing--;
      if (context.rule) {
        if (save && n && v && isCssProperty(n)) await addToRule(context.rule, n, v);
        else if (save && n) toast('Type a property and a value for this rule');
      } else if (save && n && !value.hidden && v) await addFromText(`${n}: ${v}`, context);
      else if (save && n && value.hidden) await addFromText(n, context);
      if (!state.editing) render();
    };
    const toValue = () => {
      const n = name.value.trim().replace(/:$/, '');
      if (!isCssProperty(n)) return false;
      name.value = n;
      size(name);
      colon.hidden = false;
      value.hidden = false;
      closeSuggest();
      value.focus();
      return true;
    };
    const showHint = () => {
      clearTimeout(hintTimer);
      hint.textContent = '';
      const n = name.value.trim();
      const v = value.value.trim();
      if (!n || !v || context.rule) return;
      const mine = ++hintSeq;
      hintTimer = setTimeout(async () => {
        try {
          const items = await toTailwind([{ prop: n, value: v }], context.variants || []);
          if (mine === hintSeq) hint.textContent = `→ ${items.map((item) => item.cls).join(' ')}`;
        } catch (error) {
          hint.textContent = '';
        }
      }, 220);
    };
    const nameItems = (text) => {
      const typed = text.trim().toLowerCase();
      const props = propertyItems(typed);
      const classes = classItems(text);
      const exact = props.filter((item) => item.value === typed);
      const otherProps = props.filter((item) => item.value !== typed).slice(0, 6);
      const prefixed = classes.filter((item) => item.label.toLowerCase().startsWith(typed)).slice(0, 8);
      const loose = classes.filter((item) => !item.label.toLowerCase().startsWith(typed)).slice(0, 4);
      const propsFirst = props.length > 0 && !/[:[\d]/.test(typed);
      return propsFirst ? [...exact, ...otherProps, ...prefixed, ...loose] : [...prefixed, ...exact, ...otherProps, ...loose];
    };
    const pick = (item) => {
      if (item.kind === 'prop') {
        name.value = item.value;
        toValue();
        return true;
      }
      return false;
    };
    name.addEventListener('input', () => {
      size(name);
      const v = name.value;
      if (v.endsWith(':') && isCssProperty(v.slice(0, -1))) {
        toValue();
        return;
      }
      if (looksLikeCss(v)) {
        closeSuggest();
        return;
      }
      openSuggest(name, nameItems, pick);
    });
    name.addEventListener('keydown', (event) => {
      if (suggestKeys(event)) return;
      if (event.key === 'Tab') {
        if (toValue()) event.preventDefault();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const typed = name.value.trim();
        const isClass = state.known.has(typed) || /[:[]|\d/.test(typed);
        if (value.hidden && !isClass && isCssProperty(typed) && !looksLikeCss(typed)) toValue();
        else finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    });
    value.addEventListener('input', () => {
      size(value);
      showHint();
      openSuggest(value, valueItems({ prop: name.value.trim().toLowerCase(), value: '', computed: '', resolved: '' }), (item) => {
        value.value = item.value;
        size(value);
        showHint();
        return true;
      });
    });
    value.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ';') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      } else if (event.key === 'Backspace' && !value.value) {
        event.preventDefault();
        colon.hidden = true;
        value.hidden = true;
        hint.textContent = '';
        name.focus();
      }
    });
    const blurred = () =>
      setTimeout(() => {
        if (!row.contains(document.activeElement)) finish(Boolean(name.value.trim() && (value.hidden || value.value.trim())));
      }, 150);
    name.addEventListener('blur', blurred);
    value.addEventListener('blur', blurred);
  }

  function addLine(context, placeholder) {
    const line = h('div', { class: `add-line${placeholder ? ' with-placeholder' : ''}`, title: 'Click to add a property or a class', role: 'button', tabindex: '0' }, placeholder ? h('span', { class: 'add-placeholder', text: placeholder }) : null);
    line.addEventListener('click', () => startAdd(line, context));
    line.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') startAdd(line, context);
    });
    return line;
  }

  function ruleCss(hit, raw) {
    const decls = hit.decls.filter((d) => !d.internal && d.state !== 'disabled');
    const wrappers = [...hit.rule.media.map((m) => `@media ${m}`), ...hit.rule.supports.map((s) => `@supports ${s}`)];
    const pad = (n) => '  '.repeat(n);
    const out = [];
    wrappers.forEach((w, i) => out.push(`${pad(i)}${w} {`));
    out.push(`${pad(wrappers.length)}${hit.part} {`);
    decls.forEach((d) => out.push(`${pad(wrappers.length + 1)}${d.prop}: ${raw ? d.value : lens.displayValue(d)}${d.important ? ' !important' : ''};`));
    out.push(`${pad(wrappers.length)}}`);
    wrappers.forEach((_, i) => out.push(`${pad(wrappers.length - 1 - i)}}`));
    return out.join('\n') + '\n';
  }

  async function copyRule(entry, hit) {
    const format = ui.copyFormat.value;
    if (format === 'css' || format === 'css-raw') {
      copyText(ruleCss(hit, format === 'css-raw'), 'rule as CSS');
      return;
    }
    let classes = entry.cls && isUtility(entry, hit) ? entry.cls : '';
    if (!classes) {
      const decls = hit.decls.filter((d) => !d.internal && d.state !== 'disabled').map((d) => ({ prop: d.prop, value: d.value, important: d.important }));
      classes = (await toTailwind(decls, entry.variants || [])).map((item) => item.cls).join(' ');
    }
    copyText(format === 'jsx' ? `className="${classes}"` : classes, format === 'jsx' ? 'className' : classes);
  }

  function copyElement() {
    if (!state.view) return;
    const format = ui.copyFormat.value;
    const classes = liveClasses().join(' ');
    if (format === 'tailwind') copyText(classes, 'classes');
    else if (format === 'jsx') copyText(`className="${classes}"`, 'className');
    else copyText(lens.toCss(state.view, { raw: format === 'css-raw' }), 'CSS');
  }

  function declLine({ entry, hit, d, query, mode }) {
    const shown = mode === 'inline' ? d.value : lens.displayValue(d);
    const hex = lens.toHex(mode === 'inline' ? lens.displayValue(d) : shown) || lens.toHex(shown);
    const token = mode === 'inline' ? null : lens.tokenOf(d);
    const titleParts = [`${d.prop}: ${d.value}${d.important ? ' !important' : ''}`];
    if (d.resolved && d.resolved !== d.value) titleParts.push(`= ${d.resolved}`);
    if (d.computed && d.computed !== d.resolved) titleParts.push(`→ ${d.computed}`);
    if (d.lostTo && d.state === 'overridden') titleParts.push(`Overridden by ${[...d.lostTo].join(', ')}`);
    if (d.elsewhere) titleParts.push(`Another rule wins on the element: ${d.elsewhere.join('; ')}`);
    if (d.state === 'disabled') titleParts.push(mode === 'inline' ? 'Turned off' : 'Turned off in the stylesheet');
    const editable = mode !== 'readonly' && d.state !== 'disabled';
    const classes = ['decl', d.state, d.valid === false ? 'invalid' : ''].filter(Boolean).join(' ');
    const propNode = h('span', { class: `prop${editable ? ' editable' : ''}` }, marked(d.prop, query));
    const valueNode = h('span', { class: `val${editable ? ' editable' : ''}` }, marked(shown, query));
    const commit = (change) => {
      if (mode === 'utility') return editDecl(entry, d, change);
      if (mode === 'rule') return editRule(hit, d, change);
      if (mode === 'inline') {
        const prop = change.prop.trim().toLowerCase();
        const value = change.value.trim().replace(/;$/, '');
        if (!value || !prop) return changeInline('remove', { prop: d.prop });
        return changeInline('set', { prop: d.prop, newProp: prop, value });
      }
      return null;
    };
    if (editable) {
      propNode.addEventListener('click', () => inlineEditor({ anchor: propNode, value: d.prop, provider: propertyItems, onCommit: (text) => commit({ prop: text, value: shown }) }));
      valueNode.addEventListener('click', () =>
        inlineEditor({
          anchor: valueNode,
          value: shown,
          provider: valueItems(d),
          showOnOpen: true,
          commitOnPick: true,
          warm: ensureTokens,
          onCommit: (text) => commit({ prop: d.prop, value: text }),
        }),
      );
    }
    let tick = h('span', { class: 'tick-space' });
    if (mode === 'utility' || mode === 'rule') {
      tick = h('input', {
        type: 'checkbox',
        class: 'tick',
        checked: d.state !== 'disabled',
        title: d.state === 'disabled' ? 'Turn back on' : mode === 'utility' ? 'Turn off in the stylesheet (every element with this class)' : 'Turn off in this rule',
        'aria-label': `Turn ${d.prop} ${d.state === 'disabled' ? 'on' : 'off'}`,
        onchange: (event) => toggleDecl(entry, hit, d, event.target.checked),
      });
    } else if (mode === 'inline') {
      tick = h('input', {
        type: 'checkbox',
        class: 'tick',
        checked: d.state !== 'disabled',
        title: d.state === 'disabled' ? 'Turn back on' : 'Turn off',
        'aria-label': `Turn ${d.prop} ${d.state === 'disabled' ? 'on' : 'off'}`,
        onchange: (event) => changeInline(event.target.checked ? 'on' : 'off', { prop: d.prop }),
      });
    }
    return h('div', { class: classes, title: titleParts.join('\n') }, [
      tick,
      propNode,
      h('span', { class: 'punct', text: ': ' }),
      hex ? h('span', { class: 'swatch', style: `--swatch:${hex}` }) : null,
      valueNode,
      d.important ? h('span', { class: 'imp', text: ' !important' }) : null,
      h('span', { class: 'punct', text: ';' }),
      token ? h('span', { class: 'token', text: token }) : null,
      d.state === 'overridden' ? h('span', { class: 'by', text: `↳ ${[...d.lostTo].join(', ')}` }) : null,
      d.elsewhere && d.state === 'applied' ? h('span', { class: 'warn-dot', title: `Another rule wins: ${d.elsewhere.join('; ')}`, text: '!' }) : null,
      mode === 'inline' && d.state !== 'disabled' ? h('button', { type: 'button', class: 'mini to-class', title: 'Move this to a Tailwind class', text: '→ class', onclick: () => inlineToClass(d) }) : null,
    ]);
  }

  function ruleView({ entry, hit }, query) {
    const preview = state.view.info.previews.includes(entry.cls);
    const conditions = [
      ...hit.rule.media.map((m, k) => {
        const px = lens.prettyMedia(m, state.view.res.rootPx).match(/= ([\d.]+px)/);
        return { text: `@media ${m}`, note: px ? px[1] : '', met: state.view.res.media[hit.mediaIdx[k]] };
      }),
      ...hit.rule.supports.map((s) => ({ text: `@supports ${s}` })),
      ...hit.rule.container.map((q) => ({ text: `@container ${q}` })),
      ...(hit.rule.starting ? [{ text: '@starting-style' }] : []),
    ];
    const reasons = hit.reasons.filter((r) => r === 'selector not supported');
    const utility = isUtility(entry, hit);
    const single = singleClass(entry, hit);
    const selector = h('span', { class: `selector${single ? ' editable' : ''}`, title: single ? `${entry.cls}\nClick to rename the class, clear it to remove` : hit.part }, marked(lens.prettySelector(hit.part), query));
    if (single) selector.addEventListener('click', () => inlineEditor({ anchor: selector, value: entry.cls, provider: classItems, onCommit: (text) => renameClass(entry, text) }));
    const decls = hit.decls.filter((d) => !d.internal);
    const source = preview ? 'preview' : hit.rule.layer || hit.rule.source || '';
    const mode = utility ? 'utility' : 'rule';
    return h('section', { class: `rule${hit.active ? '' : ' inactive'}${entry.off ? ' off' : ''}${preview ? ' preview' : ''}${utility ? '' : ' custom'}` }, [
      ...conditions.map((c) => h('div', { class: `cond${c.met === false ? ' unmet' : ''}` }, [c.text, c.note ? h('span', { class: 'cond-note', text: ` ${c.note}` }) : null])),
      h('div', { class: 'sel-line' }, [
        single
          ? h('input', {
              type: 'checkbox',
              class: 'tick',
              checked: !entry.off,
              title: entry.off ? 'Put this class back on the element' : 'Take this class off the element',
              'aria-label': `Turn class ${entry.cls} ${entry.off ? 'on' : 'off'}`,
              onchange: (event) => setOff([entry.cls], !event.target.checked),
            })
          : h('span', { class: 'tick-space' }),
        selector,
        h('span', { class: 'punct', text: ' {' }),
        reasons.length && !hit.active ? h('span', { class: 'why', text: reasons.join(' · ') }) : null,
        h('span', { class: 'source', text: source, title: source === 'preview' ? 'Not in your build yet. Tailwind generates it once the class is in your code.' : hit.rule.layer ? `@layer ${hit.rule.layer}` : source }),
        h('button', { type: 'button', class: 'mini', title: `Copy as ${ui.copyFormat.selectedOptions[0].textContent}`, 'aria-label': 'Copy this rule', text: '⧉', onclick: () => copyRule(entry, hit) }),
      ]),
      ...decls.map((d) => declLine({ entry, hit, d, query, mode })),
      decls.length === 0 && hit.decls.length ? h('div', { class: 'decl muted' }, [h('span', { class: 'tick-space' }), `${hit.decls.length} Tailwind variable${hit.decls.length > 1 ? 's' : ''}`]) : null,
      addLine(utility ? { variants: entry.variants, after: entry.cls } : { rule: hit }),
      h('div', { class: 'close', text: '}' }),
    ]);
  }

  function elementRuleView(inline, inlineOff, query) {
    const lines = [
      ...inline.map((d) => ({ ...d, state: 'applied', resolved: d.value, computed: '', valid: true })),
      ...inlineOff.map((d) => ({ prop: d.prop, value: d.value, important: d.important, state: 'disabled', resolved: d.value, computed: '', valid: true })),
    ];
    return h('section', { class: 'rule element-rule' }, [
      h('div', { class: 'sel-line' }, [
        h('span', { class: 'tick-space' }),
        h('span', { class: 'selector', text: 'element.style' }),
        h('span', { class: 'punct', text: ' {' }),
        h('span', { class: 'source', text: inline.length ? 'style attribute' : 'adds Tailwind classes' }),
        inline.length ? h('button', { type: 'button', class: 'mini to-class', title: 'Move every inline style to Tailwind classes', text: '→ classes', onclick: () => inlineAllToClasses(inline) }) : null,
      ]),
      ...lines.map((d) => declLine({ entry: null, hit: null, d, query, mode: 'inline' })),
      addLine({ variants: [], after: null }, 'click to add a property or class'),
      h('div', { class: 'close', text: '}' }),
    ]);
  }

  async function inlineAllToClasses(inline) {
    const items = await toTailwind(inline.map((d) => ({ prop: d.prop, value: d.value, important: d.important })), []);
    for (const d of inline) await evalPage(pageInline, { action: 'remove', prop: d.prop }).catch(() => false);
    await addFromText(items.map((item) => item.cls).join(' '));
  }

  function nocssView(entry, query) {
    const name = h('span', { class: 'selector editable', title: 'Click to rename, clear to remove' }, marked(`.${entry.cls}`, query));
    name.addEventListener('click', () => inlineEditor({ anchor: name, value: entry.cls, provider: classItems, onCommit: (text) => renameClass(entry, text) }));
    const note = entry.markers ? `used by ${entry.markers} rule${entry.markers > 1 ? 's' : ''} for other elements, e.g. ${entry.markerExample}` : 'no CSS: a JS hook, a typo, or not generated';
    return h('div', { class: `nocss-row${entry.off ? ' off' : ''}` }, [
      h('input', { type: 'checkbox', class: 'tick', checked: !entry.off, 'aria-label': `Turn class ${entry.cls} ${entry.off ? 'on' : 'off'}`, onchange: (event) => setOff([entry.cls], !event.target.checked) }),
      name,
      h('span', { class: 'why', text: note }),
    ]);
  }

  function relatedView({ entry, rel }, query) {
    const decls = rel.decls.filter((d) => !d.internal);
    return h('section', { class: 'rule related' }, [
      ...rel.rule.media.map((m) => h('div', { class: 'cond', text: `@media ${m}` })),
      h('div', { class: 'sel-line' }, [h('span', { class: 'tick-space' }), h('span', { class: 'selector' }, marked(lens.prettySelector(rel.part), query)), h('span', { class: 'punct', text: ' {' }), h('span', { class: 'source', text: entry.cls })]),
      ...decls.map((d) => declLine({ entry: null, hit: null, d, query, mode: 'readonly' })),
      h('div', { class: 'close', text: '}' }),
    ]);
  }

  function matchesFilter(entry, query) {
    if (!query) return true;
    if ((entry.cls || '').toLowerCase().includes(query)) return true;
    return entry.hits.concat(entry.related).some((rule) => (rule.decls || []).some((d) => d.prop.toLowerCase().includes(query) || lens.displayValue(d).toLowerCase().includes(query)));
  }

  function render() {
    if (state.editing) {
      state.renderPending = true;
      return;
    }
    state.renderPending = false;
    const view = state.view;
    if (!view) return;
    const { info, entries, inline } = view;
    const query = ui.filter.value.trim().toLowerCase();
    const show = ui.show.value;
    ui.target.textContent = `${info.tag}${info.id ? '#' + info.id : ''}`;
    const active = entries.filter((entry) => entry.status === 'active').length;
    ui.summary.textContent = `${info.classes.length} class${info.classes.length === 1 ? '' : 'es'} · ${active} active`;
    ui.reset.hidden = !info.edited;

    const main = [];
    const pseudo = [];
    const later = [];
    const related = [];
    const nocss = [];
    for (const entry of entries) {
      if (!matchesFilter(entry, query)) continue;
      if (!entry.hits.length && !entry.related.length) nocss.push(entry);
      for (const hit of entry.hits) {
        const onlyOff = entry.off && hit.reasons.length === 1;
        const item = { entry, hit };
        if (hit.pseudo) pseudo.push(item);
        else if (hit.active || onlyOff) main.push(item);
        else later.push(item);
      }
      for (const rel of entry.related) related.push({ entry, rel });
    }
    const seen = new Set();
    const unique = (list) =>
      list.filter(({ hit }) => {
        const key = `${hit.rule.id}|${hit.part}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    const byCascade = (a, b) => lens.compareKeys(b.hit.cascade, a.hit.cascade);
    main.sort(byCascade);
    pseudo.sort(byCascade);
    later.sort(byCascade);
    main.splice(0, main.length, ...unique(main));
    pseudo.splice(0, pseudo.length, ...unique(pseudo));
    later.splice(0, later.length, ...unique(later));
    const hasOverride = ({ hit }) => hit.decls.some((d) => d.state === 'overridden');
    const keepOff = ({ entry, hit }) => Boolean(entry.off) || hit.decls.some((d) => d.state === 'disabled');
    const pick =
      {
        all: { main, pseudo, later, related, nocss },
        now: { main: main.filter((x) => x.hit.active || keepOff(x)), pseudo: pseudo.filter((x) => x.hit.active), later: later.filter(keepOff), related: [], nocss: nocss.filter((e) => e.off) },
        later: { main: main.filter(keepOff), pseudo: pseudo.filter((x) => !x.hit.active), later, related: [], nocss: nocss.filter((e) => e.off) },
        overridden: { main: main.filter((x) => hasOverride(x) || keepOff(x)), pseudo: [], later: later.filter(keepOff), related: [], nocss: nocss.filter((e) => e.off) },
        nocss: { main: main.filter(keepOff), pseudo: [], later: [], related: [], nocss },
      }[show] || { main, pseudo, later, related, nocss };

    const out = [elementRuleView(inline, info.inlineOff || [], query)];
    out.push(...pick.main.map((item) => ruleView(item, query)));
    if (pick.pseudo.length) out.push(h('div', { class: 'section-title', text: 'Pseudo-elements' }), ...pick.pseudo.map((item) => ruleView(item, query)));
    if (pick.later.length) out.push(h('div', { class: 'section-title', text: 'Not applied now · other states and screen sizes' }), ...pick.later.map((item) => ruleView(item, query)));
    if (pick.related.length) out.push(h('div', { class: 'section-title', text: 'Styles other elements' }), ...pick.related.map((item) => relatedView(item, query)));
    if (pick.nocss.length) out.push(h('div', { class: 'section-title', text: 'Classes without CSS' }), ...pick.nocss.map((entry) => nocssView(entry, query)));
    if (out.length === 1 && (query || show !== 'all')) out.push(h('p', { class: 'empty', text: 'Nothing matches.' }));
    ui.list.replaceChildren(...out);
  }

  function setTab(tab) {
    state.tab = tab;
    ui.tabStyles.setAttribute('aria-selected', String(tab === 'styles'));
    ui.tabConvert.setAttribute('aria-selected', String(tab === 'convert'));
    ui.stylesView.hidden = tab !== 'styles';
    ui.styleTools.hidden = tab !== 'styles';
    ui.convertView.hidden = tab !== 'convert';
    if (tab === 'convert') runConvert();
  }

  const SAMPLES = {
    css: 'padding: 16px 24px;\nbackground-color: #fafafa;\nborder: 1px solid #e3e3e3;\nborder-radius: 8px;\n\n@media (min-width: 768px) {\n  .x { padding: 32px; }\n}\n.x:hover { background-color: #000; color: #fff; }',
    tw: 'flex items-center gap-6 p-4 md:p-8 bg-white hover:bg-gray-50',
  };

  let convertTimer = 0;
  async function runConvert() {
    const text = ui.convertInput.value.trim();
    ui.convertInput.placeholder = SAMPLES[state.convertDir];
    if (!text) {
      ui.convertOutput.replaceChildren(h('p', { class: 'empty', text: state.convertDir === 'css' ? 'Paste CSS (declarations, rules, @media blocks). Your project classes are used when they match.' : 'Paste Tailwind classes to see the CSS they produce.' }));
      state.convertResult = null;
      ui.convertApply.hidden = true;
      return;
    }
    if (!state.index) return;
    try {
      if (state.convertDir === 'css') {
        const items = [];
        for (const group of tw.cssToTailwind(text, state.tw)) items.push(...(await toTailwind(group.decls, group.variants)));
        const picks = items.map((item) => ({ item, at: 0 }));
        const sync = () => {
          const classes = picks.map((p) => p.item.options[p.at] || p.item.cls);
          state.convertResult = { text: classes.join(' '), classes };
        };
        sync();
        ui.convertApply.hidden = !state.view;
        const label = { build: 'From your CSS', scale: 'Tailwind scale', arbitrary: 'Arbitrary value' };
        ui.convertOutput.replaceChildren(
          h(
            'div',
            { class: 'result-classes' },
            picks.map((p) => {
              const { item } = p;
              const more = item.options.length > 1;
              const node = h('code', {
                class: `out ${item.source}${more ? ' cycle' : ''}`,
                title: `${item.from.prop}: ${item.from.value}\n${label[item.source]}${more ? `\nClick for other matches: ${item.options.join(', ')}` : ''}`,
                text: item.cls + (more ? ` +${item.options.length - 1}` : ''),
              });
              if (more) {
                node.addEventListener('click', () => {
                  p.at = (p.at + 1) % item.options.length;
                  node.textContent = `${item.options[p.at]} ${p.at + 1}/${item.options.length}`;
                  sync();
                });
              }
              return node;
            }),
          ),
          h('div', { class: 'legend' }, [h('span', { class: 'out build', text: 'your CSS' }), h('span', { class: 'out scale', text: 'Tailwind scale' }), h('span', { class: 'out arbitrary', text: 'arbitrary' })]),
        );
      } else {
        const entries = lens.matchClasses(state.index, splitClasses(text));
        const blocks = [];
        const pending = [];
        for (const entry of entries) {
          if (entry.hits.length) {
            for (const hit of entry.hits) {
              const decls = hit.rule.decls.filter((d) => !d.prop.startsWith('--tw-'));
              blocks.push({ wrappers: [...hit.rule.media.map((m) => `@media ${m}`), ...hit.rule.supports.map((x) => `@supports ${x}`)], selector: hit.part, decls });
              pending.push(...decls);
            }
          } else {
            const css = tw.classToCss(entry.cls, state.tw);
            blocks.push({ comment: css ? `/* ${entry.cls}: not in your build, generated */` : `/* ${entry.cls}: unknown class */`, raw: css || '' });
          }
        }
        const res = pending.length ? await evalPage(pageEvaluate, { selectors: [], media: [], supports: [], decls: pending.map((d) => ({ prop: d.prop, value: d.value })), props: [] }) : null;
        let k = 0;
        const chunks = blocks.map((block) => {
          if (block.comment) return block.raw ? `${block.comment}\n${block.raw}` : block.comment;
          const body = block.decls.map((d) => {
            const r = res ? res.decls[k++] : null;
            const shown = r ? lens.displayValue({ ...d, resolved: r.resolved, computed: r.computed }) : d.value;
            return `  ${d.prop}: ${shown}${d.important ? ' !important' : ''};`;
          });
          let css = `${block.selector} {\n${body.join('\n')}\n}`;
          for (const w of [...block.wrappers].reverse()) css = `${w} {\n${css.replace(/^/gm, '  ')}\n}`;
          return css;
        });
        state.convertResult = { text: chunks.join('\n\n') };
        ui.convertApply.hidden = !state.view;
        ui.convertOutput.replaceChildren(h('pre', { class: 'css-out', text: state.convertResult.text }));
      }
    } catch (error) {
      ui.convertOutput.replaceChildren(h('p', { class: 'note warn', text: `Could not convert: ${error.message}` }));
    }
  }

  ui.tabStyles.addEventListener('click', () => setTab('styles'));
  ui.tabConvert.addEventListener('click', () => setTab('convert'));
  ui.convertView.querySelectorAll('[data-dir]').forEach((button) =>
    button.addEventListener('click', () => {
      state.convertDir = button.dataset.dir;
      ui.convertView.querySelectorAll('[data-dir]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      ui.convertApply.textContent = state.convertDir === 'css' ? 'Add to element' : 'Add classes to element';
      runConvert();
    }),
  );
  ui.convertInput.addEventListener('input', () => {
    clearTimeout(convertTimer);
    convertTimer = setTimeout(runConvert, 250);
  });
  ui.fromElement.addEventListener('click', () => {
    if (!state.view) return;
    ui.convertInput.value = state.convertDir === 'css' ? lens.toCss(state.view) : liveClasses().join(' ');
    runConvert();
  });
  ui.convertCopy.addEventListener('click', () => {
    if (state.convertResult) copyText(state.convertResult.text, state.convertDir === 'css' ? 'Tailwind classes' : 'CSS');
  });
  ui.convertApply.addEventListener('click', async () => {
    if (!state.view) return;
    const classes = state.convertDir === 'css' ? (state.convertResult ? state.convertResult.classes : []) : splitClasses(ui.convertInput.value);
    if (classes.length) await addFromText(classes.join(' '));
  });

  ui.copyAll.addEventListener('click', copyElement);
  ui.copyFormat.addEventListener('change', () => {
    writeSetting('classLens.format', ui.copyFormat.value);
    render();
  });
  ui.show.addEventListener('change', () => {
    writeSetting('classLens.show', ui.show.value);
    render();
  });
  ui.refresh.addEventListener('click', () => {
    state.sig = null;
    refresh();
  });
  ui.reset.addEventListener('click', async () => {
    await evalPage(pageReset).catch(() => false);
    toast('Classes put back');
    refresh();
  });
  function setFilterOpen(open) {
    state.filterOpen = open;
    ui.filterWrap.classList.toggle('open', open);
    ui.filterToggle.setAttribute('aria-expanded', String(open));
    ui.filterToggle.classList.toggle('on', open);
    ui.filter.tabIndex = open ? 0 : -1;
    ui.filterClose.tabIndex = open ? 0 : -1;
    if (open) {
      requestAnimationFrame(() => ui.filter.focus({ preventScroll: true }));
    } else {
      if (ui.filter.value) {
        ui.filter.value = '';
        render();
      }
      ui.filterToggle.focus({ preventScroll: true });
    }
  }

  ui.filterToggle.addEventListener('click', () => setFilterOpen(!state.filterOpen));
  ui.filterClose.addEventListener('click', () => setFilterOpen(false));
  ui.filter.addEventListener('input', render);
  ui.filter.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setFilterOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !event.target.closest('input, textarea, select')) {
      event.preventDefault();
      if (state.tab !== 'styles') setTab('styles');
      if (!state.filterOpen) setFilterOpen(true);
      else ui.filter.focus();
    }
  });
  window.addEventListener('resize', closeSuggest);
  window.addEventListener('scroll', closeSuggest, true);

  chrome.devtools.panels.elements.onSelectionChanged.addListener(refresh);
  if (chrome.devtools.network && chrome.devtools.network.onNavigated) {
    chrome.devtools.network.onNavigated.addListener(() => {
      state.sig = null;
      state.index = null;
      setTimeout(refresh, 300);
    });
  }

  setInterval(async () => {
    if (document.hidden || !state.view || state.editing) return;
    try {
      const now = await evalPage(pageWatch);
      const before = state.watch || { key: '', look: 0 };
      if (now.key !== before.key) refresh();
      else if (now.look !== before.look) {
        state.forceIndex = true;
        refresh();
      }
    } catch (error) {
      return;
    }
  }, 1200);

  refresh();
})();

'use strict';

(function () {
  const IDENT_CHAR = /[\w\- -￿]/;
  const HEX = /[0-9a-fA-F]/;
  const SPACE = /[ \t\n\r\f]/;
  const CLASS_TOKEN = /\.((?:\\[0-9a-fA-F]{1,6}[ \t\n\r\f]?|\\.|[\w\- -￿])+)/g;
  const LEGACY_PSEUDO_ELEMENTS = ['before', 'after', 'first-line', 'first-letter'];
  const STABLE_PROPS = /^(color|background-color|border-(top|right|bottom|left)-color|outline-color|display|position|visibility|opacity|z-index|font-weight|font-style|font-size|text-align|text-transform|flex-direction|flex-wrap|align-items|align-self|justify-content|padding-(top|right|bottom|left)|border-(top|right|bottom|left)-width|border-(top|right|bottom|left)-style|(row|column)-gap|overflow-[xy]|cursor|pointer-events|white-space|box-sizing)$/;

  function skipEscape(text, i) {
    let j = i + 1;
    if (j >= text.length) return j;
    if (HEX.test(text[j])) {
      let count = 0;
      while (count < 6 && j < text.length && HEX.test(text[j])) {
        j++;
        count++;
      }
      if (j < text.length && SPACE.test(text[j])) j++;
      return j;
    }
    return j + 1;
  }

  function splitTop(text, separator) {
    const out = [];
    let depth = 0;
    let quote = null;
    let start = 0;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '\\') {
        i = skipEscape(text, i);
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
      else if (ch === separator && depth === 0) {
        out.push(text.slice(start, i));
        start = i + 1;
      }
      i++;
    }
    out.push(text.slice(start));
    return out.map((part) => part.trim()).filter(Boolean);
  }

  function splitCompounds(selector) {
    const out = [];
    let depth = 0;
    let quote = null;
    let current = '';
    let i = 0;
    const push = () => {
      if (current.trim()) out.push(current.trim());
      current = '';
    };
    while (i < selector.length) {
      const ch = selector[i];
      if (ch === '\\') {
        const j = skipEscape(selector, i);
        current += selector.slice(i, j);
        i = j;
        continue;
      }
      if (quote) {
        if (ch === quote) quote = null;
        current += ch;
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      if (depth === 0 && (ch === '>' || ch === '+' || ch === '~' || SPACE.test(ch))) {
        push();
        i++;
        continue;
      }
      current += ch;
      i++;
    }
    push();
    return out;
  }

  function stripParens(text) {
    let out = '';
    let depth = 0;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (ch === '\\') {
        const j = skipEscape(text, i);
        if (depth === 0) out += text.slice(i, j);
        i = j;
        continue;
      }
      if (ch === '(') {
        if (depth === 0) out += '(';
        depth++;
      } else if (ch === ')') {
        depth--;
        if (depth === 0) out += ')';
      } else if (depth === 0) out += ch;
      i++;
    }
    return out;
  }

  function containsToken(text, token) {
    let at = text.indexOf(token);
    while (at !== -1) {
      const next = text[at + token.length];
      if (next === undefined || !(IDENT_CHAR.test(next) || next === '\\')) return true;
      at = text.indexOf(token, at + 1);
    }
    return false;
  }

  function unescapeIdent(text) {
    return text.replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?|\\(.)/g, (_, hex, ch) =>
      hex ? String.fromCodePoint(parseInt(hex, 16)) : ch,
    );
  }

  function prettySelector(selector) {
    return selector.replace(CLASS_TOKEN, (_, name) => '.' + unescapeIdent(name)).trim();
  }

  function stripPseudoElements(selector) {
    let pseudo = null;
    const keep = (match) => {
      pseudo = pseudo || match;
      return '';
    };
    const base = selector
      .replace(/(?<!\\)::[\w-]+(\((?:[^()]|\([^()]*\))*\))?/g, keep)
      .replace(/(?<!\\|:):(before|after|first-line|first-letter)(?![\w-])/gi, keep)
      .trim();
    const cleaned = base.replace(/[>+~]\s*$/, '').trim();
    return { base: cleaned === '' ? '*' : cleaned, pseudo };
  }

  function replaceNesting(selector, parent) {
    let out = '';
    let found = false;
    let i = 0;
    while (i < selector.length) {
      const ch = selector[i];
      if (ch === '\\') {
        const j = skipEscape(selector, i);
        out += selector.slice(i, j);
        i = j;
        continue;
      }
      if (ch === '&') {
        out += parent;
        found = true;
      } else out += ch;
      i++;
    }
    return { out, found };
  }

  function resolveNested(child, parent) {
    if (!parent) return child;
    const parents = splitTop(parent, ',');
    const scope = parents.length === 1 ? parents[0] : `:is(${parents.join(', ')})`;
    return splitTop(child, ',')
      .map((part) => {
        const { out, found } = replaceNesting(part, scope);
        return found ? out : `${scope} ${part}`;
      })
      .join(', ');
  }

  function specificity(selector) {
    let a = 0;
    let b = 0;
    let c = 0;
    let i = 0;
    const n = selector.length;
    const readIdent = () => {
      const start = i;
      while (i < n) {
        const ch = selector[i];
        if (ch === '\\') i = skipEscape(selector, i);
        else if (IDENT_CHAR.test(ch)) i++;
        else break;
      }
      return selector.slice(start, i);
    };
    const readGroup = (open, close) => {
      const start = i + 1;
      let depth = 0;
      let quote = null;
      while (i < n) {
        const ch = selector[i];
        if (ch === '\\') {
          i = skipEscape(selector, i);
          continue;
        }
        if (quote) {
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === open) depth++;
        else if (ch === close) {
          depth--;
          if (depth === 0) {
            i++;
            return selector.slice(start, i - 1);
          }
        }
        i++;
      }
      return selector.slice(start);
    };
    const addMax = (list) => {
      let best = [0, 0, 0];
      for (const part of splitTop(list, ',')) {
        const s = specificity(part);
        if (compareKeys(s, best) > 0) best = s;
      }
      a += best[0];
      b += best[1];
      c += best[2];
    };
    while (i < n) {
      const ch = selector[i];
      if (ch === '#') {
        i++;
        readIdent();
        a++;
      } else if (ch === '.') {
        i++;
        readIdent();
        b++;
      } else if (ch === '[') {
        readGroup('[', ']');
        b++;
      } else if (ch === ':') {
        if (selector[i + 1] === ':') {
          i += 2;
          readIdent();
          if (selector[i] === '(') readGroup('(', ')');
          c++;
        } else {
          i++;
          const name = readIdent().toLowerCase();
          if (selector[i] === '(') {
            const inner = readGroup('(', ')');
            if (name === 'where') continue;
            if (name === 'is' || name === 'not' || name === 'has' || name === 'matches') addMax(inner);
            else if (name === 'nth-child' || name === 'nth-last-child') {
              b++;
              const of = inner.match(/\bof\b([\s\S]*)$/);
              if (of) addMax(of[1]);
            } else b++;
          } else if (LEGACY_PSEUDO_ELEMENTS.includes(name)) c++;
          else b++;
        }
      } else if (ch === '\\' || IDENT_CHAR.test(ch)) {
        readIdent();
        c++;
      } else i++;
    }
    return [a, b, c];
  }

  function compareKeys(x, y) {
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d !== 0) return d;
    }
    return 0;
  }

  function parseDecls(cssText) {
    return splitTop(cssText || '', ';')
      .map((chunk) => {
        const colon = chunk.indexOf(':');
        if (colon === -1) return null;
        const prop = chunk.slice(0, colon).trim();
        let value = chunk.slice(colon + 1).trim();
        const important = /!\s*important\s*$/i.test(value);
        if (important) value = value.replace(/!\s*important\s*$/i, '').trim();
        return prop ? { prop, value, important } : null;
      })
      .filter(Boolean);
  }

  function buildIndex(texts) {
    const rules = [];
    const layers = [];
    const classNames = new Set();
    const noteLayer = (name) => {
      if (!layers.includes(name)) layers.push(name);
    };
    const add = (selector, cssText, ctx) => {
      const decls = parseDecls(cssText);
      if (!decls.length) return;
      rules.push({
        id: rules.length,
        selector,
        parts: splitTop(selector, ','),
        decls,
        media: ctx.media,
        supports: ctx.supports,
        container: ctx.container,
        layer: ctx.layer,
        starting: ctx.starting,
        source: ctx.source,
        kind: ctx.kind,
      });
      for (const match of selector.matchAll(CLASS_TOKEN)) classNames.add(unescapeIdent(match[1]));
    };
    const visit = (list, ctx) => {
      for (const rule of list) {
        const kind = rule.constructor.name;
        if (kind === 'CSSStyleRule') {
          const selector = resolveNested(rule.selectorText, ctx.parent);
          add(selector, rule.style.cssText, ctx);
          if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules, { ...ctx, parent: selector });
        } else if (kind === 'CSSNestedDeclarations') {
          if (ctx.parent) add(ctx.parent, rule.style.cssText, ctx);
        } else if (kind === 'CSSMediaRule') {
          visit(rule.cssRules, { ...ctx, media: [...ctx.media, rule.media.mediaText] });
        } else if (kind === 'CSSSupportsRule') {
          visit(rule.cssRules, { ...ctx, supports: [...ctx.supports, rule.conditionText] });
        } else if (kind === 'CSSContainerRule') {
          visit(rule.cssRules, { ...ctx, container: [...ctx.container, rule.conditionText] });
        } else if (kind === 'CSSLayerBlockRule') {
          const name = [ctx.layer, rule.name || '(anonymous)'].filter(Boolean).join('.');
          noteLayer(name);
          visit(rule.cssRules, { ...ctx, layer: name });
        } else if (kind === 'CSSLayerStatementRule') {
          rule.nameList.forEach((name) => noteLayer([ctx.layer, name].filter(Boolean).join('.')));
        } else if (kind === 'CSSStartingStyleRule') {
          visit(rule.cssRules, { ...ctx, starting: true });
        } else if (kind !== 'CSSKeyframesRule' && rule.cssRules) {
          visit(rule.cssRules, ctx);
        }
      }
    };
    for (const item of texts) {
      const { text, source = '', kind = 'cssom' } = typeof item === 'string' ? { text: item } : item;
      if (!text) continue;
      const sheet = new CSSStyleSheet();
      try {
        sheet.replaceSync(text);
      } catch (error) {
        continue;
      }
      visit(sheet.cssRules, { media: [], supports: [], container: [], layer: '', starting: false, parent: '', source, kind });
    }
    return { rules, layers, classNames: [...classNames].sort() };
  }

  function variantsOf(cls) {
    const variants = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < cls.length; i++) {
      const ch = cls[i];
      if (ch === '[' || ch === '(') depth++;
      else if (ch === ']' || ch === ')') depth--;
      else if (ch === ':' && depth === 0) {
        variants.push(cls.slice(start, i));
        start = i + 1;
      }
    }
    return { variants, utility: cls.slice(start) };
  }

  function matchClasses(index, classes) {
    return classes.map((cls) => {
      const token = '.' + CSS.escape(cls);
      const { variants, utility } = variantsOf(cls);
      const hits = [];
      const related = [];
      let markers = 0;
      let markerExample = '';
      for (const rule of index.rules) {
        if (!rule.selector.includes(token)) continue;
        let onSubject = false;
        for (const part of rule.parts) {
          if (!containsToken(part, token)) continue;
          const compounds = splitCompounds(part);
          const last = compounds[compounds.length - 1] || '';
          if (containsToken(stripParens(last), token)) {
            if (!onSubject) {
              const { base, pseudo } = stripPseudoElements(part);
              hits.push({ rule, part, base, pseudo, spec: specificity(part) });
              onSubject = true;
            }
          } else if (variants.length) {
            const at = compounds.findIndex((compound) => containsToken(compound, token));
            related.push({ rule, part, target: compounds.slice(at + 1).join(' ') });
          } else {
            markers++;
            if (!markerExample) markerExample = prettySelector(part);
          }
        }
      }
      return { cls, variants, utility, hits, related, markers, markerExample };
    });
  }

  const scratch = typeof document === 'undefined' ? null : document.createElement('div').style;
  const longhandCache = new Map();
  function longhandsOf(prop) {
    if (prop.startsWith('--') || !scratch) return [prop];
    if (longhandCache.has(prop)) return longhandCache.get(prop);
    scratch.cssText = '';
    scratch.setProperty(prop, 'initial');
    const list = scratch.length ? Array.from(scratch) : [prop];
    longhandCache.set(prop, list);
    return list;
  }

  function buildRequest(entries) {
    const selectors = new Map();
    const media = new Map();
    const supports = new Map();
    const decls = new Map();
    const props = new Set();
    const slot = (map, key) => {
      if (!map.has(key)) map.set(key, map.size);
      return map.get(key);
    };
    const declSlot = (d) => slot(decls, d.prop + '\u0000' + d.value);
    for (const entry of entries) {
      for (const hit of entry.hits) {
        hit.selIdx = slot(selectors, hit.base);
        hit.mediaIdx = hit.rule.media.map((m) => slot(media, m));
        hit.supportsIdx = hit.rule.supports.map((s) => slot(supports, s));
        hit.declIdx = hit.rule.decls.map(declSlot);
        hit.rule.decls.forEach((d) => longhandsOf(d.prop).forEach((l) => props.add(l)));
      }
      for (const rel of entry.related) rel.declIdx = rel.rule.decls.map(declSlot);
    }
    return {
      selectors: [...selectors.keys()],
      media: [...media.keys()],
      supports: [...supports.keys()],
      decls: [...decls.keys()].map((key) => {
        const [prop, value] = key.split('\u0000');
        return { prop, value };
      }),
      props: [...props],
    };
  }

  function prettyMedia(media, rootPx) {
    const px = (n, unit) => (unit === 'rem' || unit === 'em' ? ` = ${+(n * (rootPx || 16)).toFixed(2)}px` : '');
    const ops = { '>=': '≥', '<=': '≤', '>': '>', '<': '<' };
    return media
      .replace(/\(\s*(min|max)-width\s*:\s*([\d.]+)(px|rem|em)\s*\)/g, (_, kind, n, unit) => `width ${kind === 'min' ? '≥' : '≤'} ${n}${unit}${px(+n, unit)}`)
      .replace(/\(\s*width\s*(>=|<=|>|<)\s*([\d.]+)(px|rem|em)\s*\)/g, (_, op, n, unit) => `width ${ops[op]} ${n}${unit}${px(+n, unit)}`)
      .replace(/\(\s*prefers-color-scheme\s*:\s*dark\s*\)/g, 'dark mode')
      .replace(/\(\s*prefers-color-scheme\s*:\s*light\s*\)/g, 'light mode')
      .replace(/\(\s*hover\s*:\s*hover\s*\)/g, 'mouse or trackpad')
      .replace(/\(\s*pointer\s*:\s*fine\s*\)/g, 'fine pointer')
      .replace(/\(\s*pointer\s*:\s*coarse\s*\)/g, 'touch screen')
      .replace(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g, 'reduced motion')
      .replace(/\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/g, 'motion allowed')
      .replace(/^\s*print\s*$/, 'print');
  }

  function ownExtras(hit, cls) {
    if (!cls) return { own: '', ancestors: '' };
    const compounds = splitCompounds(hit.base);
    const last = compounds.pop() || '';
    const own = last.split('.' + CSS.escape(cls)).join('').replace(/^\*/, '');
    return { own: prettySelector(own), ancestors: compounds.length ? prettySelector(compounds.join(' ')) : '' };
  }

  function selectorReason(hit, cls) {
    const { own, ancestors } = ownExtras(hit, cls);
    const parts = [];
    if (own) parts.push(own);
    if (ancestors) parts.push(`inside ${ancestors}`);
    return parts.length ? `needs ${parts.join(' ')}` : 'selector does not match';
  }

  function conditionLabels(hit, cls, res) {
    const { own, ancestors } = ownExtras(hit, cls);
    const matched = res.matches[hit.selIdx];
    const labels = [];
    if (own) labels.push({ text: own, met: matched !== false });
    if (hit.pseudo) labels.push({ text: prettySelector(hit.pseudo), met: null });
    if (ancestors) labels.push({ text: `inside ${ancestors}`, met: matched !== false });
    hit.rule.media.forEach((m, k) => labels.push({ text: `@media ${prettyMedia(m, res.rootPx)}`, met: res.media[hit.mediaIdx[k]] !== false }));
    hit.rule.supports.forEach((s, k) => labels.push({ text: `@supports ${s}`, met: res.supports[hit.supportsIdx[k]] !== false }));
    hit.rule.container.forEach((q) => labels.push({ text: `@container ${q}`, met: null }));
    if (hit.rule.starting) labels.push({ text: '@starting-style', met: false });
    return labels;
  }

  function analyze({ entries, res, index, info, inline }) {
    const off = new Set(info.off);
    const layerCount = index.layers.length;
    const rank = (layer, important) => {
      const at = layer ? index.layers.indexOf(layer) : -1;
      if (important) return layer ? layerCount - at : -1;
      return layer ? at : layerCount;
    };
    const inlineByLonghand = new Map();
    inline.forEach((d) => longhandsOf(d.prop).forEach((l) => inlineByLonghand.set(l, d)));
    const fromRes = (d, slot) => {
      const r = (slot != null && res.decls[slot]) || {};
      return {
        ...d,
        resolved: r.resolved != null ? r.resolved : d.value,
        computed: r.computed || '',
        parts: r.parts || {},
        valid: r.valid !== false,
        longhands: longhandsOf(d.prop),
        internal: d.prop.startsWith('--tw-'),
      };
    };
    const candidates = new Map();
    const counted = new Set();
    for (const entry of entries) {
      entry.off = off.has(entry.cls);
      for (const hit of entry.hits) {
        const matched = res.matches[hit.selIdx];
        const reasons = [];
        if (entry.off) reasons.push('turned off here');
        if (matched === false) reasons.push(selectorReason(hit, entry.cls));
        if (matched === null) reasons.push('selector not supported');
        hit.rule.media.forEach((m, k) => {
          if (res.media[hit.mediaIdx[k]] === false) reasons.push(`needs ${prettyMedia(m, res.rootPx)}`);
        });
        hit.rule.supports.forEach((s, k) => {
          if (res.supports[hit.supportsIdx[k]] === false) reasons.push(`needs @supports ${s}`);
        });
        if (hit.rule.starting) reasons.push('first frame only (@starting-style)');
        hit.reasons = reasons;
        hit.active = reasons.length === 0;
        hit.labels = conditionLabels(hit, entry.cls, res);
        hit.cascade = [rank(hit.rule.layer, false), ...hit.spec, hit.rule.id];
        hit.decls = hit.rule.decls.map((d, k) => ({ ...fromRes(d, hit.declIdx[k]), state: d.disabled ? 'disabled' : hit.active ? 'applied' : 'inactive' }));
        const ruleKey = `${hit.rule.id}|${hit.part}`;
        if (hit.active && !hit.pseudo && !counted.has(ruleKey)) {
          counted.add(ruleKey);
          hit.decls.filter((d) => !d.disabled).forEach((d) =>
            d.longhands.forEach((l) => {
              if (!candidates.has(l)) candidates.set(l, []);
              candidates.get(l).push({
                entry,
                d,
                key: [d.important ? 1 : 0, rank(hit.rule.layer, d.important), ...hit.spec, hit.rule.id],
              });
            }),
          );
        }
      }
      for (const rel of entry.related) {
        rel.decls = rel.rule.decls.map((d, k) => ({ ...fromRes(d, rel.declIdx[k]), state: 'related' }));
        rel.labels = rel.rule.media.map((m) => ({ text: `@media ${prettyMedia(m, res.rootPx)}`, met: null }));
      }
    }
    const wins = new Map();
    for (const [longhand, list] of candidates) {
      list.sort((x, y) => compareKeys(x.key, y.key));
      const top = list[list.length - 1];
      const inlineDecl = inlineByLonghand.get(longhand);
      const inlineWins = inlineDecl != null && (!top.d.important || inlineDecl.important);
      for (const candidate of list) {
        if (candidate === top && !inlineWins) {
          wins.set(candidate.d, (wins.get(candidate.d) || 0) + 1);
        } else {
          candidate.d.lostTo = candidate.d.lostTo || new Set();
          candidate.d.lostTo.add(inlineWins ? 'the style attribute' : top.entry.cls);
        }
      }
      if (!inlineWins && STABLE_PROPS.test(longhand)) {
        const final = (res.finals[longhand] || '').trim();
        const mine = (top.d.parts[longhand] || '').trim();
        if (final && mine && final !== mine) {
          top.d.elsewhere = top.d.elsewhere || [];
          top.d.elsewhere.push(`${longhand}: ${final}`);
        }
      }
    }
    for (const entry of entries) {
      for (const hit of entry.hits) {
        hit.decls.forEach((d) => {
          if (d.state === 'applied' && !hit.pseudo && d.lostTo && !wins.get(d)) d.state = 'overridden';
        });
      }
      entry.activeHits = entry.hits.filter((hit) => hit.active).length;
      if (entry.off) entry.status = 'off';
      else if (entry.hits.length) entry.status = entry.activeHits ? 'active' : 'inactive';
      else if (entry.related.length) entry.status = 'related';
      else if (entry.markers) entry.status = 'marker';
      else entry.status = 'unknown';
    }
    return entries;
  }

  let canvasContext = null;
  function toHex(color) {
    if (!color || /^(currentcolor|inherit|initial|unset|revert|revert-layer)$/i.test(color)) return null;
    if (!CSS.supports('color', color)) return null;
    if (!canvasContext) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      canvasContext = canvas.getContext('2d', { willReadFrequently: true });
    }
    canvasContext.clearRect(0, 0, 1, 1);
    canvasContext.fillStyle = '#000';
    canvasContext.fillStyle = color;
    canvasContext.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = canvasContext.getImageData(0, 0, 1, 1).data;
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ''}`.toUpperCase();
  }

  function roundNumbers(value) {
    return value.replace(/(-?\d+\.\d{3,})(?=[a-z%]*\b|\s|,|\)|$)/gi, (n) => String(+parseFloat(n).toFixed(2)));
  }

  function displayValue(d) {
    if (d.prop.startsWith('--')) return roundNumbers(d.resolved);
    const hex = toHex(d.computed) || toHex(d.resolved);
    if (hex) return hex;
    const needsMath = /calc\(|var\(|min\(|max\(|clamp\(|\d(rem|em|ch|ex|lh)\b/.test(d.resolved);
    const value = needsMath && d.computed ? d.computed : d.resolved;
    return roundNumbers(value);
  }

  function tokenOf(d) {
    if (!/^\s*var\(/.test(d.value)) return null;
    const names = [...d.value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
    return names.find((name) => !name.startsWith('--tw-')) || null;
  }

  function toCss({ info, entries, inline }, options) {
    const raw = Boolean(options && options.raw);
    const valueOf = (d) => (raw ? d.value : displayValue(d));
    const element = new Map();
    const blocks = new Map();
    const addTo = (map, prop, value) => map.set(prop, value);
    for (const entry of entries) {
      for (const hit of entry.hits) {
        const visible = hit.decls.filter((d) => raw || !d.internal);
        if (hit.active && !hit.pseudo) {
          visible.forEach((d) => {
            if (d.state === 'applied') addTo(element, d.prop, valueOf(d) + (d.important ? ' !important' : ''));
          });
          continue;
        }
        if (entry.off) continue;
        const { own, ancestors } = ownExtras(hit, entry.cls);
        const selector = `${ancestors ? ancestors + ' ' : ''}.element${own}${hit.pseudo ? prettySelector(hit.pseudo) : ''}`;
        const wrappers = [
          ...hit.rule.media.map((m) => `@media ${m}`),
          ...hit.rule.supports.map((s) => `@supports ${s}`),
          ...hit.rule.container.map((q) => `@container ${q}`),
        ];
        const key = [...wrappers, selector].join('\u0000');
        if (!blocks.has(key)) blocks.set(key, { wrappers, selector, decls: new Map() });
        visible.forEach((d) => addTo(blocks.get(key).decls, d.prop, valueOf(d) + (d.important ? ' !important' : '')));
      }
    }
    inline.forEach((d) => addTo(element, d.prop, d.value + (d.important ? ' !important' : '') + ' /* style attribute */'));
    const label = `${info.tag}${info.id ? '#' + info.id : ''}${info.classes.length ? '.' + info.classes.join('.') : ''}`;
    const out = [`/* ${label} */`];
    const block = (selector, decls, indent) => {
      const pad = '  '.repeat(indent);
      return [`${pad}${selector} {`, ...[...decls].map(([p, v]) => `${pad}  ${p}: ${v};`), `${pad}}`];
    };
    if (element.size) out.push(...block('.element', element, 0));
    for (const { wrappers, selector, decls } of blocks.values()) {
      if (!decls.size) continue;
      out.push('');
      wrappers.forEach((w, i) => out.push(`${'  '.repeat(i)}${w} {`));
      out.push(...block(selector, decls, wrappers.length));
      wrappers.forEach((_, i) => out.push(`${'  '.repeat(wrappers.length - 1 - i)}}`));
    }
    return out.join('\n') + '\n';
  }

  window.ClassLens = {
    containsToken,
    stripParens,
    compareKeys,
    variantsOf,
    unescapeIdent,
    CLASS_TOKEN,
    longhandsOf,
    ownExtras,
    buildIndex,
    matchClasses,
    buildRequest,
    analyze,
    parseDecls,
    displayValue,
    tokenOf,
    toHex,
    toCss,
    prettySelector,
    prettyMedia,
    specificity,
    splitTop,
    splitCompounds,
    stripPseudoElements,
    resolveNested,
  };
})();

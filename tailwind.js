'use strict';

(function () {
  const lens = window.ClassLens;

  const KEYWORDS = {
    display: { block: 'block', 'inline-block': 'inline-block', inline: 'inline', flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid', contents: 'contents', none: 'hidden', table: 'table', 'flow-root': 'flow-root', 'list-item': 'list-item' },
    position: { static: 'static', fixed: 'fixed', absolute: 'absolute', relative: 'relative', sticky: 'sticky' },
    visibility: { visible: 'visible', hidden: 'invisible', collapse: 'collapse' },
    'flex-direction': { row: 'flex-row', 'row-reverse': 'flex-row-reverse', column: 'flex-col', 'column-reverse': 'flex-col-reverse' },
    'flex-wrap': { wrap: 'flex-wrap', nowrap: 'flex-nowrap', 'wrap-reverse': 'flex-wrap-reverse' },
    'align-items': { 'flex-start': 'items-start', start: 'items-start', 'flex-end': 'items-end', end: 'items-end', center: 'items-center', baseline: 'items-baseline', stretch: 'items-stretch' },
    'align-self': { auto: 'self-auto', 'flex-start': 'self-start', start: 'self-start', 'flex-end': 'self-end', end: 'self-end', center: 'self-center', stretch: 'self-stretch', baseline: 'self-baseline' },
    'align-content': { 'flex-start': 'content-start', start: 'content-start', 'flex-end': 'content-end', end: 'content-end', center: 'content-center', 'space-between': 'content-between', 'space-around': 'content-around', 'space-evenly': 'content-evenly', stretch: 'content-stretch' },
    'justify-content': { 'flex-start': 'justify-start', start: 'justify-start', 'flex-end': 'justify-end', end: 'justify-end', center: 'justify-center', 'space-between': 'justify-between', 'space-around': 'justify-around', 'space-evenly': 'justify-evenly', stretch: 'justify-stretch', normal: 'justify-normal' },
    'justify-items': { start: 'justify-items-start', end: 'justify-items-end', center: 'justify-items-center', stretch: 'justify-items-stretch' },
    'justify-self': { auto: 'justify-self-auto', start: 'justify-self-start', end: 'justify-self-end', center: 'justify-self-center', stretch: 'justify-self-stretch' },
    'place-items': { start: 'place-items-start', end: 'place-items-end', center: 'place-items-center', stretch: 'place-items-stretch' },
    'place-content': { start: 'place-content-start', end: 'place-content-end', center: 'place-content-center', 'space-between': 'place-content-between', stretch: 'place-content-stretch' },
    'text-align': { left: 'text-left', center: 'text-center', right: 'text-right', justify: 'text-justify', start: 'text-start', end: 'text-end' },
    'font-style': { italic: 'italic', normal: 'not-italic' },
    'font-weight': { '100': 'font-thin', '200': 'font-extralight', '300': 'font-light', '400': 'font-normal', normal: 'font-normal', '500': 'font-medium', '600': 'font-semibold', '700': 'font-bold', bold: 'font-bold', '800': 'font-extrabold', '900': 'font-black' },
    'text-transform': { uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'capitalize', none: 'normal-case' },
    'text-decoration-line': { underline: 'underline', overline: 'overline', 'line-through': 'line-through', none: 'no-underline' },
    'text-decoration': { underline: 'underline', 'line-through': 'line-through', none: 'no-underline' },
    'text-overflow': { ellipsis: 'text-ellipsis', clip: 'text-clip' },
    'white-space': { normal: 'whitespace-normal', nowrap: 'whitespace-nowrap', pre: 'whitespace-pre', 'pre-line': 'whitespace-pre-line', 'pre-wrap': 'whitespace-pre-wrap', 'break-spaces': 'whitespace-break-spaces' },
    'word-break': { 'break-all': 'break-all', 'keep-all': 'break-keep', normal: 'break-normal' },
    'vertical-align': { baseline: 'align-baseline', top: 'align-top', middle: 'align-middle', bottom: 'align-bottom', 'text-top': 'align-text-top', 'text-bottom': 'align-text-bottom', sub: 'align-sub', super: 'align-super' },
    overflow: { auto: 'overflow-auto', hidden: 'overflow-hidden', clip: 'overflow-clip', visible: 'overflow-visible', scroll: 'overflow-scroll' },
    'overflow-x': { auto: 'overflow-x-auto', hidden: 'overflow-x-hidden', clip: 'overflow-x-clip', visible: 'overflow-x-visible', scroll: 'overflow-x-scroll' },
    'overflow-y': { auto: 'overflow-y-auto', hidden: 'overflow-y-hidden', clip: 'overflow-y-clip', visible: 'overflow-y-visible', scroll: 'overflow-y-scroll' },
    cursor: { auto: 'cursor-auto', default: 'cursor-default', pointer: 'cursor-pointer', wait: 'cursor-wait', text: 'cursor-text', move: 'cursor-move', help: 'cursor-help', 'not-allowed': 'cursor-not-allowed', none: 'cursor-none', grab: 'cursor-grab', grabbing: 'cursor-grabbing' },
    'pointer-events': { none: 'pointer-events-none', auto: 'pointer-events-auto' },
    'user-select': { none: 'select-none', text: 'select-text', all: 'select-all', auto: 'select-auto' },
    'box-sizing': { 'border-box': 'box-border', 'content-box': 'box-content' },
    'object-fit': { contain: 'object-contain', cover: 'object-cover', fill: 'object-fill', none: 'object-none', 'scale-down': 'object-scale-down' },
    'border-style': { solid: 'border-solid', dashed: 'border-dashed', dotted: 'border-dotted', double: 'border-double', hidden: 'border-hidden', none: 'border-none' },
    'outline-style': { solid: 'outline-solid', dashed: 'outline-dashed', dotted: 'outline-dotted', double: 'outline-double', none: 'outline-none' },
    'list-style-type': { none: 'list-none', disc: 'list-disc', decimal: 'list-decimal' },
    'list-style-position': { inside: 'list-inside', outside: 'list-outside' },
    float: { left: 'float-left', right: 'float-right', none: 'float-none', start: 'float-start', end: 'float-end' },
    clear: { left: 'clear-left', right: 'clear-right', both: 'clear-both', none: 'clear-none' },
    isolation: { isolate: 'isolate', auto: 'isolation-auto' },
    resize: { none: 'resize-none', vertical: 'resize-y', horizontal: 'resize-x', both: 'resize' },
    appearance: { none: 'appearance-none', auto: 'appearance-auto' },
    'table-layout': { auto: 'table-auto', fixed: 'table-fixed' },
    'border-collapse': { collapse: 'border-collapse', separate: 'border-separate' },
    'font-variant-numeric': { 'tabular-nums': 'tabular-nums', normal: 'normal-nums' },
    '-webkit-font-smoothing': { antialiased: 'antialiased', auto: 'subpixel-antialiased' },
    'transition-timing-function': { linear: 'ease-linear', ease: 'ease-[ease]', 'ease-in': 'ease-in', 'ease-out': 'ease-out', 'ease-in-out': 'ease-in-out' },
    'aspect-ratio': { auto: 'aspect-auto', '1 / 1': 'aspect-square', '1/1': 'aspect-square', '16 / 9': 'aspect-video', '16/9': 'aspect-video' },
    flex: { '1 1 0%': 'flex-1', '1': 'flex-1', '1 1 auto': 'flex-auto', '0 1 auto': 'flex-initial', none: 'flex-none' },
    'flex-grow': { '1': 'grow', '0': 'grow-0' },
    'flex-shrink': { '1': 'shrink', '0': 'shrink-0' },
    'box-shadow': { none: 'shadow-none' },
    'z-index': { auto: 'z-auto' },
  };

  const INVERSE = new Map();
  for (const [prop, map] of Object.entries(KEYWORDS)) {
    for (const [value, cls] of Object.entries(map)) {
      if (!INVERSE.has(cls) && !cls.includes('[')) INVERSE.set(cls, [{ prop, value }]);
    }
  }

  const SPACING = {
    padding: 'p', 'padding-top': 'pt', 'padding-right': 'pr', 'padding-bottom': 'pb', 'padding-left': 'pl', 'padding-inline': 'px', 'padding-block': 'py', 'padding-inline-start': 'ps', 'padding-inline-end': 'pe',
    margin: 'm', 'margin-top': 'mt', 'margin-right': 'mr', 'margin-bottom': 'mb', 'margin-left': 'ml', 'margin-inline': 'mx', 'margin-block': 'my', 'margin-inline-start': 'ms', 'margin-inline-end': 'me',
    gap: 'gap', 'row-gap': 'gap-y', 'column-gap': 'gap-x',
    top: 'top', right: 'right', bottom: 'bottom', left: 'left', inset: 'inset', 'inset-inline': 'inset-x', 'inset-block': 'inset-y',
    width: 'w', height: 'h', 'min-width': 'min-w', 'min-height': 'min-h', 'max-width': 'max-w', 'max-height': 'max-h',
    'flex-basis': 'basis', 'text-indent': 'indent',
  };
  const SIZE_PREFIXES = new Set(['w', 'h', 'min-w', 'min-h', 'max-w', 'max-h', 'basis', 'size']);
  const COLOR = {
    color: 'text', 'background-color': 'bg', 'border-color': 'border', 'border-top-color': 'border-t', 'border-right-color': 'border-r', 'border-bottom-color': 'border-b', 'border-left-color': 'border-l', 'border-inline-color': 'border-x', 'border-block-color': 'border-y',
    'outline-color': 'outline', fill: 'fill', stroke: 'stroke', 'text-decoration-color': 'decoration', 'caret-color': 'caret', 'accent-color': 'accent',
  };
  const BORDER_WIDTH = { 'border-width': 'border', 'border-top-width': 'border-t', 'border-right-width': 'border-r', 'border-bottom-width': 'border-b', 'border-left-width': 'border-l', 'border-inline-width': 'border-x', 'border-block-width': 'border-y', 'outline-width': 'outline' };
  const FONT_SIZES = { 12: 'xs', 14: 'sm', 16: 'base', 18: 'lg', 20: 'xl', 24: '2xl', 30: '3xl', 36: '4xl', 48: '5xl', 60: '6xl', 72: '7xl', 96: '8xl', 128: '9xl' };
  const LEADING_WORDS = { '1': 'none', '1.25': 'tight', '1.375': 'snug', '1.5': 'normal', '1.625': 'relaxed', '2': 'loose' };
  const TRACKING = { '-0.05': 'tighter', '-0.025': 'tight', '0': 'normal', '0.025': 'wide', '0.05': 'wider', '0.1': 'widest' };
  const RADIUS = { v4: { 0: 'none', 2: 'xs', 4: 'sm', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl', 24: '3xl', 32: '4xl' }, v3: { 0: 'none', 2: 'sm', 4: '', 6: 'md', 8: 'lg', 12: 'xl', 16: '2xl', 24: '3xl' } };
  const V3_SCALE = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
  const FRACTIONS = { '50': '1/2', '33.3333': '1/3', '66.6667': '2/3', '25': '1/4', '75': '3/4', '20': '1/5', '40': '2/5', '60': '3/5', '80': '4/5', '16.6667': '1/6', '83.3333': '5/6' };
  const BREAKPOINTS = { v4: [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]], v3: [['sm', 640], ['md', 768], ['lg', 1024], ['xl', 1280], ['2xl', 1536]] };
  const PSEUDO_VARIANTS = {
    ':hover': 'hover', ':focus': 'focus', ':focus-visible': 'focus-visible', ':focus-within': 'focus-within', ':active': 'active', ':visited': 'visited', ':disabled': 'disabled', ':checked': 'checked',
    ':first-child': 'first', ':last-child': 'last', ':nth-child(odd)': 'odd', ':nth-child(2n+1)': 'odd', ':nth-child(even)': 'even', ':nth-child(2n)': 'even', ':empty': 'empty', ':invalid': 'invalid', ':required': 'required',
    '::before': 'before', '::after': 'after', '::placeholder': 'placeholder', '::selection': 'selection', '::marker': 'marker', '::file-selector-button': 'file',
  };
  const BUILTIN_VARIANTS = {
    hover: { sel: '\u0000:hover' }, focus: { sel: '\u0000:focus' }, 'focus-visible': { sel: '\u0000:focus-visible' }, 'focus-within': { sel: '\u0000:focus-within' },
    active: { sel: '\u0000:active' }, visited: { sel: '\u0000:visited' }, disabled: { sel: '\u0000:disabled' }, checked: { sel: '\u0000:checked' },
    first: { sel: '\u0000:first-child' }, last: { sel: '\u0000:last-child' }, odd: { sel: '\u0000:nth-child(odd)' }, even: { sel: '\u0000:nth-child(even)' },
    empty: { sel: '\u0000:empty' }, before: { sel: '\u0000::before' }, after: { sel: '\u0000::after' }, placeholder: { sel: '\u0000::placeholder' },
    'group-hover': { sel: '.group:hover \u0000' }, 'peer-checked': { sel: '.peer:checked ~ \u0000' },
    sm: { media: '(width >= 40rem)' }, md: { media: '(width >= 48rem)' }, lg: { media: '(width >= 64rem)' }, xl: { media: '(width >= 80rem)' }, '2xl': { media: '(width >= 96rem)' },
    dark: { media: '(prefers-color-scheme: dark)' }, 'motion-reduce': { media: '(prefers-reduced-motion: reduce)' }, print: { media: 'print' },
  };

  function splitSpaces(value) {
    const out = [];
    let depth = 0;
    let current = '';
    for (const ch of value.trim()) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (/\s/.test(ch) && depth === 0) {
        if (current) out.push(current);
        current = '';
      } else current += ch;
    }
    if (current) out.push(current);
    return out;
  }

  function arbitrary(value) {
    return value.trim().replace(/_/g, '\\_').replace(/\s+/g, '_');
  }

  function toPx(value, rootPx) {
    const match = String(value).trim().match(/^(-?\d*\.?\d+)(px|rem)?$/);
    if (!match) return null;
    const n = parseFloat(match[1]);
    if (match[2] === 'rem') return n * (rootPx || 16);
    if (!match[2] && n !== 0) return null;
    return n;
  }

  function trimNumber(n) {
    return String(+n.toFixed(4));
  }

  function spacingSuffix(px, ctx) {
    if (px === 0) return '0';
    if (px === 1) return 'px';
    const n = px / 4;
    if (ctx.v4 ? Number.isInteger(n * 4) && Number.isInteger(n * 2) : V3_SCALE.includes(n)) return trimNumber(n);
    return null;
  }

  function spacingClass(prefix, value, ctx) {
    const raw = value.trim();
    const negative = raw.startsWith('-') && raw !== '-';
    const v = negative ? raw.slice(1) : raw;
    const sign = negative ? '-' : '';
    const lower = v.toLowerCase();
    if (lower === 'auto') return `${prefix}-auto`;
    if (lower === '100%') return `${sign}${prefix}-full`;
    if (SIZE_PREFIXES.has(prefix)) {
      const words = { 'min-content': 'min', 'max-content': 'max', 'fit-content': 'fit', none: 'none' };
      if (words[lower]) return `${prefix}-${words[lower]}`;
      if (lower === '100vw' && prefix.endsWith('w')) return `${prefix}-screen`;
      if (lower === '100vh' && prefix.endsWith('h')) return `${prefix}-screen`;
      if (/^100(dvh|svh|lvh)$/.test(lower) && prefix.endsWith('h')) return `${prefix}-${lower.slice(3)}`;
    }
    const percent = lower.match(/^(\d*\.?\d+)%$/);
    if (percent) {
      const key = String(+parseFloat(percent[1]).toFixed(4));
      const fraction = FRACTIONS[key] || Object.entries(FRACTIONS).find(([k]) => Math.abs(parseFloat(k) - parseFloat(key)) < 0.01)?.[1];
      if (fraction) return `${sign}${prefix}-${fraction}`;
    }
    const px = toPx(v, ctx.rootPx);
    if (px != null) {
      const suffix = spacingSuffix(px, ctx);
      if (suffix) return `${sign}${prefix}-${suffix}`;
    }
    return `${sign}${prefix}-[${arbitrary(v)}]`;
  }

  function colorClass(prefix, value) {
    const lower = value.trim().toLowerCase();
    if (lower === 'transparent') return `${prefix}-transparent`;
    if (lower === 'currentcolor') return `${prefix}-current`;
    if (lower === 'inherit') return `${prefix}-inherit`;
    const hex = lens.toHex(value);
    if (hex === '#FFFFFF') return `${prefix}-white`;
    if (hex === '#000000') return `${prefix}-black`;
    return `${prefix}-[${hex ? hex.toLowerCase() : arbitrary(value)}]`;
  }

  function boxShorthand(prefix, value, ctx) {
    const parts = splitSpaces(value);
    if (parts.length < 2) return [spacingClass(prefix, value, ctx)];
    const [top, right = top, bottom = top, left = right] = parts;
    if (top === right && right === bottom && bottom === left) return [spacingClass(prefix, top, ctx)];
    const out = [];
    if (top === bottom) out.push(spacingClass(`${prefix}y`, top, ctx));
    else out.push(spacingClass(`${prefix}t`, top, ctx), spacingClass(`${prefix}b`, bottom, ctx));
    if (left === right) out.push(spacingClass(`${prefix}x`, left, ctx));
    else out.push(spacingClass(`${prefix}l`, left, ctx), spacingClass(`${prefix}r`, right, ctx));
    return out;
  }

  function tokenPrefix(prop) {
    if (SPACING[prop]) return SPACING[prop];
    if (COLOR[prop]) return COLOR[prop];
    if (prop === 'background') return 'bg';
    return { 'font-size': 'text', 'line-height': 'leading', 'letter-spacing': 'tracking', 'border-radius': 'rounded', 'box-shadow': 'shadow', 'font-weight': 'font', 'font-family': 'font', opacity: 'opacity', 'transition-duration': 'duration', 'transition-timing-function': 'ease', 'z-index': 'z' }[prop] || BORDER_WIDTH[prop] || null;
  }

  function convertOne(prop, value, ctx) {
    const lower = value.trim().toLowerCase().replace(/\s+/g, ' ');
    const fromBuild = ctx.lookup ? ctx.lookup(prop, value) : null;
    if (fromBuild) return [{ cls: fromBuild, source: 'build' }];
    const token = value.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (token) {
      const prefix = tokenPrefix(prop);
      if (prefix) return [{ cls: ctx.v4 ? `${prefix}-(${token[1]})` : `${prefix}-[var(${token[1]})]`, source: 'arbitrary' }];
      return [{ cls: `[${prop}:var(${token[1]})]`, source: 'arbitrary' }];
    }
    const scale = (cls) => [{ cls, source: cls.includes('[') ? 'arbitrary' : 'scale' }];
    if (KEYWORDS[prop] && KEYWORDS[prop][lower]) return scale(KEYWORDS[prop][lower]);
    if (prop === 'padding' || prop === 'margin') return boxShorthand(prop === 'padding' ? 'p' : 'm', value, ctx).flatMap(scale);
    if (prop === 'inset' && splitSpaces(value).length > 1) {
      const [top, right = top, bottom = top, left = right] = splitSpaces(value);
      return [['top', top], ['right', right], ['bottom', bottom], ['left', left]].flatMap(([p, v]) => scale(spacingClass(p, v, ctx)));
    }
    if (prop === 'gap' && splitSpaces(value).length === 2) {
      const [row, column] = splitSpaces(value);
      return [...scale(spacingClass('gap-y', row, ctx)), ...scale(spacingClass('gap-x', column, ctx))];
    }
    if (prop === 'overflow' && splitSpaces(value).length === 2) {
      const [x, y] = splitSpaces(lower);
      return [...convertOne('overflow-x', x, ctx), ...convertOne('overflow-y', y, ctx)];
    }
    if (prop === 'border' || prop === 'outline') {
      const out = [];
      for (const part of splitSpaces(value)) {
        if (toPx(part, ctx.rootPx) != null || /^(thin|medium|thick)$/i.test(part)) out.push(...convertOne(`${prop}-width`, part, ctx));
        else if (KEYWORDS[`${prop}-style`][part.toLowerCase()]) {
          if (part.toLowerCase() !== 'solid' || prop === 'outline') out.push(...convertOne(`${prop}-style`, part, ctx));
        } else out.push(...convertOne(`${prop}-color`, part, ctx));
      }
      return out;
    }
    if (prop === 'background' && CSS.supports('color', value)) return convertOne('background-color', value, ctx);
    if (SPACING[prop]) return scale(spacingClass(SPACING[prop], value, ctx));
    if (COLOR[prop]) return scale(colorClass(COLOR[prop], value));
    if (BORDER_WIDTH[prop]) {
      const prefix = BORDER_WIDTH[prop];
      const px = toPx(value, ctx.rootPx);
      if (px === 1 && prefix !== 'outline') return scale(prefix);
      if (px != null && [0, 1, 2, 4, 8].includes(px)) return scale(`${prefix}-${px}`);
      return scale(`${prefix}-[${arbitrary(value)}]`);
    }
    if (prop === 'font-size') {
      const px = toPx(value, ctx.rootPx);
      return scale(px != null && FONT_SIZES[px] ? `text-${FONT_SIZES[px]}` : `text-[${arbitrary(value)}]`);
    }
    if (prop === 'line-height') {
      if (LEADING_WORDS[lower]) return scale(`leading-${LEADING_WORDS[lower]}`);
      const px = toPx(value, ctx.rootPx);
      if (px != null) {
        const n = px / 4;
        if (ctx.v4 ? Number.isInteger(n * 2) : Number.isInteger(n) && n >= 3 && n <= 10) return scale(`leading-${trimNumber(n)}`);
      }
      return scale(`leading-[${arbitrary(value)}]`);
    }
    if (prop === 'letter-spacing') {
      const em = lower.match(/^(-?\d*\.?\d+)em$/);
      if (em && TRACKING[String(+parseFloat(em[1]))]) return scale(`tracking-${TRACKING[String(+parseFloat(em[1]))]}`);
      if (lower === '0' || lower === 'normal') return scale('tracking-normal');
      return scale(`tracking-[${arbitrary(value)}]`);
    }
    if (prop === 'border-radius') {
      const px = toPx(value, ctx.rootPx);
      if (px != null && px >= 9999) return scale('rounded-full');
      const table = ctx.v4 ? RADIUS.v4 : RADIUS.v3;
      if (px != null && table[px] != null) return scale(table[px] ? `rounded-${table[px]}` : 'rounded');
      if (lower === '50%') return scale('rounded-full');
      return scale(`rounded-[${arbitrary(value)}]`);
    }
    if (prop === 'opacity') {
      const n = lower.endsWith('%') ? parseFloat(lower) : parseFloat(lower) * 100;
      if (Number.isFinite(n) && Number.isInteger(+n.toFixed(4)) && (ctx.v4 || n % 5 === 0)) return scale(`opacity-${+n.toFixed(4)}`);
      return scale(`opacity-[${arbitrary(value)}]`);
    }
    if (prop === 'z-index' && /^-?\d+$/.test(lower)) {
      const n = parseInt(lower, 10);
      return scale(ctx.v4 || [0, 10, 20, 30, 40, 50].includes(Math.abs(n)) ? `${n < 0 ? '-' : ''}z-${Math.abs(n)}` : `z-[${n}]`);
    }
    if (prop === 'font-weight' && /^\d+$/.test(lower)) return scale(`font-[${lower}]`);
    if (prop === 'transition-duration' || prop === 'transition-delay') {
      const ms = lower.endsWith('ms') ? parseFloat(lower) : lower.endsWith('s') ? parseFloat(lower) * 1000 : NaN;
      const prefix = prop === 'transition-duration' ? 'duration' : 'delay';
      if (Number.isFinite(ms) && Number.isInteger(+ms.toFixed(4))) return scale(`${prefix}-${+ms.toFixed(4)}`);
      return scale(`${prefix}-[${arbitrary(value)}]`);
    }
    if (prop === 'transition-timing-function') return scale(`ease-[${arbitrary(value)}]`);
    if (prop === 'order' && /^-?\d+$/.test(lower)) return scale(`${lower.startsWith('-') ? '-' : ''}order-${lower.replace('-', '')}`);
    if (prop === 'flex-grow' || prop === 'flex-shrink') return scale(`${prop === 'flex-grow' ? 'grow' : 'shrink'}-[${arbitrary(value)}]`);
    if (prop === 'grid-template-columns' || prop === 'grid-template-rows') {
      const repeat = lower.match(/^repeat\((\d+),\s*minmax\(0(px)?,\s*1fr\)\)$/);
      const prefix = prop === 'grid-template-columns' ? 'grid-cols' : 'grid-rows';
      if (repeat) return scale(`${prefix}-${repeat[1]}`);
      if (lower === 'none') return scale(`${prefix}-none`);
      return scale(`${prefix}-[${arbitrary(value)}]`);
    }
    if (prop === 'aspect-ratio') return scale(`aspect-[${arbitrary(value.replace(/\s*\/\s*/, '/'))}]`);
    if (prop === 'box-shadow') return scale(`shadow-[${arbitrary(value)}]`);
    if (prop === 'font-family') return scale(`font-[${arbitrary(value)}]`);
    if (prop === 'transform-origin') return scale(`origin-[${arbitrary(value)}]`);
    return [{ cls: `[${prop}:${arbitrary(value)}]`, source: 'arbitrary' }];
  }

  function mergeAxes(items) {
    const byClass = new Map(items.map((item) => [item.cls, item]));
    const take = (a, b, merged) => {
      if (byClass.has(a) && byClass.has(b)) {
        const source = byClass.get(a).source === byClass.get(b).source ? byClass.get(a).source : 'scale';
        byClass.delete(a);
        byClass.delete(b);
        byClass.set(merged, { cls: merged, source });
      }
    };
    const values = (prefix) =>
      [...byClass.keys()].filter((cls) => cls.startsWith(prefix + '-')).map((cls) => cls.slice(prefix.length + 1));
    for (const base of ['p', 'm', '-m']) {
      for (const v of values(`${base}l`)) take(`${base}l-${v}`, `${base}r-${v}`, `${base}x-${v}`);
      for (const v of values(`${base}t`)) take(`${base}t-${v}`, `${base}b-${v}`, `${base}y-${v}`);
      for (const v of values(`${base}x`)) take(`${base}x-${v}`, `${base}y-${v}`, `${base}-${v}`);
    }
    for (const v of values('left')) take(`left-${v}`, `right-${v}`, `inset-x-${v}`);
    for (const v of values('top')) take(`top-${v}`, `bottom-${v}`, `inset-y-${v}`);
    for (const v of values('inset-x')) take(`inset-x-${v}`, `inset-y-${v}`, `inset-${v}`);
    for (const v of values('gap-x')) take(`gap-x-${v}`, `gap-y-${v}`, `gap-${v}`);
    for (const v of values('w')) take(`w-${v}`, `h-${v}`, `size-${v}`);
    return [...byClass.values()];
  }

  function expandShorthands(decls) {
    const out = [];
    for (const d of decls) {
      if ((d.prop === 'border' || d.prop === 'outline') && splitSpaces(d.value).length > 1) {
        for (const part of splitSpaces(d.value)) {
          const lower = part.toLowerCase();
          if (/^-?\d*\.?\d+(px|rem|em)?$/.test(part) || /^(thin|medium|thick)$/.test(lower)) out.push({ ...d, prop: `${d.prop}-width`, value: part });
          else if (KEYWORDS[`${d.prop}-style`][lower]) {
            if (lower !== 'solid' || d.prop === 'outline') out.push({ ...d, prop: `${d.prop}-style`, value: part });
          } else out.push({ ...d, prop: `${d.prop}-color`, value: part });
        }
      } else if (d.prop === 'background' && CSS.supports('color', d.value)) out.push({ ...d, prop: 'background-color' });
      else out.push(d);
    }
    return out;
  }

  function convertDecls(decls, ctx) {
    const items = [];
    for (const d of decls) {
      const results = convertOne(d.prop, d.value, ctx).map((item) => ({ ...item, from: d }));
      for (const item of results) items.push(d.important ? { ...item, cls: ctx.v4 ? `${item.cls}!` : `!${item.cls}` } : item);
    }
    const seen = new Set();
    return mergeAxes(items).filter((item) => !seen.has(item.cls) && seen.add(item.cls));
  }

  function variantsFromRule({ selector, media }, ctx) {
    const variants = [];
    for (const m of media) {
      const min = m.match(/\(\s*(?:min-width\s*:\s*|width\s*>=\s*)([\d.]+)(px|rem|em)\s*\)/);
      const max = m.match(/\(\s*(?:max-width\s*:\s*|width\s*<\s*)([\d.]+)(px|rem|em)\s*\)/);
      if (/prefers-color-scheme\s*:\s*dark/.test(m)) variants.push('dark');
      else if (/prefers-reduced-motion\s*:\s*reduce/.test(m)) variants.push('motion-reduce');
      else if (min || max) {
        const [, n, unit] = min || max;
        const px = unit === 'px' ? parseFloat(n) : parseFloat(n) * (ctx.rootPx || 16);
        const named = BREAKPOINTS[ctx.v4 ? 'v4' : 'v3'].find(([, value]) => value === px);
        if (min) variants.push(named ? named[0] : `min-[${n}${unit}]`);
        else variants.push(named ? `max-${named[0]}` : `max-[${n}${unit}]`);
      } else variants.push(`[@media_${arbitrary(m)}]`);
    }
    const pseudo = selector.match(/(::?[\w-]+(?:\([^)]*\))?)+\s*$/);
    if (pseudo) {
      const parts = pseudo[0].match(/::?[\w-]+(?:\([^)]*\))?/g) || [];
      for (const part of parts) variants.push(PSEUDO_VARIANTS[part] || `[&${arbitrary(part)}]`);
    }
    return variants;
  }

  function normalizeCssInput(text) {
    const loose = [];
    const blocks = [];
    let depth = 0;
    let buffer = '';
    let block = '';
    for (const ch of text) {
      if (depth === 0) {
        if (ch === '{') {
          depth = 1;
          block = buffer + '{';
          buffer = '';
        } else if (ch === ';') {
          if (buffer.trim()) loose.push(buffer.trim());
          buffer = '';
        } else buffer += ch;
      } else {
        block += ch;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            blocks.push(block);
            block = '';
          }
        }
      }
    }
    if (buffer.trim()) loose.push(buffer.trim());
    return `${loose.length ? `.x{${loose.join(';')}}` : ''}\n${blocks.join('\n')}`;
  }

  function cssToTailwind(cssText, ctx) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(normalizeCssInput(cssText));
    const groups = [];
    const visit = (rules, media) => {
      for (const rule of rules) {
        const kind = rule.constructor.name;
        if (kind === 'CSSStyleRule') {
          const decls = lens.parseDecls(rule.style.cssText);
          if (decls.length) groups.push({ variants: variantsFromRule({ selector: rule.selectorText, media }, ctx), decls, selector: rule.selectorText });
          if (rule.cssRules && rule.cssRules.length) visit(rule.cssRules, media);
        } else if (kind === 'CSSMediaRule') visit(rule.cssRules, [...media, rule.media.mediaText]);
        else if (rule.cssRules) visit(rule.cssRules, media);
      }
    };
    visit(sheet.cssRules, []);
    return groups;
  }

  function makeVariantTemplates(index) {
    const templates = new Map();
    for (const rule of index.rules) {
      for (const part of rule.parts) {
        const compounds = lens.splitCompounds(part);
        const last = compounds[compounds.length - 1] || '';
        for (const match of last.matchAll(lens.CLASS_TOKEN)) {
          const name = lens.unescapeIdent(match[1]);
          const { variants } = lens.variantsOf(name);
          if (!variants.length) continue;
          const chain = variants.join(':');
          if (templates.has(chain)) continue;
          templates.set(chain, { sel: part.split('.' + match[1]).join('\u0000'), media: rule.media, supports: rule.supports });
        }
      }
    }
    return templates;
  }

  function variantWrapper(variants, ctx) {
    let sel = '\u0000';
    const media = [];
    const supports = [];
    const exact = ctx.templates.get(variants.join(':'));
    if (exact) return { sel: exact.sel, media: exact.media, supports: exact.supports };
    for (const variant of variants) {
      const learned = ctx.templates.get(variant);
      const builtin = BUILTIN_VARIANTS[variant];
      const source = learned || (builtin && { sel: builtin.sel || '\u0000', media: builtin.media ? [builtin.media] : [], supports: [] });
      if (!source) return null;
      sel = source.sel.split('\u0000').join(sel);
      media.push(...source.media);
      supports.push(...(source.supports || []));
    }
    return { sel, media, supports };
  }

  function singleClassRules(index) {
    const map = new Map();
    for (const rule of index.rules) {
      if (rule.parts.length !== 1 || rule.media.length || rule.supports.length || rule.container.length || rule.starting) continue;
      const match = rule.selector.match(/^\.((?:\\[0-9a-fA-F]{1,6}[ \t\n\r\f]?|\\.|[\w\- -￿])+)$/);
      if (!match) continue;
      const name = lens.unescapeIdent(match[1]);
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(...rule.decls);
    }
    return map;
  }

  function baseDecls(utility, ctx) {
    if (ctx.singles.has(utility)) return ctx.singles.get(utility);
    const prop = utility.match(/^\[([a-z-]+):(.+)\]$/);
    if (prop) return [{ prop: prop[1], value: prop[2].replace(/(?<!\\)_/g, ' ').replace(/\\_/g, '_') }];
    if (INVERSE.has(utility)) return INVERSE.get(utility);
    const negative = utility.startsWith('-');
    const name = negative ? utility.slice(1) : utility;
    for (let at = name.lastIndexOf('-'); at > 0; at = name.lastIndexOf('-', at - 1)) {
      const prefix = name.slice(0, at);
      const suffix = name.slice(at + 1);
      const siblings = [...ctx.singles.entries()].filter(([cls]) => cls.startsWith(prefix + '-') && !cls.slice(prefix.length + 1).includes('-'));
      for (const [cls, decls] of siblings) {
        const sibSuffix = cls.slice(prefix.length + 1);
        const visible = decls.filter((d) => !d.prop.startsWith('--tw-'));
        let generated = null;
        if (/^\[.+\]$/.test(suffix) || /^\(--[\w-]+\)$/.test(suffix)) {
          const value = suffix.startsWith('(') ? `var(${suffix.slice(1, -1)})` : suffix.slice(1, -1).replace(/(?<!\\)_/g, ' ');
          const fits = visible.length && visible.every((d) => d.value === visible[0].value && CSS.supports(d.prop, value));
          if (fits) generated = decls.map((d) => (d.prop.startsWith('--tw-') ? d : { ...d, value }));
        } else if (/^\d*\.?\d+$/.test(suffix) && /^\d*\.?\d+$/.test(sibSuffix)) {
          const pattern = new RegExp(`\\*\\s*${sibSuffix.replace('.', '\\.')}\\)`, 'g');
          if (visible.length && visible.every((d) => d.value.match(pattern))) generated = decls.map((d) => ({ ...d, value: d.value.replace(pattern, `* ${suffix})`) }));
        } else if (/^\d+\/\d+$/.test(suffix) && /^\d+\/\d+$/.test(sibSuffix)) {
          if (visible.length && visible.every((d) => d.value.includes(sibSuffix))) generated = decls.map((d) => ({ ...d, value: d.value.split(sibSuffix).join(suffix) }));
        } else if (/^[a-z][\w-]*$/i.test(suffix)) {
          const token = new RegExp(`(var\\(--[\\w-]*-)${sibSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[,)])`);
          if (visible.length && visible.every((d) => token.test(d.value))) generated = decls.map((d) => ({ ...d, value: d.value.replace(token, `$1${suffix}`) }));
        }
        if (generated) return negative ? generated.map((d) => (d.prop.startsWith('--') ? d : { ...d, value: `calc(${d.value} * -1)` })) : generated;
      }
    }
    return null;
  }

  function classToCss(cls, ctx) {
    const { variants, utility } = lens.variantsOf(cls);
    const important = /^!|!$/.test(utility);
    const decls = baseDecls(utility.replace(/^!|!$/g, ''), ctx);
    if (!decls || !decls.length) return null;
    const wrap = variantWrapper(variants, ctx);
    if (!wrap) return null;
    const selector = wrap.sel.split('\u0000').join('.' + CSS.escape(cls));
    let css = `${selector} { ${decls.map((d) => `${d.prop}: ${d.value}${important || d.important ? ' !important' : ''};`).join(' ')} }`;
    for (const s of [...wrap.supports].reverse()) css = `@supports ${s} { ${css} }`;
    for (const m of [...wrap.media].reverse()) css = `@media ${m} { ${css} }`;
    return css;
  }

  function context(index, rootPx) {
    return {
      v4: index.layers.includes('theme') || index.rules.some((rule) => rule.decls.some((d) => d.value.includes('var(--spacing)'))),
      rootPx: rootPx || 16,
      templates: makeVariantTemplates(index),
      singles: singleClassRules(index),
    };
  }

  window.ClassLensTailwind = { context, convertDecls, expandShorthands, cssToTailwind, classToCss, singleClassRules };
})();

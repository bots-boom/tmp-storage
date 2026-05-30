'use strict';

module.exports = {
  config: {
    name       : 'help',
    aliases    : ['h'],
    version    : '3.1',
    author     : 'Ayan',
    countDown  : 5,
    role       : 0,
    description: { en: 'Show command list or command details' },
    category   : 'bot',
    guide      : {
      en: [
        '   {pn}            — list all commands',
        '   {pn} <page>     — jump to a page',
        '   {pn} <command>  — show command details'
      ].join('\n')
    },
    payload : 'HELP_PAYLOAD',
    priority: 1
  },

  langs: {
    en: {
      notFound: '⚠️ Command "%1" not found.',
      noAlias : '—',
      everyone: 'Everyone',
      admin   : 'Admin only'
    }
  },

  onStart: async function ({ args, message, prefix, getLang, commandName, isAdmin }) {
    const f = global.utils.font;

    let commands = Array.from(global.PageBot.commands.values());
    if (!isAdmin) commands = commands.filter(c => (c.config.role || 0) < 2);

    // ── Detail view ───────────────────────────────────────────────────────────
    if (args[0] && isNaN(args[0])) {
      const key = args[0].toLowerCase();
      const cmd = global.PageBot.commands.get(key)
               || global.PageBot.commands.get(global.PageBot.aliases.get(key));
      if (!cmd || (!isAdmin && (cmd.config.role || 0) >= 2))
        return message.reply(getLang('notFound', args[0]));
      return message.reply(buildDetail(cmd, prefix, getLang, f));
    }

    // ── List view ─────────────────────────────────────────────────────────────
    const byCat = {};
    for (const cmd of commands) {
      const cat = (cmd.config.category || 'misc').toLowerCase();
      (byCat[cat] = byCat[cat] || []).push(cmd);
    }
    for (const cat in byCat) byCat[cat].sort((a, b) => a.config.name.localeCompare(b.config.name));
    const sortedCats = Object.keys(byCat).sort();

    const page = Math.max(1, parseInt(args[0], 10) || 1);
    return sendList(message, byCat, sortedCats, page, prefix, commandName, f);
  }
};

// ── Constants ────────────────────────────────────────────────────────────────
const ICON = {
  info: 'ℹ️', utility: '🛠️', economy: '💰', fun: '🎉',
  game: '🎮', anime: '🌸', image: '🖼️', media: '🎵',
  ai: '🤖', nsfw: '🔞', admin: '🛡️', system: '⚙️',
  misc: '📦', bot: '👻', search: '🔎'
};

const PER_PAGE = 7;

// ── List ─────────────────────────────────────────────────────────────────────
async function sendList(message, byCat, sortedCats, page, prefix, commandName, f) {
  const flat = [];
  for (const cat of sortedCats) for (const cmd of byCat[cat]) flat.push({ cat, cmd });

  const total      = flat.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const cur        = Math.max(1, Math.min(page, totalPages));
  const slice      = flat.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  const lines = [];

  // ── Header box ──
  lines.push(`╭──────────────────────╮`);
  lines.push(`  👻 ${f('Ayan', 'cursive')}${f('-Bot', 'cursive')}`);
  lines.push(`  ${f('Page', 'bold')} ${f(String(cur), 'bold')}${f('/', 'bold')}${f(String(totalPages), 'bold')}  ·  ${f(String(total), 'bold')} ${f('cmds', 'bold')}`);
  lines.push(`╰──────────────────────╯`);
  lines.push('');

  // ── Commands ──
  let lastCat = '';
  for (const { cat, cmd } of slice) {
    if (cat !== lastCat) {
      if (lastCat) lines.push('');
      lines.push(`${ICON[cat] || '•'}  ${f(cat.toUpperCase(), 'bold')}`);
      lastCat = cat;
    }
    const name = f(cmd.config.name, 'sansitalic');
    lines.push(`  ◦ ${prefix}${name}`);
  }

  // ── Footer ──
  lines.push('');
  lines.push(`▸ ${prefix}${f(commandName, 'sansitalic')} ${f('<cmdname>', 'italic')} for details`);

  const text    = lines.join('\n').slice(0, 640);
  const buttons = [];
  if (cur > 1)          buttons.push({ type: 'postback', title: '◀  Prev', payload: `HELP_PAGE_${cur - 1}` });
  if (cur < totalPages) buttons.push({ type: 'postback', title: 'Next  ▶', payload: `HELP_PAGE_${cur + 1}` });

  return buttons.length ? message.sendButton(text, buttons) : message.reply(text);
}

// ── Detail ───────────────────────────────────────────────────────────────────
function buildDetail(cmd, prefix, getLang, f) {
  const cfg     = cmd.config;
  const cat     = (cfg.category || 'misc').toLowerCase();
  const aliases = cfg.aliases?.length
    ? cfg.aliases.map(a => `${prefix}${f(a, 'sansitalic')}`).join('  ')
    : getLang('noAlias');
  const role  = cfg.role || 0;
  const guide = (cfg.guide?.en || `${prefix}${cfg.name}`)
    .replace(/\{pn\}/g, prefix + cfg.name).trim();

  const lines = [];

  // ── Header box ──
  lines.push(`╭──────────────────────╮`);
  lines.push(`  ${ICON[cat] || '📦'}  ${f(cfg.name.toUpperCase(), 'bolditalic')}`);
  if (cfg.description?.en) lines.push(`  ${cfg.description.en}`);
  lines.push(`╰──────────────────────╯`);
  lines.push('');

  // ── Info ──
  lines.push(f('Info', 'bold'));
  lines.push(`  ${f('Aliases', 'sansitalic')}   ${aliases}`);
  lines.push(`  ${f('Category', 'sansitalic')}  ${ICON[cat] || '•'} ${cat}`);
  lines.push(`  ${f('Access', 'sansitalic')}    ${role >= 2 ? getLang('admin') : getLang('everyone')}`);
  lines.push(`  ${f('Cooldown', 'sansitalic')}  ${f(String(cfg.countDown || 0), 'bold')}s`);
  lines.push(`  ${f('Version', 'sansitalic')}   ${f(String(cfg.version || '1.0'), 'bold')}`);
  lines.push('');

  // ── Usage ──
  lines.push(f('Usage', 'bold'));
  for (const l of guide.split('\n')) lines.push(`  ${l.replace(/^\s+/, '')}`);

  return lines.join('\n');
}

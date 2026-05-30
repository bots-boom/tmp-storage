'use strict';

module.exports = {
  config: {
    name: 'help',
    aliases: ['h'],
    version: '2.0',
    author: 'Ayan',
    countDown: 5,
    role: 0,
    description: { en: 'Show command list or command details' },
    category: 'bot',
    guide: {
      en: [
        '   {pn}            — list all commands',
        '   {pn} <page>     — jump to a page',
        '   {pn} <command>  — show command details'
      ].join('\n')
    },
    payload: 'HELP_PAYLOAD',
    priority: 1
  },

  langs: {
    en: {
      commandNotFound: '⚠️ Command "%1" not found.',
      noAlias:         '—',
      roleEveryone:    'everyone',
      roleNsfw:        'NSFW user',
      roleAdmin:       'bot admin'
    }
  },

  onStart: async function ({ args, message, prefix, getLang, commandName, isAdmin }) {
    let commands = Array.from(global.PageBot.commands.values());

    if (!isAdmin) {
      commands = commands.filter(cmd => (cmd.config.role || 0) < 2);
    }

    const byCat = {};
    for (const cmd of commands) {
      const cat = (cmd.config.category || 'misc').toLowerCase();
      (byCat[cat] = byCat[cat] || []).push(cmd);
    }
    for (const cat in byCat) {
      byCat[cat].sort((a, b) => a.config.name.localeCompare(b.config.name));
    }
    const sortedCats = Object.keys(byCat).sort();

    if (args[0] && isNaN(args[0])) {
      const key = args[0].toLowerCase();
      const cmd = global.PageBot.commands.get(key)
               || global.PageBot.commands.get(global.PageBot.aliases.get(key));
      if (!cmd) return message.reply(getLang('commandNotFound', args[0]));
      if (!isAdmin && (cmd.config.role || 0) >= 2) {
        return message.reply(getLang('commandNotFound', args[0]));
      }
      return message.reply(buildDetail(cmd, prefix, getLang));
    }

    const page = parseInt(args[0], 10) || 1;
    return sendList(message, byCat, sortedCats, page, prefix, commandName);
  }
};

const RULE = '━━━━━━━━━━━━━━━━━━━';
const CAT_ICON = {
  info:     'ℹ️',
  utility:  '🛠️',
  economy:  '💰',
  fun:      '🎉',
  game:     '🎮',
  anime:    '🌸',
  image:    '🖼️',
  media:    '🎬',
  ai:       '🤖',
  nsfw:     '🔞',
  admin:    '🛡️',
  system:   '⚙️',
  misc:     '📦',
  bot:      '👻',
  search:   '🔎'
};

async function sendList(message, byCat, sortedCats, page, prefix, commandName) {
  const f = global.utils.font;

  const flat = [];
  for (const cat of sortedCats) for (const cmd of byCat[cat]) flat.push({ cat, cmd });

  const perPage     = 12;
  const totalCmds   = flat.length;
  const totalPages  = Math.max(1, Math.ceil(totalCmds / perPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start       = (currentPage - 1) * perPage;
  const slice       = flat.slice(start, start + perPage);

  const lines = [];
  lines.push(`🌊  ${f('Ayan', 'bold')}  ·  ${f('Available cmds', 'bold')}`);
  lines.push(RULE);
  lines.push('');

  let lastCat = '';
  for (const { cat, cmd } of slice) {
    if (cat !== lastCat) {
      if (lastCat) lines.push('');
      const icon = CAT_ICON[cat] || '•';
      const count = byCat[cat].length;
      lines.push(`${icon}  ${f(cat.toUpperCase(), 'bold')}  (${count})`);
      lastCat = cat;
    }
    const name =  cmd.config.name || ''; 
    const desc = cmd.config.description?.en || '';
    lines.push(`   • ${f(name, 'sansitalic')} : ${desc}`);
  }

  lines.push('');
  lines.push(RULE);
  lines.push(`📑 Page ${f(String(currentPage), 'bold')}/${f(String(totalPages), 'bold')}  ·  ${f(String(totalCmds), 'bold')} commands`);
  lines.push(`💡 ${prefix}${commandName} <cmd>  for details`);
  if (totalPages > 1) {
    lines.push(`↪ ${prefix}${commandName} <page>  for more`);
  }

  const qr = [];
  if (currentPage > 1)            qr.push({ content_type: 'text', title: '◀ Prev',  payload: `HELP_PAGE_${currentPage - 1}` });
  if (currentPage < totalPages)   qr.push({ content_type: 'text', title: 'Next ▶', payload: `HELP_PAGE_${currentPage + 1}` });

  const body = lines.join('\n');
  return qr.length ? message.sendQuickReply(body, qr) : message.reply(body);
}

function buildDetail(cmd, prefix, getLang) {
  const f   = global.utils.font;
  const cfg = cmd.config;

  const aliases = cfg.aliases?.length ? cfg.aliases.join(', ') : getLang('noAlias');
  const role = cfg.role || 0;
  const roleLabel =
    role >= 2 ? `${f('2', 'bold')} · ${getLang('roleAdmin')} 🛡️` :
    role === 1 ? `${f('1', 'bold')} · ${getLang('roleNsfw')} 🔞` :
                 `${f('0', 'bold')} · ${getLang('roleEveryone')}`;

  const cat = (cfg.category || 'misc').toLowerCase();
  const catIcon = CAT_ICON[cat] || '📦';

  const guide = cfg.guide?.en
    ? cfg.guide.en.replace(/\{pn\}/g, prefix + cfg.name)
    : `${prefix}${cfg.name}`;

  const lines = [];
  lines.push(`✦  ${f(cfg.name, 'bold')}`);
  if (cfg.description?.en) lines.push(`✎ ${cfg.description.en}\n`);

  lines.push(`📋 ${f('INFO', 'bold')}`);
  lines.push(`   • Aliases   : ${aliases}`);
  lines.push(`   • Category  : ${catIcon} ${cat}`);
  lines.push(`   • Role      : ${roleLabel}`);
  lines.push(`   • Cooldown  : ${f(String(cfg.countDown || 0), 'bold')}s`);
  lines.push(`   • Version   : ${f(String(cfg.version || '1.0'), 'bold')}`);
  lines.push(`   • Author    : ${cfg.author || 'unknown'}`);
  lines.push('');

  lines.push(`📖 ${f('USAGE', 'bold')}`);
  for (const l of guide.split('\n')) {
    lines.push(' ' + l.replace(/^\s+/, ''));
  }

  return lines.join('\n');
}

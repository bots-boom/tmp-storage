'use strict';

module.exports = {
  config: {
    name: 'help',
    aliases: ['h', 'menu'],
    version: '3.0', 
    author: 'Ayan',
    countDown: 5,
    role: 0,
    description: { en: 'Displays a beautiful command menu.' },
    category: 'system',
    guide: {
      en: [
        '   {pn}            — Open the menu',
        '   {pn} <page>     — Go to specific page',
        '   {pn} <command>  — View command info'
      ].join('\n')
    },
    payload: 'HELP_PAYLOAD',
    priority: 1
  },

  langs: {
    en: {
      commandNotFound: '⚠️ Oops! The command "%1" does not exist.',
      noAlias: 'None',
      roleEveryone: 'Everyone 🟢',
      roleNsfw: 'NSFW Only 🔞',
      roleAdmin: 'Admin Only 🔴'
    }
  },

  onStart: async function ({ args, message, prefix, getLang, commandName, isAdmin }) {
    let commands = Array.from(global.PageBot.commands.values());

    // Filter commands based on user role
    if (!isAdmin) {
      commands = commands.filter(cmd => (cmd.config.role || 0) < 2);
    }

    // Group commands by category
    const categorized = {};
    for (const cmd of commands) {
      const cat = (cmd.config.category || 'uncategorized').toLowerCase();
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(cmd);
    }

    // Sort categories alphabetically
    const sortedCats = Object.keys(categorized).sort();

    // Handle single command detail view
    if (args[0] && isNaN(args[0])) {
      const query = args[0].toLowerCase();
      const cmd = global.PageBot.commands.get(query) 
               || global.PageBot.commands.get(global.PageBot.aliases.get(query));
      
      if (!cmd || (!isAdmin && (cmd.config.role || 0) >= 2)) {
        return message.reply(getLang('commandNotFound', args[0]));
      }
      return message.reply(buildDetailView(cmd, prefix, getLang));
    }

    // Handle paginated list view
    const page = parseInt(args[0], 10) || 1;
    return sendAestheticList(message, categorized, sortedCats, page, prefix, commandName);
  }
};

/* ─────────────────────────────────────────────────────────
   Aesthetic Helper Functions
───────────────────────────────────────────────────────── */

const CAT_EMOJIS = {
  info: 'ℹ️', utility: '🛠️', economy: '💳', fun: '🎈',
  game: '🎮', anime: '🌸', image: '🖼️', media: '🎬',
  ai: '🤖', nsfw: '🔞', admin: '🛡️', system: '⚙️',
  misc: '📦', bot: '✨', search: '🔍'
};

async function sendAestheticList(message, categorized, sortedCats, page, prefix, commandName) {
  const flatList = [];
  for (const cat of sortedCats) {
    for (const cmd of categorized[cat]) flatList.push({ cat, cmd });
  }

  // Set perPage to 6 to absolutely guarantee safety from FB's 640 char limit
  const perPage = 6;
  const totalCmds = flatList.length;
  const totalPages = Math.max(1, Math.ceil(totalCmds / perPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  
  const startIndex = (currentPage - 1) * perPage;
  const pageItems = flatList.slice(startIndex, startIndex + perPage);

  // Build the Header
  let text = `╭─── ✧ 𝗔𝗬𝗔𝗡 𝗠𝗘𝗡𝗨 ✧ ───╮\n\n`;

  // Build the Command List
  let currentCategory = '';
  for (const { cat, cmd } of pageItems) {
    if (cat !== currentCategory) {
      if (currentCategory) text += `\n`; // Add spacing between different categories
      const emoji = CAT_EMOJIS[cat] || '📁';
      const catTitle = cat.charAt(0).toUpperCase() + cat.slice(1);
      text += `${emoji} — ${catTitle.toUpperCase()} —\n`;
      currentCategory = cat;
    }
    
    const name = cmd.config.name;
    const rawDesc = cmd.config.description?.en || 'No description provided.';
    // Truncate descriptions to keep the string lightweight
    const desc = rawDesc.length > 25 ? rawDesc.substring(0, 22) + '...' : rawDesc;

    text += ` ╰┈➤ ${prefix}${name} : ${desc}\n`;
  }

  // Build the Footer
  text += `\n╰─────────────────────╯\n`;
  text += ` 📄 𝗣𝗮𝗴𝗲 [ ${currentPage} / ${totalPages} ]  ·  ${totalCmds} 𝗰𝗺𝗱𝘀\n`;
  text += ` 💡 𝗧𝗶𝗽: ${prefix}${commandName} <cmd_name>`;

  // Build Buttons
  const buttons = [];
  if (currentPage > 1) {
    buttons.push({ type: 'postback', title: '◀ Back', payload: `HELP_PAGE_${currentPage - 1}` });
  }
  if (currentPage < totalPages) {
    buttons.push({ type: 'postback', title: 'Next ▶', payload: `HELP_PAGE_${currentPage + 1}` });
  }

  return buttons.length ? message.sendButton(text, buttons) : message.reply(text);
}

function buildDetailView(cmd, prefix, getLang) {
  const cfg = cmd.config;

  const aliases = cfg.aliases?.length ? cfg.aliases.join(', ') : getLang('noAlias');
  const role = cfg.role || 0;
  const roleLabel = role >= 2 ? getLang('roleAdmin') : role === 1 ? getLang('roleNsfw') : getLang('roleEveryone');
  
  const cat = (cfg.category || 'misc').toLowerCase();
  const catIcon = CAT_EMOJIS[cat] || '📁';
  const catTitle = cat.charAt(0).toUpperCase() + cat.slice(1);

  const guide = cfg.guide?.en ? cfg.guide.en.replace(/\{pn\}/g, prefix + cfg.name) : `${prefix}${cfg.name}`;

  let text = `✦ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗: ${cfg.name.toUpperCase()} ✦\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += ` 🏷️ 𝗔𝗹𝗶𝗮𝘀𝗲𝘀  : ${aliases}\n`;
  text += ` ${catIcon} 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆 : ${catTitle}\n`;
  text += ` ⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻 : ${cfg.countDown || 0}s\n`;
  text += ` 🛡️ 𝗔𝗰𝗰𝗲𝘀𝘀   : ${roleLabel}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  text += `📖 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:\n`;
  text += `${cfg.description?.en || 'No description provided.'}\n\n`;

  text += `🛠️ 𝗨𝘀𝗮𝗴𝗲 𝗚𝘂𝗶𝗱𝗲:\n`;
  for (const line of guide.split('\n')) {
    text += `${line.trim()}\n`;
  }

  return text.trim();
}

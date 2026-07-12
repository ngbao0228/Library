// utils/embedBuilder.js
// Tập hợp các embed thực sự dùng bởi các command: profile, start (race select), race chosen, inventory, action result, error/info/help, stats.

const { EmbedBuilder } = require("discord.js");
const { COLORS, EMOJIS, COMMANDS_INFO } = require("./constants");
const racesData = require("../database/races");
const Items = require("../database/Items");

// Footer chuẩn
function createFooter() {
  const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return { text: `RPG Bot • lhelp <command> • time: ${time}` };
}

// Progress bar cho EXP
function createProgressBar(current, max, length = 15) {
  if (!max || max <= 0) return "0/0";
  const filledLength = Math.round((length * current) / max);
  const filled = "█".repeat(filledLength);
  const empty = "░".repeat(Math.max(0, length - filledLength));
  return `${filled}${empty} ${current}/${max}`;
}

// Small bar cho health display
function createSmallBar(current, max, length = 20) {
  if (!max || max <= 0) return "0/0";
  const filledLength = Math.round((length * current) / max);
  const filled = "█".repeat(filledLength);
  const empty = "░".repeat(Math.max(0, length - filledLength));
  return `${filled}${empty}`;
}

/**
 * Profile embed
 * - Hiển thị tên, tộc, level + progress, HP/MP/Stamina, attributes, freePoints
 */
function createProfileEmbed(player, user) {
  // Lấy race name từ race data
  let raceName = "Chưa chọn";
  if (player.race) {
    const raceData = racesData[player.race];
    raceName = raceData ? raceData.name : player.race;
  }

  return new EmbedBuilder()
    .setColor(COLORS.PROFILE)
    .setThumbnail(user.displayAvatarURL?.({ size: 256 }) ?? "")
    .addFields(
      {
        name: `${EMOJIS.PROFILE} Hồ Sơ`,
        value: `${player.profile?.name || player.username || "Unknown"}\n**Tộc:** ${raceName}`,
        inline: false
      },
      {
        name: `${EMOJIS.EXP} Level ${player.level?.level ?? 1}`,
        value: `\`${createProgressBar(player.level?.exp ?? 0, player.level?.nextExp ?? 0, 12)}\``,
        inline: false
      },
      {
        name: `${EMOJIS.HP} HP`,
        value: `${player.health?.hp ?? 0}/${player.health?.maxHp ?? 0}`,
        inline: true
      },
      {
        name: `${EMOJIS.MP} MP`,
        value: `${player.health?.mp ?? 0}/${player.health?.maxMp ?? 0}`,
        inline: true
      },
      {
        name: `${EMOJIS.STA} Stamina`,
        value: `${player.health?.stamina ?? 0}/${player.health?.maxStamina ?? 0}`,
        inline: true
      }
    )
    .addFields(
      {
        name: `⚙️ Attributes`,
        value: `VIT: ${player.attributes?.vit ?? 0} | INT: ${player.attributes?.int ?? 0} | STA: ${player.attributes?.sta ?? 0}`,
        inline: false
      },
      {
        name: `🎯 Điểm tự do`,
        value: `${player.freePoints ?? 0} điểm`,
        inline: false
      }
    )
    .setFooter(createFooter());
}

/**
 * Race selection embed (dùng với StringSelectMenu)
 * - Mô tả ngắn cho mỗi tộc
 */
function createRaceSelectionEmbed() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle("Chào mừng — Chọn chủng tộc")
    .setDescription("Bạn có 2 phút để chọn tộc cho nhân vật. Mỗi tộc có ưu/nhược điểm riêng. Chọn xong sẽ tạo nhân vật.");

  for (const key of Object.keys(racesData)) {
    const raceData = racesData[key];
    
    // Tập hợp thông tin về base stats và abilities
    const statsInfo = [];
    const baseStats = raceData.baseStats || {};
    
    // So sánh với human baseline (100 HP, 100 Stamina, 20 MP)
    if (baseStats.hp && baseStats.hp !== 100) {
      statsInfo.push(`HP: ${baseStats.hp > 100 ? '+' : ''}${baseStats.hp - 100}`);
    }
    if (baseStats.stamina && baseStats.stamina !== 100) {
      statsInfo.push(`Stamina: ${baseStats.stamina > 100 ? '+' : ''}${baseStats.stamina - 100}`);
    }
    if (baseStats.mp && baseStats.mp !== 20) {
      statsInfo.push(`MP: ${baseStats.mp > 20 ? '+' : ''}${baseStats.mp - 20}`);
    }

    // Thêm abilities info
    const abilities = raceData.abilities || {};
    if (abilities.expMultiplierPercent) {
      statsInfo.push(`EXP +${abilities.expMultiplierPercent}%`);
    }
    if (abilities.maxHpPercent) {
      statsInfo.push(`MaxHP +${abilities.maxHpPercent}%`);
    }
    if (abilities.maxStaminaPercent) {
      statsInfo.push(`MaxStamina +${abilities.maxStaminaPercent}%`);
    }

    const extras = statsInfo.length ? `\n${statsInfo.join(" • ")}` : "";

    embed.addFields({
      name: `${raceData.name}`,
      value: `${raceData.desc}${extras}`,
      inline: false
    });
  }

  embed.setFooter(createFooter());
  return embed;
}

/**
 * Tạo embed xác nhận đã chọn race
 */
function createRaceChosenEmbed(playerName, raceId) {
  const raceData = racesData[raceId] || { name: raceId, desc: "" };
  const title = playerName 
    ? `${EMOJIS.SUCCESS} ${playerName} — Bạn đã chọn tộc: ${raceData.name}` 
    : `${EMOJIS.SUCCESS} Bạn đã chọn: ${raceData.name}`;

  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(title)
    .setDescription(`${raceData.desc}\n\nDùng \`lprofile\` để xem hồ sơ của bạn.\nDùng \`lhelp\` để xem các lệnh.`)
    .setFooter(createFooter());
}

/**
 * Inventory embed
 */
function createInventoryEmbed(player, itemsModel, user) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INVENTORY)
    .setTitle(`${EMOJIS.INVENTORY} Túi đồ của bạn`)
    .setThumbnail(user.displayAvatarURL?.({ size: 256 }) ?? "");

  if (!player.inventory || player.inventory.length === 0) {
    embed.setDescription("Túi đồ trống!");
    embed.setFooter(createFooter());
    return embed;
  }

  const materials = [];
  const weapons = [];
  const consumables = [];

  for (const it of player.inventory) {
    const info = itemsModel[it.id] || { name: it.id, emoji: "" };
    const line = `${info.emoji || ""} ${info.name || it.id} x${it.amount}`;
    if (info.type === "material") materials.push(line);
    else if (info.type === "weapon") weapons.push(line);
    else if (info.type === "consumable") consumables.push(line);
    else materials.push(line);
  }

  if (materials.length) embed.addFields({ name: `${EMOJIS.MATERIAL} Vật liệu`, value: materials.join("\n"), inline: false });
  if (weapons.length) embed.addFields({ name: `${EMOJIS.WEAPON} Vũ khí`, value: weapons.join("\n"), inline: false });
  if (consumables.length) embed.addFields({ name: `${EMOJIS.CONSUMABLE} Thuốc`, value: consumables.join("\n"), inline: false });

  embed.setFooter(createFooter());
  return embed;
}

/**
 * Action result (mine/chop)
 */
function createActionResultEmbed(actionName, drops, finalExp, player) {
  const itemsText = (drops && drops.length)
    ? drops.map(d => {
      const info = Items[d.id] || { emoji: "", name: d.id };
      return `${info.emoji || ""} ${info.name || d.id} x${d.amount}`;
    }).join("\n")
    : "Không nhận được gì.";

  return new EmbedBuilder()
    .setColor(COLORS.ACTION)
    .setTitle(`${actionName} • Đã hoàn thành`)
    .addFields(
      { name: `-2 Stamina ${EMOJIS.STA}`, value: ``, inline: true },
      { name: "", value: `───────────────────────────`, inline: false },
      { name: "nhận được", value: itemsText, inline: false },
      { name: "thưởng", value: `+${finalExp} EXP \`${player.level.exp}/${player.level.nextExp}\``, inline: false },
    )
    .setFooter(createFooter());
}

/**
 * Status embed - Shows VIT / INT / STA và cách phân phối điểm
 */
function createStatusEmbed(player) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`${EMOJIS.HELP} Thông số (Status)`)
    .addFields(
      {
        name: `VIT (Vitality): ${player.attributes?.vit ?? 0} pts`,
        value: `+5 HP / point\n+10 Stamina / 10 pts`,
        inline: false
      },
      { 
        name: `INT (Intelligence): ${player.attributes?.int ?? 0} pts`,
        value: `+2 MP / point\n+10 MP / 10 pts`,
        inline: false 
      },
      {
        name: `STA (Stamina): ${player.attributes?.sta ?? 0} pts`,
        value: `+1 Stamina / 2 pts\n+5 Stamina / 10 pts`,
        inline: false
      },
      {
        name: `Spoints: ${player.freePoints ?? 0} pts`,
        value: `\`lstatus <vit|int|sta> <qty>\` để nhập số lượng`,
        inline: false
      }
    )
    .setFooter(createFooter());
}

/**
 * Race detail embed - Hiển thị thông tin chi tiết của 1 tộc
 */
function createRaceDetailEmbed(raceId) {
  const raceData = racesData[raceId];
  if (!raceData) return null;

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`${raceData.name}`)
    .setDescription(raceData.desc);

  // Thêm base stats
  const baseStats = raceData.baseStats || {};
  embed.addFields({
    name: "📊 Chỉ số cơ bản",
    value: `HP: ${baseStats.hp ?? 100} | MP: ${baseStats.mp ?? 20} | Stamina: ${baseStats.stamina ?? 100}`,
    inline: false
  });

  // Thêm abilities
  const abilities = raceData.abilities || {};
  const abilityTexts = [];
  
  if (abilities.expMultiplierPercent) {
    abilityTexts.push(`⭐ EXP Multiplier: +${abilities.expMultiplierPercent}%`);
  }
  if (abilities.maxHpPercent) {
    abilityTexts.push(`❤️ Max HP Bonus: +${abilities.maxHpPercent}%`);
  }
  if (abilities.maxStaminaPercent) {
    abilityTexts.push(`⚡ Max Stamina Bonus: +${abilities.maxStaminaPercent}%`);
  }

  if (abilityTexts.length > 0) {
    embed.addFields({
      name: "✨ Khả năng đặc biệt",
      value: abilityTexts.join("\n"),
      inline: false
    });
  }

  embed.setFooter(createFooter());
  return embed;
}

/** Generic embeds: success / error / info */
function createSuccessEmbed(title, description, color = COLORS.SUCCESS) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${EMOJIS.SUCCESS} ${title}`)
    .setDescription(description)
    .setFooter(createFooter());
}

function createErrorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.ERROR)
    .setTitle(`${EMOJIS.ERROR} Lỗi`)
    .setDescription(message)
    .setFooter(createFooter());
}

function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(title)
    .setDescription(description)
    .setFooter(createFooter());
}

/** Help / command detail builders (use COMMANDS_INFO) */
function createHelpEmbed() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.HELP)
    .setTitle(`${EMOJIS.HELP} Trợ Giúp Commands`)
    .setDescription("Danh sách tất cả commands có sẵn\nDùng `lhelp <command>` để xem chi tiết");

  const categories = {};
  for (const [key, cmd] of Object.entries(COMMANDS_INFO)) {
    if (!categories[cmd.category]) categories[cmd.category] = [];
    categories[cmd.category].push(cmd);
  }
  for (const [c, cmds] of Object.entries(categories)) {
    const list = cmds.map(cmd => `${cmd.emoji} \`${cmd.usage}\` - ${cmd.description}`).join("\n");
    embed.addFields({ name: c, value: list, inline: false });
  }

  embed.setFooter(createFooter());
  return embed;
}

function createCommandDetailEmbed(commandName) {
  const cmd = COMMANDS_INFO[commandName?.toLowerCase()];
  if (!cmd) return null;
  const embed = new EmbedBuilder()
    .setColor(COLORS.HELP)
    .setTitle(`${cmd.emoji} Command: ${cmd.name}`)
    .addFields(
      { name: "📝 Mô tả", value: cmd.description, inline: false },
      { name: "🎯 Cách sử dụng", value: `\`${cmd.usage}\``, inline: false },
      { name: "📖 Chi tiết", value: cmd.details || "Không có", inline: false }
    )
    .setFooter(createFooter());
  return embed;
}

function createAdminEmbed() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle("🛠️ Admin Console")
    .setDescription("Danh sách lệnh admin")
    .addFields(
      { name: "`<lad reset @user>`", value: "Reset toàn bộ dữ liệu người chơi", inline: false }
    )
    .setFooter(createFooter());

  return embed;
}

/**
 * Embed cho me - regenTimes: { hp: ms, mp: ms, stamina: ms } thời gian tới lần hồi tiếp theo
 */
function createMeEmbed(player, user, regenTimes = {}) {
  // Lấy race name
  let raceName = "Chưa chọn";
  if (player.race) {
    const raceData = racesData[player.race];
    raceName = raceData ? raceData.name : player.race;
  }

  const hpBar = createSmallBar(player.health?.hp ?? 0, player.health?.maxHp ?? 0, 15);
  const mpBar = createSmallBar(player.health?.mp ?? 0, player.health?.maxMp ?? 0, 15);
  const stBar = createSmallBar(player.health?.stamina ?? 0, player.health?.maxStamina ?? 0, 15);

  // format time as mm:ss
  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, "0")}`;
  }

  return new EmbedBuilder()
    .setColor(COLORS.PROFILE)
    .setTitle(`${player.profile?.name || player.username || "Unknown"} — ${raceName}`)
    .setThumbnail(user.displayAvatarURL?.({ size: 256 }) ?? "")
    .addFields(
      { name: `⭐ Level ${player.level?.level ?? 1}`, value: `\`${createProgressBar(player.level?.exp ?? 0, player.level?.nextExp ?? 0, 12)}\``, inline: false },
      { name: `${EMOJIS.HP} HP ${createProgressBar(player.health?.hp ?? 0, player.health?.maxHp ?? 0, 0)} `, value: `\`${hpBar}\`\nNext: ${fmt(regenTimes.nextTick?.hp ?? 0)} (+${regenTimes.perTick?.hp ?? 0}) • Full: ${fmt(regenTimes.timeToFull?.hp ?? 0)}`, inline: false },
      { name: `${EMOJIS.MP} MP ${createProgressBar(player.health?.mp ?? 0, player.health?.maxMp ?? 0, 0)} `, value: `\`${mpBar}\`\nNext: ${fmt(regenTimes.nextTick?.mp ?? 0)} (+${regenTimes.perTick?.mp ?? 0}) • Full: ${fmt(regenTimes.timeToFull?.mp ?? 0)}`, inline: false },
      { name: `${EMOJIS.STA} STA ${createProgressBar(player.health?.stamina ?? 0, player.health?.maxStamina ?? 0, 0)} `, value: `\`${stBar}\`\nNext: ${fmt(regenTimes.nextTick?.stamina ?? 0)} (+${regenTimes.perTick?.stamina ?? 0}) • Full: ${fmt(regenTimes.timeToFull?.stamina ?? 0)}`, inline: false }
    )
    .setFooter(createFooter());
}

module.exports = {
  createProgressBar,
  createProfileEmbed,
  createMeEmbed,
  createRaceSelectionEmbed,
  createRaceChosenEmbed,
  createRaceDetailEmbed,
  createInventoryEmbed,
  createActionResultEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createHelpEmbed,
  createCommandDetailEmbed,
  createStatusEmbed,
  createAdminEmbed
};

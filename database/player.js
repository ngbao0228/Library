// database/player.js
// Player model (SQLite) — hỗ trợ attributes, race, lastRegen và regeneration khi load/save
// ===== THAY ĐỔI: Load base stats từ race files =====

const dbModule = require("./db");
const { POINTS_PER_LEVEL, nextExpFor } = require("./level");
const racesData = require("./races");
const { applyExpMultiplier } = require("../utils/rate");

// Lấy race data từ race ID
function getRaceData(raceId) {
  return racesData[raceId] || null;
}

// Áp dụng bonus từ attributes lên các thông số dẫn xuất + áp dụng abilities từ race
function applyAttributesBonuses(player) {
  const vit = (player.attributes && player.attributes.vit) || 0;
  const intel = (player.attributes && player.attributes.int) || 0;
  const sta = (player.attributes && player.attributes.sta) || 0;

  // Base maxHp tăng theo level (theo logic: +10 maxHp mỗi level)
  const baseMaxHp = 100 + (player.level.level - 1) * 10;
  const extraHp = vit * 5;
  player.health.maxHp = baseMaxHp + extraHp;
  player.health.hp = Math.min(player.health.hp ?? player.health.maxHp, player.health.maxHp);

  // Stamina
  const extraSt_from_vit = Math.floor(vit / 10) * 10;
  const extraSt_from_sta = Math.floor(sta / 2) + Math.floor(sta / 10) * 5;
  const baseMaxStamina = 100;
  player.health.maxStamina = baseMaxStamina + extraSt_from_vit + extraSt_from_sta;
  player.health.stamina = Math.min(player.health.stamina ?? player.health.maxStamina, player.health.maxStamina);

  // Mana (MP)
  const extraMp_from_int = intel * 2 + Math.floor(intel / 10) * 10;
  const baseMaxMp = 20;
  player.health.maxMp = baseMaxMp + extraMp_from_int;
  player.health.mp = Math.min(player.health.mp ?? player.health.maxMp, player.health.maxMp);

  // ===== THAY ĐỔI: Áp dụng abilities từ race =====
  if (player.race) {
    const raceData = getRaceData(player.race);
    if (raceData && raceData.abilities) {
      const ab = raceData.abilities;
      
      // Nếu race có maxHpPercent ability -> áp dụng lên maxHp
      if (ab.maxHpPercent) {
        player.health.maxHp = Math.floor(player.health.maxHp * (1 + ab.maxHpPercent / 100));
        player.health.hp = Math.min(player.health.hp, player.health.maxHp);
      }
      
      // Nếu race có maxStaminaPercent ability -> áp dụng lên maxStamina
      if (ab.maxStaminaPercent) {
        player.health.maxStamina = Math.floor(player.health.maxStamina * (1 + ab.maxStaminaPercent / 100));
        player.health.stamina = Math.min(player.health.stamina, player.health.maxStamina);
      }
      
      // expMultiplierPercent được xử lý trong addExp function
    }
  }
}

// Áp dụng regeneration dựa trên lastRegen timestamp (tính khi load hoặc trước hành động)
function applyRegeneration(player) {
  const now = Date.now();
  const last = player.lastRegen || player.createdAt || now;
  const elapsed = Math.max(0, now - last);

  const hpTicks = Math.floor(elapsed / 60000);      // mỗi 60s
  const mpTicks = Math.floor(elapsed / 60000);      // mỗi 60s
  const stamTicks = Math.floor(elapsed / 180000);   // mỗi 180s

  if (hpTicks > 0 && player.health.maxHp > 0) {
    const healHp = Math.floor(player.health.maxHp * 0.05 * hpTicks);
    player.health.hp = Math.min(player.health.maxHp, (player.health.hp || 0) + healHp);
  }
  if (mpTicks > 0 && player.health.maxMp > 0) {
    const healMp = Math.floor(player.health.maxMp * 0.05 * mpTicks);
    player.health.mp = Math.min(player.health.maxMp, (player.health.mp || 0) + healMp);
  }
  if (stamTicks > 0 && player.health.maxStamina > 0) {
    const healStam = Math.floor(player.health.maxStamina * 0.01 * stamTicks);
    player.health.stamina = Math.min(player.health.maxStamina, (player.health.stamina || 0) + healStam);
  }

  player.lastRegen = now;
}

// Kiểm tra tồn tại
async function exists(userId) {
  const db = await dbModule.init();
  const row = await db.get("SELECT 1 FROM players WHERE id = ?", userId);
  return !!row;
}

// ===== THAY ĐỔI: Tạo player với race data =====
async function create(userId, username = "", raceId = null) {
  const db = await dbModule.init();
  if (await exists(userId)) return null;

  const now = Date.now();
  const profile = JSON.stringify({ name: username });
  const stats = JSON.stringify({ hunt: 0, battle: 0, quest: 0 });
  const attributes = JSON.stringify({ vit: 0, int: 0, sta: 0 });
  const freePoints = POINTS_PER_LEVEL; // level 1 có 7 điểm

  // ===== THAY ĐỔI: Lấy base stats từ race data =====
  let hp = 100;
  let maxHp = 100;
  let mp = 20;
  let maxMp = 20;
  let stamina = 100;
  let maxStamina = 100;

  if (raceId) {
    const raceData = getRaceData(raceId);
    if (raceData && raceData.baseStats) {
      const bs = raceData.baseStats;
      hp = bs.hp ?? hp;
      maxHp = bs.maxHp ?? maxHp;
      mp = bs.mp ?? mp;
      maxMp = bs.maxMp ?? maxMp;
      stamina = bs.stamina ?? stamina;
      maxStamina = bs.maxStamina ?? maxStamina;
    }
  }

  const default_lastRegen = now;

  await db.run(
    `INSERT INTO players (
        id, username, profile, level_level, level_exp, level_nextExp,
        health_hp, health_maxHp, health_stamina, health_maxStamina, health_mp, health_maxMp,
        wallet_gold, wallet_diamond, stats, attributes, freePoints, race, lastRegen, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId, username, profile,
    1, 0, nextExpFor(1),
    hp, maxHp, stamina, maxStamina, mp, maxMp,
    100, 0, stats, attributes, freePoints, raceId || null, default_lastRegen, now
  );

  const player = await load(userId);
  applyAttributesBonuses(player);
  await save(userId, player);
  return player;
}

// Load player và inventory, parse JSON fields
async function load(userId) {
  const db = await dbModule.init();
  const row = await db.get("SELECT * FROM players WHERE id = ?", userId);
  if (!row) return null;

  const profile = row.profile ? JSON.parse(row.profile) : { name: row.username || "" };
  const stats = row.stats ? JSON.parse(row.stats) : { hunt: 0, battle: 0, quest: 0 };
  const attributes = row.attributes ? JSON.parse(row.attributes) : { vit: 0, int: 0, sta: 0 };

  const items = await db.all("SELECT itemId, amount FROM inventory WHERE userId = ?", userId);
  const inventory = items.map(i => ({ id: i.itemId, amount: i.amount }));

  const player = {
    id: row.id,
    username: row.username,
    profile,
    level: {
      level: row.level_level || 1,
      exp: row.level_exp || 0,
      nextExp: row.level_nextExp || nextExpFor(1)
    },
    health: {
      hp: row.health_hp ?? 100,
      maxHp: row.health_maxHp ?? 100,
      stamina: row.health_stamina ?? 100,
      maxStamina: row.health_maxStamina ?? 100,
      mp: row.health_mp ?? 0,
      maxMp: row.health_maxMp ?? 0
    },
    wallet: {
      gold: row.wallet_gold ?? 0,
      diamond: row.wallet_diamond ?? 0
    },
    inventory,
    stats,
    attributes,
    freePoints: row.freePoints || 0,
    race: row.race || null,
    lastRegen: row.lastRegen || row.createdAt || Date.now(),
    createdAt: row.createdAt || Date.now()
  };

  applyAttributesBonuses(player);
  applyRegeneration(player);

  return player;
}

// Save player object vào DB (transaction)
async function save(userId, player) {
  const db = await dbModule.init();

  applyAttributesBonuses(player);

  await db.run("BEGIN TRANSACTION");
  try {
    await db.run(
      `INSERT INTO players (
          id, username, profile, level_level, level_exp, level_nextExp,
          health_hp, health_maxHp, health_stamina, health_maxStamina, health_mp, health_maxMp,
          wallet_gold, wallet_diamond, stats, attributes, freePoints, race, lastRegen, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
          username=excluded.username,
          profile=excluded.profile,
          level_level=excluded.level_level,
          level_exp=excluded.level_exp,
          level_nextExp=excluded.level_nextExp,
          health_hp=excluded.health_hp,
          health_maxHp=excluded.health_maxHp,
          health_stamina=excluded.health_stamina,
          health_maxStamina=excluded.health_maxStamina,
          health_mp=excluded.health_mp,
          health_maxMp=excluded.health_maxMp,
          wallet_gold=excluded.wallet_gold,
          wallet_diamond=excluded.wallet_diamond,
          stats=excluded.stats,
          attributes=excluded.attributes,
          freePoints=excluded.freePoints,
          race=excluded.race,
          lastRegen=excluded.lastRegen,
          createdAt=excluded.createdAt
      `,
      userId,
      player.username || "",
      JSON.stringify(player.profile || {}),
      player.level.level,
      player.level.exp,
      player.level.nextExp,
      player.health.hp,
      player.health.maxHp,
      player.health.stamina,
      player.health.maxStamina,
      player.health.mp,
      player.health.maxMp,
      player.wallet.gold,
      player.wallet.diamond,
      JSON.stringify(player.stats || {}),
      JSON.stringify(player.attributes || { vit: 0, int: 0, sta: 0 }),
      player.freePoints || 0,
      player.race || null,
      player.lastRegen || Date.now(),
      player.createdAt || Date.now()
    );

    // Replace inventory
    await db.run("DELETE FROM inventory WHERE userId = ?", userId);
    const insert = await db.prepare("INSERT INTO inventory (userId, itemId, amount) VALUES (?, ?, ?)");
    for (const it of (player.inventory || [])) {
      await insert.run(userId, it.id, it.amount);
    }
    await insert.finalize();

    await db.run("COMMIT");
  } catch (err) {
    await db.run("ROLLBACK");
    throw err;
  }
}

async function resetPlayer(userId) {
  const db = await dbModule.init();
  await db.run("DELETE FROM players WHERE id = ?", userId);
  return true;
}

// Update pattern: load -> callback -> save
async function update(userId, callback) {
  const player = await load(userId);
  if (!player) return null;
  await callback(player);
  await save(userId, player);
  return player;
}

// ===== THAY ĐỔI: Khi cộng exp, áp dụng expMultiplierPercent từ race abilities =====
async function addExp(userId, amount) {
  return update(userId, p => {
    let finalAmount = amount;
    if (p.race) {
      const raceData = getRaceData(p.race);
      if (raceData && raceData.abilities && raceData.abilities.expMultiplierPercent) {
        finalAmount = applyExpMultiplier(amount, raceData.abilities.expMultiplierPercent);
      }
    }
    p.level.exp += finalAmount;

    // Kiểm tra level up (có thể level up nhiều lần)
    while (p.level.exp >= p.level.nextExp) {
      p.level.exp -= p.level.nextExp;
      p.level.level++;
      p.level.nextExp = nextExpFor(p.level.level);
      p.freePoints = (p.freePoints || 0) + POINTS_PER_LEVEL;
    }
  });
}

// Wrapper helpers
async function addGold(userId, amount) { return update(userId, p => { p.wallet.gold += amount; }); }
async function removeGold(userId, amount) { return update(userId, p => { p.wallet.gold = Math.max(0, p.wallet.gold - amount); }); }
async function damage(userId, amount) { return update(userId, p => { p.health.hp = Math.max(0, p.health.hp - amount); }); }
async function heal(userId, amount) { return update(userId, p => { p.health.hp = Math.min(p.health.maxHp, p.health.hp + amount); }); }
async function useStamina(userId, amount) { return update(userId, p => { p.health.stamina = Math.max(0, p.health.stamina - amount); }); }
async function restoreStamina(userId, amount) { return update(userId, p => { p.health.stamina = Math.min(p.health.maxStamina, p.health.stamina + amount); }); }
async function addItem(userId, itemId, amount = 1) { return update(userId, p => { const it = p.inventory.find(i => i.id === itemId); if (it) it.amount += amount; else p.inventory.push({ id: itemId, amount }); }); }
async function removeItem(userId, itemId, amount = 1) { return update(userId, p => { const it = p.inventory.find(i => i.id === itemId); if (!it) return; it.amount -= amount; if (it.amount <= 0) p.inventory = p.inventory.filter(x => x.id !== itemId); }); }

// Phân phối điểm attribute
async function addAttributePoints(userId, attrName, qty) {
  return update(userId, p => {
    p.attributes = p.attributes || { vit: 0, int: 0, sta: 0 };
    p.freePoints = p.freePoints || 0;
    if (p.freePoints < qty) throw new Error("NOT_ENOUGH_POINTS");
    if (!["vit", "int", "sta"].includes(attrName)) throw new Error("INVALID_ATTR");
    p.attributes[attrName] = (p.attributes[attrName] || 0) + qty;
    p.freePoints -= qty;
  });
}

module.exports = {
  exists,
  create,
  load,
  save,
  update,
  addGold,
  removeGold,
  addExp,
  damage,
  heal,
  useStamina,
  restoreStamina,
  addItem,
  removeItem,
  addAttributePoints,
  resetPlayer,
  getRaceData  // Export để dùng ở nơi khác
};

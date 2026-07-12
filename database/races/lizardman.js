// database/races/lizardman.js
// Bò sát - Cẩn thận, sức bền dồi dào

module.exports = {
  id: "lizardman",
  name: "Lizardman",
  desc: "Bò sát cẩn thận, sức bền dồi dào.",
  
  // ===== DỮ LIỆU CƠ SỞ (FIXED) =====
  baseStats: {
    // Health stats cơ bản khi tạo nhân vật
    hp: 100,
    maxHp: 100,
    mp: 15,       // -5 MP so với Human
    maxMp: 15,
    stamina: 120, // +20 Stamina so với Human
    maxStamina: 120
  },

  // ===== KHẢ NĂNG ĐẶC BIỆT (BONUS EFFECTS) =====
  abilities: {
    // Tăng % maxStamina (dựa trên maxStamina hiện tại)
    maxStaminaPercent: 10  // tức +10% maxStamina
  }
};

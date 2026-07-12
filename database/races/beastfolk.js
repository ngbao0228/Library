// database/races/beastfolk.js
// Thú tộc - Thiện chiến, có thể chất tốt

module.exports = {
  id: "beastfolk",
  name: "Beastfolk",
  desc: "Thú tộc thiện chiến, có thể chất tốt.",
  
  // ===== DỮ LIỆU CƠ SỞ (FIXED) =====
  baseStats: {
    // Health stats cơ bản khi tạo nhân vật
    hp: 120,      // +20 HP so với Human
    maxHp: 120,
    mp: 15,       // -5 MP so với Human
    maxMp: 15,
    stamina: 100,
    maxStamina: 100
  },

  // ===== KHẢ NĂNG ĐẶC BIỆT (BONUS EFFECTS) =====
  abilities: {
    // Tăng % maxHp (dựa trên maxHp hiện tại)
    maxHpPercent: 10  // tức +10% maxHp
  }
};

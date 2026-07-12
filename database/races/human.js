// database/races/human.js
// Nhân tộc - Chủng tộc cân bằng, có tài học hỏi

module.exports = {
  id: "human",
  name: "Human",
  desc: "Nhân tộc cân bằng, có tài học hỏi.",
  
  // ===== DỮ LIỆU CƠ SỞ (FIXED) =====
  baseStats: {
    // Health stats cơ bản khi tạo nhân vật
    hp: 100,
    maxHp: 100,
    mp: 20,
    maxMp: 20,
    stamina: 100,
    maxStamina: 100
  },

  // ===== KHẢ NĂNG ĐẶC BIỆT (BONUS EFFECTS) =====
  abilities: {
    // Tăng % exp nhận được từ hoạt động
    expMultiplierPercent: 10  // tức nhân thêm 1.10 khi tính exp
  }
};

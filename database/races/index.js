// database/races/index.js
// Tập hợp tất cả chủng tộc (Race models)
// Dùng để load race data dựa trên race ID

const human = require("./human");
const beastfolk = require("./beastfolk");
const lizardman = require("./lizardman");

// Export dưới dạng object (key: race ID, value: race data)
module.exports = {
  human,
  beastfolk,
  lizardman
};

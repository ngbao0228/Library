// commands/play/start.js
// Khởi tạo nhân vật mới - chọn tộc -> tạo player với race base stats -> hiển thị profile

const Player = require("../../database/player");
const racesData = require("../../database/races");
const Countdown = require("../../utils/countdown");
const { createRaceSelectionEmbed, createErrorEmbed, createRaceChosenEmbed, createProfileEmbed } = require("../../utils/embedBuilder");
const { ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require("discord.js");

module.exports = {
  name: "start",
  async execute(message) {
    // ===== KIỂM TRA: Đã có nhân vật chưa =====
    if (await Player.exists(message.author.id)) {
      const errorEmbed = createErrorEmbed("Bạn đã có nhân vật.\nDùng `lprofile` để xem.");
      return message.reply({ embeds: [errorEmbed] });
    }

    // ===== TẠO RACE SELECTION EMBED =====
    const embed = createRaceSelectionEmbed();

    // ===== TẠO SELECT MENU CỦA CÁC TỘC =====
    // Lấy tất cả race ID từ racesData
    const options = Object.keys(racesData).map(key => ({
      label: racesData[key].name,
      description: racesData[key].desc.slice(0, 80),
      value: key  // value là race ID
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_race")
      .setPlaceholder("Chọn một chủng tộc...")
      .addOptions(options)
      .setMinValues(1)
      .setMaxValues(1);

    const row = new ActionRowBuilder().addComponents(select);

    // ===== GỬI MESSAGE VỀI SELECT MENU =====
    const sent = await message.reply({ embeds: [embed], components: [row] });

    // ===== CHỜ NGƯỜI DÙNG CHỌN TỘC =====
    try {
      const interaction = await sent.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        time: Countdown.START_TIMEOUT_MS,  // 2 phút
        filter: i => i.user.id === message.author.id
      });

      await interaction.deferUpdate();

      const raceId = interaction.values[0];  // Lấy race ID được chọn

      // ===== TẠO PLAYER VỚI RACE DATA =====
      const displayName = message.member?.displayName || message.author.username;
      await Player.create(message.author.id, displayName, raceId);

      // ===== LOAD PLAYER ĐỂ LẤY DỮ LIỆU =====
      const player = await Player.load(message.author.id);

      // ===== GỬI EMBED XÁC NHẬN ĐÃ CHỌN TỘC =====
      const confirmEmbed = createRaceChosenEmbed(player.profile.name, raceId);
      await message.channel.send({ embeds: [confirmEmbed] });

      // ===== GỬI PROFILE EMBED =====
      const profileEmbed = createProfileEmbed(player, message.author);
      await message.channel.send({ embeds: [profileEmbed] });

      // ===== DISABLE SELECT MENU =====
      const disabledSelect = new StringSelectMenuBuilder()
        .setCustomId("select_race_disabled")
        .setPlaceholder("Đã chọn")
        .addOptions(options)
        .setDisabled(true);

      const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);
      await sent.edit({ components: [disabledRow] });

    } catch (err) {
      // ===== XỬ LÝ TIMEOUT HOẶC LỖI =====
      try {
        const disabledSelect = new StringSelectMenuBuilder()
          .setCustomId("select_race_disabled")
          .setPlaceholder("Hết thời gian")
          .setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabledSelect);
        await sent.edit({ components: [disabledRow] });
      } catch (e) {
        /* ignore */
      }

      // Nếu timeout
      if (err.code === "INTERACTION_COLLECTOR_ERROR" || /time/i.test(err.message)) {
        await message.channel.send("⏰ Bạn đã hết 2 phút để chọn chủng tộc. Dùng `lstart` để thử lại.");
      } else {
        console.error("Lỗi khi chọn race:", err);
      }
    }
  }
};

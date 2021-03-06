const Telegraf = require("telegraf");
const spamMatchingPatterns = require("./spam_filters");
const superusers = require("./superusers");

class Bot {
  constructor(botToken, db) {
    this.bot = new Telegraf(botToken);

    this.bot.telegram.getMe().then((botInfo) => {
      this.bot.options.username = botInfo.username;
    });

    this.bot.command("start", (ctx) => {
      return ctx.reply("To add this group, add me as an admin and run /add.");
    });

    this.bot.command("add", (ctx) => {
      if (!ctx.chat.type.includes("group")) {
        return ctx.reply("This chat is not a group.");
      }

      if (db.groupExist(ctx.chat.id)) {
        return ctx.reply("This group has already been added.");
      }

      ctx
        .exportChatInviteLink()
        .then(async (inviteLink) => {
          const chat = await ctx.getChat(ctx.chat.id);
          db.addGroup(chat.id, chat.title, chat.invite_link);
          return ctx.reply("Group added.");
        })
        .catch((err) => {
          return ctx.reply("Error. Please add me as an admin and try again.");
        });
    });

    this.bot.command("remove", (ctx) => {
      if (!ctx.chat.type.includes("group")) {
        return ctx.reply("This chat is not a group.");
      }

      if (!db.groupExist(ctx.chat.id)) {
        return ctx.reply("This group does not exist.");
      }

      db.removeGroup(ctx.chat.id);
      return ctx.reply("Group removed.");
    });

    this.bot.on("new_chat_title", (ctx) => {
      if (db.groupExist(ctx.chat.id)) {
        db.updateGroupTitle(ctx.chat.id, ctx.chat.title);
      }
    });

    this.bot.on(["new_chat_members", "left_chat_member"], (ctx) => {
      ctx.deleteMessage(ctx.message.message_id);
    });

    this.bot.command("nuke", (ctx) => {
      if (ctx.message.reply_to_message && superusers.has(ctx.message.from.id)) {
        ctx.deleteMessage(ctx.message.reply_to_message.message_id);
      }
      ctx.deleteMessage(ctx.message.message_id);
    });

    this.bot.command("nuke_ban", (ctx) => {
      if (ctx.message.reply_to_message && superusers.has(ctx.message.from.id)) {
        ctx.deleteMessage(ctx.message.reply_to_message.message_id);
        ctx.kickChatMember(ctx.message.reply_to_message.from.id);
      }
      ctx.deleteMessage(ctx.message.message_id);
    });

    this.bot.on("text", (ctx) => {
      const messageText = ctx.message.text;
      if (
        spamMatchingPatterns.some((pattern) => messageText.includes(pattern))
      ) {
        if (ctx.message.from && ctx.message.from.id) {
          ctx.kickChatMember(ctx.message.from.id);
        }
        ctx.deleteMessage(ctx.message.message_id);
      }
    });
  }

  startPolling() {
    this.bot.launch();
  }
}

module.exports = Bot;

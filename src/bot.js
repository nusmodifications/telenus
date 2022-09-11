const Telegraf = require("telegraf");
const bannedUsers = require("./banned_users");
const spamMatchingPatterns = require("./spam_filters");
const superusers = require("./superusers");

const ANONYMOUS = "GroupAnonymousBot";

const allowedGroupNameRegex = /^[a-zA-z0-9]{3,}[a-zA-z0-9\/\(\)\s]*$/;

async function checkBannedWithEffects(ctx) {
  if (!ctx.message) {
    return false;
  }

  const isBanned = bannedUsers.has(ctx.message.from.id);

  if (isBanned) {
    try {
      console.log(`User ${ctx.message.from.id} is banned. Attempting ban...`);
      await ctx.banChatMember(ctx.message.from.id);
      console.log(`Banned user from group
      - Group ID: ${ctx.chat.id}
      - Group Name: ${ctx.message.chat.title}
      - User ID: ${ctx.message.from.id}
      - Username: ${ctx.message.from.username}
      - First Name: ${ctx.message.from.first_name}
      - Last Name: ${ctx.message.from.last_name}`);
    } catch (err) {
      console.log(`Unable to ban user from group
      - Group ID: ${ctx.chat.id}
      - Group Name: ${ctx.message.chat.title}
      - User ID: ${ctx.message.from.id}
      - Username: ${ctx.message.from.username}
      - First Name: ${ctx.message.from.first_name}
      - Last Name: ${ctx.message.from.last_name}
      - Error: ${err}`);
    }
  }

  return isBanned;
}

class Bot {
  constructor(botToken, db) {
    this.bot = new Telegraf.Telegraf(botToken);

    this.bot.telegram.getMe().then((botInfo) => {
      this.bot.options.username = botInfo.username;
    });

    this.bot.command("start", (ctx) => {
      return ctx.reply("To add this group, add me as an admin and run /add.");
    });

    this.bot.command("add", async (ctx) => {
      if (!ctx.chat.type.includes("group")) {
        return ctx.reply("This chat is not a group.");
      }

      if (db.groupExist(ctx.chat.id)) {
        return ctx.reply("This group has already been added.");
      }

      if (ctx.message.from.username === ANONYMOUS) {
        console.log(`Anonymous user tried to add a group
        - Group ID: ${ctx.chat.id}
        - Group Name: ${ctx.chat.title}`);
        return ctx.reply(
          "Anonymous group admins are not allowed to add a group to TeleNUS.\n\n" +
            "Additional usage notes: If you intend to use TeleNUS as a platform to push your political agenda or to post neferious content, " +
            "please do not. It takes me **real effort**, on more than several occasions thus far, to have to moderate and delist your group, " +
            "on top of the assignments, coursework, and commitments I already have. I am a real student and human being just like you. Please stop."
        );
      }

      if (await checkBannedWithEffects(ctx)) {
        // Shadowban response
        return ctx.reply("Group added.");
      }

      if (!allowedGroupNameRegex.test(ctx.chat.title)) {
        console.log(`Group blocked from adding due to name
        - Group ID: ${ctx.chat.id}
        - Group Name: ${ctx.chat.title}`);
        return ctx.reply(
          "Group name is not allowed. Please change your group name to something that only has alphanumeric characters, brackets, slashes. The first few characters must be alphanumeric."
        );
      }

      ctx
        .exportChatInviteLink()
        .then(async (inviteLink) => {
          const chat = await ctx.getChat(ctx.chat.id);
          db.addGroup(chat.id, chat.title, chat.invite_link);
          if (ctx.message.chat.title && ctx.message.from.id) {
            console.log(`Added new group
            - Group ID: ${ctx.chat.id}
            - Group Name: ${ctx.message.chat.title}
            - Group Admin: ${ctx.message.from.id}
            - Group Admin Username: ${ctx.message.from.username}
            - Group Admin First Name: ${ctx.message.from.first_name}
            - Group Admin Last Name: ${ctx.message.from.last_name}`);
          }
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
        if (!allowedGroupNameRegex.test(ctx.chat.title)) {
          db.removeGroup(ctx.chat.id);
          console.log(`Delisted group due to name change
          - Group ID: ${ctx.chat.id}
          - Group Name: ${ctx.chat.title}`);
          return ctx.reply(
            "Group name is not allowed. Please change your group name to something that only has alphanumeric characters, brackets, slashes. The first few characters must be alphanumeric. The group will be delisted from TeleNUS for now."
          );
        }

        db.updateGroupTitle(ctx.chat.id, ctx.chat.title);
      }
    });

    this.bot.on(["new_chat_members", "left_chat_member"], async (ctx) => {
      await ctx.deleteMessage(ctx.message.message_id);
      await checkBannedWithEffects(ctx);
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
        ctx.banChatMember(ctx.message.reply_to_message.from.id);
      }
      ctx.deleteMessage(ctx.message.message_id);
    });

    this.bot.on("text", async (ctx) => {
      if (await checkBannedWithEffects(ctx)) {
        await ctx.deleteMessage(ctx.message.message_id);
        return;
      }

      const messageText = ctx.message.text;
      if (
        spamMatchingPatterns.some((pattern) => messageText.includes(pattern))
      ) {
        if (ctx.message.from && ctx.message.from.id) {
          ctx.banChatMember(ctx.message.from.id);
        }
        ctx.deleteMessage(ctx.message.message_id);
        if (ctx.message.chat.title) {
          console.log("Deleted message from group: " + ctx.message.chat.title);
        }
        console.log("Deleted message with text: " + messageText);
      }
    });
  }

  startPolling() {
    this.bot.launch();
  }
}

module.exports = Bot;

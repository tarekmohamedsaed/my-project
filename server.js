require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const path = require("path");
const { Client, GatewayIntentBits, SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const http = require("http");
const WebSocket = require("ws");
const sharp = require("sharp");
const fs = require("fs");
const axios = require("axios");
const { fork } = require("child_process");
const compression = require("compression");
const chalk = require("chalk");
const figlet = require("figlet");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const app = express();
exports.app = app;
const server = http.createServer(app);
const websocketServer = new WebSocket.Server({ noServer: true });

// Add middleware to compress responses

// إعداد Passport.js
passport.use(
  new Strategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "guilds"],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// إعداد الجلسات
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// إعدادات CORS
app.use(cors({ origin: process.env.SERVER_URL, credentials: true }));
app.use(express.json());
app.use(express.static("public")); // لدعم الملفات الثابتة (HTML و CSS)

// Add middleware to serve static files with caching
const oneDay = 86400000; // Cache for one day
app.use(express.static(path.join(__dirname, 'public'), { maxAge: oneDay }));

// إعداد Passport.js
app.use(passport.initialize());
app.use(passport.session());

// إضافة المسارات الخاصة بالمصادقة
app.use("/auth", authRoutes);

// Middleware to check if the user is authenticated
// مسار لعرض صفحة الخطأ عند زيارة /error
app.get('/error', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'error.html'));
});

app.get('/profile', async (req, res) => {
  if (req.isAuthenticated()) {
    const isBlocked = await db.get(`blocked_${req.user.id}`);
    const webhookUrl = "https://discord.com/api/webhooks/1360147335287668897/W_vbeYfcM8iJXTO8P8OhNIK9Ohi1wiWJqltv68Tw8dK793TOHG2FWfcwlcK3ChswAk8f";
  
    if (isBlocked) {
      return res.redirect('/error'); // توجيه المستخدم إلى صفحة الحظر
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `بيحاول يسجل دخول و هو محظور : ${req.user.id}`
        }),
      }).catch(err => console.error("Error sending webhook:", err));
    }
    
    return res.sendFile(path.join(__dirname, 'public', 'profile.html')); // عرض صفحة البروفايل إذا لم يكن محظورًا
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `تم تسجيل الدخول و الدخول الي البروفايل معرف العميل : ${req.user.id}`
      }),
    }).catch(err => console.error("Error sending webhook:", err));
  }
  res.redirect('/login.html'); // توجيه المستخدم إلى صفحة تسجيل الدخول إذا لم يكن مسجلاً
});
// Middleware to check if the user is an admin


 // User is an admin, proceed to the next middleware


// صفحة الملف الشخصي (يتم عرض البيانات في صفحة HTML)
app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, "public", "profile.html"));
  } else {
    res.redirect("/login.html");
  }
});

// معالجة المسار الخاص بالـ Discord Callback
app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/login" }),
  (req, res) => {
    console.log("الـ User بعد المصادقة: ");
    res.redirect("/profile"); // توجيه المستخدم إلى الصفحة الشخصية
  }
);
const { ActivityType } = require("discord.js");

// إعداد البوت
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] // إزالة MessageContent إذا لم تكن ضرورية
});

//-------------------------------------------اوامر الرصيد -------------#
client.once("ready", () =>{

console.log(`✅ Bot is ready as ${client.user.tag}`);
const webhookUrl = 'https://discord.com/api/webhooks/1357919576603496468/9imrjYxYGm7ywr1hRQnTOBJAgDKwZGGYNEcGi76fmI0jNlKWFJM9qnCWSCc_7WcBykGQ';
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `New notification: تم تشغيل البوت بنجاح ✔` }),
  });

});
client.setMaxListeners(20); // زيادة الحد الأقصى للمستمعين إلى 20


client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    const args = message.content.split(" ");

    if (message.content.startsWith("*balance")) {
        const targetUser = message.mentions.users.first() || message.author;
        const balance = await db.get(`balance_${targetUser.id}`) || 0;

        message.reply(`💰 الرصيد الحالي لـ ${targetUser.username}: **${balance} جنيه**`);
    }

  
});

// أمر عرض الرصيد باستخدام QuickDB
client.on('messageCreate', async (message) => {
  if (message.content.startsWith("*balance")) {
    const targetUser = message.mentions.users.first() || message.author;
    const balance = await db.get(`balance_${targetUser.id}`) || 0;
    message.reply(`💰 الرصيد الحالي لـ ${targetUser.username}: **${balance} جنيه**`);
  }
});
//-------------------------------------------اوامر الرصيد -------------#

//-------------------------------------------اوامر التعين---------#

  // أمر تعيين رقم الاستلام

client.on("messageCreate", async (message) => {
    if (message.content.startsWith("*setnum")) {
        const args = message.content.split(" ");
        if (args.length < 3) {
            return message.reply("❌ الاستخدام الصحيح: *setnum ID المستخدم الرقم");
        }

        const targetUserId = args[1];
        const receiveNumber = args[2];

        if (isNaN(receiveNumber)) {
            return message.reply("❌ يجب أن يكون رقم الاستلام أرقامًا فقط.");
        }

        try {
            await db.set(`receive_number_${targetUserId}`, receiveNumber);
            message.reply(`✅ تم تعيين **رقم الاستلام** لـ <@${targetUserId}> إلى: ${receiveNumber}`);
        } catch (error) {
            console.error("Error setting receive number:", error);
            message.reply("❌ حدث خطأ أثناء تعيين رقم الاستلام.");
        }
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith("*setnsp")) {
        const args = message.content.split(" ");
        if (args.length < 3) {
            return message.reply("❌ الاستخدام الصحيح: *setnsp ID المستخدم المبلغ");
        }

        const targetUserId = args[1];
        const taxAmount = args[2];

        if (isNaN(taxAmount)) {
            return message.reply("❌ يجب أن يكون مبلغ الضرائب رقمًا صالحًا.");
        }

        try {
            await db.set(`tax_amount_${targetUserId}`, taxAmount);
            message.reply(`✅ تم تعيين **مبلغ الضرائب** لـ <@${targetUserId}> إلى: ${taxAmount}`);
        } catch (error) {
            console.error("Error setting tax amount:", error);
            message.reply("❌ حدث خطأ أثناء تعيين مبلغ الضرائب.");
        }
    }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("*setsendnum")) {
    const args = message.content.split(" ");
    if (args.length < 3) return message.reply("❌ الاستخدام الصحيح: *setsendnum ID المستخدم الرقم");
    const targetUserId = args[1];
    const sendNumber = args[2];
    if (isNaN(sendNumber)) return message.reply("❌ يجب أن يكون رقم الإرسال أرقامًا فقط.");
     db.set(`send_number_${targetUserId}`, sendNumber);
    message.reply(`✅ تم تعيين **رقم الإرسال** لـ <@${targetUserId}> إلى: ${sendNumber}`);
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("*clearuserdata")) {
    const args = message.content.split(" ");
    if (args.length < 2) return message.reply("❌ الاستخدام الصحيح: *clearuserdata ID المستخدم");
    const targetUserId = args[1];
     db.set(`receive_number_${targetUserId}`,"01152810152");
     db.set(`send_number_${targetUserId}`,"01117097868");
     db.set(`tax_amount_${targetUserId}`,"305");
    db.set(`balance_${targetUserId.id}`,0);

    message.reply(`✅ تم **مسح جميع بيانات** <@${targetUserId}> من قاعدة البيانات.`);
  }
});

client.on("messageCreate", async (message) => {
  if (message.content.startsWith("*ban")) {
    const args = message.content.split(" ");
    if (args.length < 2) return message.reply("❌ الاستخدام الصحيح: *clearuserdata ID المستخدم");
    const targetUserId = args[1];
    db.set(`block_${targetUserId.id}`,"true");

    message.reply(`تم حظره بنجاح من صفحه المعلومات`);
  }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith("*unban")) {
        const args = message.content.split(" ");
        if (args.length < 2) {
            return message.reply("❌ الاستخدام الصحيح: *unban ID المستخدم");
        }

        const targetUserId = args[1];

        try {
            await db.set(`block_${targetUserId}`, "false");
            message.reply(`✅ تم إلغاء الحظر عن <@${targetUserId}> بنجاح.`);
        } catch (error) {
            console.error("Error unbanning user:", error);
            message.reply("❌ حدث خطأ أثناء إلغاء الحظر.");
        }
    }
});

client.on("message", async (message) => {
  if (message.content.startsWith("*info")) {
    const args = message.content.split(" ");
    if (args.length < 2) return message.reply("❌ الاستخدام الصحيح: *info ID المستخدم");
    
    const targetUserId = args[1];
    const receiveNumber =  db.get(`receive_number_${targetUserId}`) || "غير متوفر";
    const sendNumber =  db.get(`send_number_${targetUserId}`) || "غير متوفر";
    const taxAmount =  db.get(`tax_amount_${targetUserId}`) || "غير متوفر";
    const balance =  db.get(`balance_${targetUserId}`) || 0;

    return message.reply(
      `**🔹 قائمة المعلومات الخاصة بـ <@${targetUserId}>:**\n` +
      `\`📥\` ➜ رقم الاستلام: **${receiveNumber}**\n` +
      `\`📤\` ➜ رقم الإرسال: **${sendNumber}**\n` +
      `\`💰\` ➜ مبلغ الضرائب: **${taxAmount} جنيه**\n` +
      `\`💳\` ➜ الرصيد الحالي: **${balance} جنيه**`
    );
  }
});

client.on("message", async (message) => {
  if (message.content.startsWith("*help")) {
    const helpEmbed = {
      color: 0x3143b3,
      title: "📜 قائمة الأوامر",
      description: "استخدم الأوامر التالية لإدارة حسابك والتفاعل مع النظام:",
      fields: [
        { name: "*balance", value: "عرض الرصيد الحالي للمستخدم.\n**الاستخدام:** *balance @المستخدم" },
        { name: "*addbalance", value: "إضافة مبلغ إلى رصيد المستخدم.\n**الاستخدام:** *addbalance @المستخدم المبلغ" },
        { name: "*setnum", value: "تعيين رقم الاستلام للمستخدم.\n**الاستخدام:** *setnum ID المستخدم الرقم" },
        { name: "*setsendnum", value: "تعيين رقم الإرسال للمستخدم.\n**الاستخدام:** *setsendnum ID المستخدم الرقم" },
        { name: "*setnsp", value: "تعيين مبلغ الضرائب للمستخدم.\n**الاستخدام:** *setnsp ID المستخدم المبلغ" },
        { name: "*clearuserdata", value: "مسح جميع بيانات المستخدم.\n**الاستخدام:** *clearuserdata ID المستخدم" },
        { name: "*info", value: "عرض جميع بيانات المستخدم.\n**الاستخدام:** *info ID المستخدم" },
        { name: "*help", value: "عرض قائمة الأوامر المتاحة.\n**الاستخدام:** *help" },
      ],
      footer: {
        text: "Flow Bank - جميع الحقوق محفوظة",
      },
    };

    message.reply({ embeds: [helpEmbed] });
  }
});

// Add bot command for sending notifications
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!notify')) {
    const args = message.content.split(' ');
    const type = args[1]; // e.g., 'warning', 'info', 'message'
    const content = args.slice(2).join(' ');

    if (!type || !content) {
      return message.reply('Usage: !notify <type> <content>');
    }

    sendNotification(type, content, message.author.username);
    message.reply(`Notification sent: ${content}`);
  }
});

// Add personalized notifications system
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!notify')) {
    const args = message.content.split(' ');
    const targetUserId = args[1]; // User ID or mention
    const type = args[2]; // e.g., 'warning', 'info', 'message'
    const content = args.slice(3).join(' ');

    if (!targetUserId || !type || !content) {
      return message.reply({
        embeds: [{
          color: 0x3143b3,
          title: '❌ خطأ',
          description: 'الاستخدام الصحيح: !notify <ID المستخدم> <نوع الإشعار> <المحتوى>',
        }],
      });
    }

    const notification = {
      type,
      content,
      sender: message.author.username,
      timestamp: new Date().toISOString(),
    };

    // Send notification to WebSocket
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.userId === targetUserId) {
        client.send(JSON.stringify(notification));
      }
    });

    // Send confirmation to the sender
    message.reply({
      embeds: [{
        color: 0x3143b3,
        title: '✅ تم إرسال الإشعار',
        description: `تم إرسال الإشعار إلى المستخدم <@${targetUserId}>.`,
      }],
    });
  }
});

//-------------------------------------------اوامر التعين---------#

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Route to fetch images from 'profiles' directory
app.get('/profiles', (req, res) => {
  const profilesDir = path.join(__dirname, 'public', 'profiles');

  fs.readdir(profilesDir, (err, files) => {
    if (err) {
      console.error('Error reading profiles directory:', err);
      return res.status(500).send('Failed to fetch images.');
    }
    const imageFiles = files.filter(file => path.extname(file).toLowerCase() === '.png');
    res.json(imageFiles);
  });
});

// تشغيل ملف updateBase64.js عند بدء تشغيل السيرفر
const updateBase64Process = fork('./updateBase64.js');

updateBase64Process.on('error', (err) => {
  console.error('Error in updateBase64.js process:', err);
});

updateBase64Process.on('exit', (code) => {
  console.log(`updateBase64.js process exited with code ${code}`);
});

// تسجيل دخول البوت باستخدام التوكن
client.login(process.env.BOT_TOKEN);
// خريطة لتتبع الاتصالات
const activeSockets = new Map();

server.on('upgrade', (request, socket, head) => {
  const socketId = `${socket.remoteAddress}:${socket.remotePort}`;

  // التحقق إذا كان الاتصال قد تم التعامل معه مسبقًا
  if (activeSockets.has(socketId)) {
    console.warn(`⚠️ Connection already handled for socket: ${socketId}. Destroying socket.`);
    socket.destroy();
    return;
  }

  // وضع علامة على أن الاتصال قيد المعالجة
  activeSockets.set(socketId, true);

});
websocketServer.on('connection', (ws, req) => {
  console.log("عميل متصل عبر WebSocket");

  const userId = req.headers['sec-websocket-protocol']; // يتم إرسال userId كبروتوكول

  if (!userId) {
    console.error("معرف المستخدم غير متوفر.");
    ws.close();
    return;
  }

  // إرسال إشعار تجريبي عند الاتصال
  ws.send(JSON.stringify({
    senderName: "Alpha-Bank",
    senderAvatar: "https://example.com/avatar.png",
    verified: true,
    message: "مرحبًا بك في ملفك الشخصي",
    timestamp: new Date().toISOString(),
  }));

  ws.on('close', () => {
    console.log(`تم قطع الاتصال مع العميل: ${userId}`);
  });
});

// إرسال الإشعارات عبر WebSocket
async function sendNotification(userId, type, tarsh) {
  const notification = {
    senderName: "Flow Bank",
    senderAvatar: "/logo.png", // استخدام logo.png كصورة المرسل
    verified: true,
    type,
    tarsh: tarsh ||"تم تشفير الرسالة لأجراء خاص",
    timestamp: new Date().toISOString(),
  };

  // حفظ الإشعار في QuickDB
  const userNotifications = (await db.get(`notifications_${userId}`)) || [];
  userNotifications.push(notification);
  await db.set(`notifications_${userId}`, userNotifications);

  // إرسال الإشعار عبر WebSocket
  websocketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify(notification)); // إرسال الإشعار لحظيًا
    }
  });

  console.log(`Notification sent to user ${userId}: ${tarsh}`);
}

// التعامل مع اتصالات WebSocket
websocketServer.on("connection", (ws, req) => {
  console.log("🔗 عميل متصل عبر WebSocket");

  const userId = req.headers["sec-websocket-protocol"]; // افترض أن userId يتم إرساله كبروتوكول

  if (!userId) {
    console.error("❌ معرف المستخدم غير متوفر.");
    ws.close();
    return;
  }

  ws.userId = userId;

  // عند الاتصال، إرسال الإشعارات الفائتة
  (async () => {
    try {
      const notifications = (await db.get(`notifications_${userId}`)) || [];
      notifications.forEach((notification) => {
        ws.send(JSON.stringify(notification));
      });
    } catch (error) {
      console.error(`❌ خطأ أثناء جلب الإشعارات للمستخدم ${userId}:`, error);
    }
  })();

  // التعامل مع الرسائل الواردة
  ws.on("message", (message) => {
    console.log(`📩 رسالة مستلمة من المستخدم ${userId}:`, message);
  });

  // التعامل مع إغلاق الاتصال
  ws.on("close", () => {
    console.log(`❌ تم قطع الاتصال مع العميل: ${userId}`);
  });

  // التعامل مع الأخطاء
  ws.on("error", (error) => {
    console.error(`❌ خطأ في الاتصال مع المستخدم ${userId}:`, error);
  });
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3008;

// API لإضافة الرصيد
app.post("/api/addbalance", async (req, res) => {
  const { userId, amount, senderName, receiverName } = req.body;

  if (!userId || !amount || isNaN(amount)) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم ومبلغ صالح." });
  }

  try {
    // جلب بيانات المستلم
    const receiverBalance = (await db.get(`balance_${userId}`)) || 0;
    const receiver = receiverName || `User_${userId}`; // اسم المستلم

    // تحديث رصيد المستلم
    const newReceiverBalance = receiverBalance + parseFloat(amount);
    await db.set(`balance_${userId}`, newReceiverBalance);

    // إرسال إشعار لحظي
    const notification = {
      verified: true,
      receiverName: receiverName + " " + "🔵" || "Flow Cash 🔵",
      tarsh: `<div style="background: radial-gradient(105.43% 127.05% at 50.1% 127.05%, rgb(87, 87, 89) 20.65%, rgb(57, 82, 206) 85.16%); color: white; border-radius: 5px; padding: 10px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        تم استلام مبلغ <span style="color: #28a745;">${amount} ج.م</span> من الحساب المسجل بأسم <span style="color: #dc3545;">${senderName}</span> بنجاح إلى رصيد محفظتك.
        <br>رصيدك الان ${newReceiverBalance} ج.م متاح للسحب ☑
        </div>`,
      timestamp: `<div style="background-color: #f0f0f0; border-radius: 5px; padding: 5px; display: inline-block;">
        ${new Date().toLocaleString('ar-EG', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        })}
        </div>`,
    };

    // حفظ الإشعار في قاعدة البيانات
    const userNotifications = (await db.get(`notifications_${userId}`)) || [];
    userNotifications.push(notification);
    await db.set(`notifications_${userId}`, userNotifications);

    // إرسال الإشعار عبر WebSocket
    websocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify(notification));
      }
    });

    res.status(200).json({ message: "تم إضافة الرصيد بنجاح!" });
  } catch (error) {
    console.error("Error adding balance:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إضافة الرصيد." });
  }
});

// Add WebSocket support for real-time notifications and an API to fetch stored notifications from QuickDB

// إعداد WebSocket
const wss = new WebSocket.Server({ server });

// تخزين الإشعارات في QuickDB
async function saveNotification(userId, notification) {
  const notifications = (await db.get(`notifications_${userId}`)) || [];
  notifications.push(notification);
  await db.set(`notifications_${userId}`, notifications);
}

// إرسال الإشعارات عبر WebSocket
async function sendNotification(userId, type, tarsh) {
  const notification = {
    senderName: "Flow Bank",
    senderAvatar: "/logo.png", // استخدام logo.png كصورة المرسل
    verified: true,
    type,
    tarsh: tarsh || "تم تشفير الرسالة ",
    timestamp: new Date().toISOString(),
  };

  // Save the notification in the database
  const userNotifications = (await db.get(`notifications_${userId}`)) || [];
  userNotifications.push(notification);
  await db.set(`notifications_${userId}`, userNotifications);

  // Send the notification via WebSocket
  websocketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify(notification)); // إرسال الإشعار لحظيًا
    }
  });

  console.log(`Notification sent to user ${userId}: ${tarsh}`);
}

// التعامل مع اتصالات WebSocket
websocketServer.on("connection", (ws, req) => {
  console.log("🔗 عميل متصل عبر WebSocket");

  const userId = req.headers["sec-websocket-protocol"]; // افترض أن userId يتم إرساله كبروتوكول

  if (!userId) {
    console.error("❌ معرف المستخدم غير متوفر.");
    ws.close();
    return;
  }

  ws.userId = userId;

  // عند الاتصال، إرسال الإشعارات الفائتة
  (async () => {
    try {
      const notifications = (await db.get(`notifications_${userId}`)) || [];
      notifications.forEach((notification) => {
        ws.send(JSON.stringify(notification));
      });
    } catch (error) {
      console.error(`❌ خطأ أثناء جلب الإشعارات للمستخدم ${userId}:`, error);
    }
  })();

  // التعامل مع الرسائل الواردة
  ws.on("message", (message) => {
    console.log(`📩 رسالة مستلمة من المستخدم ${userId}:`, message);
  });

  // التعامل مع إغلاق الاتصال
  ws.on("close", () => {
    console.log(`❌ تم قطع الاتصال مع العميل: ${userId}`);
  });

  // التعامل مع الأخطاء
  ws.on("error", (error) => {
    console.error(`❌ خطأ في الاتصال مع المستخدم ${userId}:`, error);
  });
});

// مسار لإرسال الإشعارات من الصفحة
app.post("/send-notification", async (req, res) => {
  const { userId, title, message } = req.body;

  if (!userId || !title || !message) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة." });
  }

  try {
    // إنشاء الإشعار
    const notification = {
      senderName: "Flow Bank",
      senderAvatar: "/logo.png", // صورة الحساب الرسمي
      verified: true,
      type: title,
      tarsh: message,
      timestamp: new Date().toISOString(),
    };

    // حفظ الإشعار في قاعدة البيانات
    const userNotifications = (await db.get(`notifications_${userId}`)) || [];
    userNotifications.push(notification);
    await db.set(`notifications_${userId}`, userNotifications);

    // إرسال الإشعار عبر WebSocket
    websocketServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(JSON.stringify(notification));
      }
    });

    res.status(200).json({ message: "تم إرسال الإشعار بنجاح." });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إرسال الإشعار." });
  }
});

// التعامل مع اتصالات WebSocket

// API لاسترجاع الإشعارات
app.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch notifications from the database
    const notifications = (await db.get(`notifications_${userId}`)) || [];

    // Return the notifications in the saved format
    res.status(200).json(notifications.length > 0 ? notifications : { message: "لا توجد إشعارات." });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "حدث خطأ أثناء جلب الإشعارات." });
  }
});

// إضافة أمر لإرسال إشعارات فورية
client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!sendnotify")) {
    // التحقق من أن المستخدم لديه صلاحيات المسؤول
    if (!message.member.permissions.has("ADMINISTRATOR")) {
      return message.reply("❌ ليس لديك صلاحية لاستخدام هذا الأمر.");
    }

    const args = message.content.split(" ");
    const targetUserId = args[1]; // ID المستخدم
    const notificationContent = args.slice(2).join(" "); // محتوى الإشعار

    if (!targetUserId || !notificationContent) {
      return message.reply("❌ الاستخدام الصحيح: !sendnotify <ID المستخدم> <محتوى الإشعار>");
    }

    try {
      const notification = {
        senderName: "Flow Bank",
        senderAvatar: "https://example.com/verified-avatar.png", // صورة الحساب الرسمي
        verified: true,
        message: notificationContent,
        timestamp: new Date().toISOString(),
      };

      // حفظ الإشعار في قاعدة البيانات
      const userNotifications = (await db.get(`notifications_${targetUserId}`)) || [];
      userNotifications.push(notification);
      await db.set(`notifications_${targetUserId}`, userNotifications);

      // إرسال الإشعار عبر WebSocket
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.userId === targetUserId) {
          client.send(JSON.stringify(notification));
        }
      });

      message.reply(`✅ تم إرسال الإشعار إلى المستخدم <@${targetUserId}>.`);
    } catch (error) {
      console.error("❌ حدث خطأ أثناء إرسال الإشعار:", error);
      message.reply("❌ حدث خطأ أثناء إرسال الإشعار. يرجى المحاولة مرة أخرى.");
    }
  }
});

// Add WebSocket support for real-time notifications


// Function to send notifications to all connected clients
function sendNotification(type, content, sender) {
  const notification = {
    type, // e.g., 'warning', 'info', 'message'
    content,
    sender,
    timestamp: new Date().toISOString(),
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  });

  // Send to Discord Webhook
  const webhookUrl = 'https://discord.com/api/webhooks/1357919576603496468/9imrjYxYGm7ywr1hRQnTOBJAgDKwZGGYNEcGi76fmI0jNlKWFJM9qnCWSCc_7WcBykGQ';
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `New notification: ${content}` }),
  });
}

// Add functionality to save notifications in QuickDB

// Function to save notification
async function saveNotification(userId, notification) {
  const userNotifications = (await db.get(`notifications_${userId}`)) || [];
  userNotifications.push(notification);
  await db.set(`notifications_${userId}`, userNotifications);
}

// Modify WebSocket message handling to save notifications


// API endpoint to fetch notifications for a user
app.get('/notifications/:userId', async (req, res) => {
  const userId = req.params.userId;
  const notifications = (await db.get(`notifications_${userId}`)) || [];
  res.json(notifications);
});

// إصلاح نظام الإشعارات
async function sendNotification(userId, type, tarsh) {
  const notification = {
    type,
    tarsh,
    timestamp: new Date().toISOString(),
  };

  // حفظ الإشعار في QuickDB
  const userNotifications = (await db.get(`notifications_${userId}`)) || [];
  userNotifications.push(notification);
  await db.set(`notifications_${userId}`, userNotifications);

  // إرسال الإشعار عبر WebSocket
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.userId === userId) {
      client.send(JSON.stringify(notification));
    }
  });

  console.log(`Notification sent to user ${userId}: ${tarsh}`);
}

// API لاسترجاع الإشعارات
app.get('/notifications/:userId', async (req, res) => {
  const userId = req.params.userId;
  const notifications = (await db.get(`notifications_${userId}`)) || [];
  res.json(notifications);
});

// تحسين نظام دفع الضرائب
app.post('/pay-tax', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const currentTax = (await db.get(`tax_amount_${userId}`)) || 0;
  const newTax = currentTax + parseFloat(amount);
  await db.set(`tax_amount_${userId}`, newTax);

  // إرسال إشعار بالدفع
  await sendNotification(userId, 'info', `تم دفع مبلغ ${amount} جنيه كضرائب.`);

  res.json({ message: 'تم دفع الضرائب بنجاح', newTax });
});

// تحسين واجهة المستخدم
app.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
  } else {
    res.redirect('/login.html');
  }
});

// مسار جديد لإرجاع بيانات المستخدم
app.get('/profile-data', async (req, res) => {
    if (req.isAuthenticated()) {
        const user = req.user;
        const balance = await db.get(`balance_${user.id}`) || 0;
        const receiveNumber = await db.get(`receive_number_${user.id}`) || "غير متوفر";
        const sendNumber = await db.get(`send_number_${user.id}`) || "غير متوفر";
        const taxAmount = await db.get(`tax_amount_${user.id}`) || 0;
        res.json({
          message: "تم تسجيل الدخول بنجاح!",
          status: "success",
          username: user.username,
          receiveNumber: receiveNumber || "غير متوفر",
          sendNumber: sendNumber || "غير متوفر",
          taxAmount: taxAmount || "غير متوفر",
          id: user.id,
          avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : "https://cdn.discordapp.com/embed/avatars/0.png",  // صورة افتراضية         
          balance: balance,
        });
      } else {
        res.redirect("/login.html");
    
      }
    });

// Ensure `wss` is declared only once




// إضافة مسار لتقديم الملفات الثابتة
app.use(express.static('public'));

// إضافة مسار لمعالجة طلب /profile-data
app.get('/profile-data', async (req, res) => {
    try {
        const userId = req.query.userId; // تأكد من إرسال userId مع الطلب
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            username: user.username,
            balance: user.balance,
            sendNumber: user.sendNumber || 'غير متوفر',
            receiveNumber: user.receiveNumber || 'غير متوفر',
            taxAmount: user.taxAmount || 0,
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// تأكيد أن البوت جاهز
client.once("ready", async () => {
    const serverCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const currentTime = new Date().toLocaleString();
    console.log(chalk.bgMagenta("----------------------------------------"));
    console.log(chalk.greenBright(figlet.textSync("Tarsh", { horizontalLayout: "full" })));
    console.log(chalk.greenBright("✅ Bot is ready!"));
    console.log(chalk.blueBright(`🤖 Bot Name: ${client.user.username}`));
    console.log(chalk.yellowBright(`📌 Bot ID: ${client.user.id}`));
    console.log(chalk.cyanBright(`⏰ Start Time: ${currentTime}`));
    console.log(chalk.magentaBright(`🌐 Connected Servers: ${serverCount}`));
    console.log(chalk.magentaBright(`👥 Total Users: ${userCount}`));
    console.log(chalk.magentaBright("📜 Commands List:"));
    console.log(chalk.cyanBright("Bot Scam Client Is Ready [20ms]! ✅"));
    console.log(chalk.bgMagenta("----------------------------------------"));

    // فحص الملفات
    await checkFiles();
    console.log(chalk.bgMagenta("----------------------------------------"));

    console.log(chalk.greenBright("🏓 Ping: Bot is online and ready to use!"));
    console.log(chalk.bgMagenta("----------------------------------------"));
    console.log(chalk.redBright("----------------------------------------"));

    console.log(chalk.bgCyanBright("----------------------------------------"));
    console.log(chalk.greenBright("Done Set Activity: ") + chalk.bgWhiteBright("فلوسك في أمان 💰"));
    // ✅ تعيين حالة البوت إلى Streaming
    client.user.setActivity('فلوسك في أمان 💰', {
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/discord' // لازم يكون URL حقيقي للستريمنج وإلا مش هيشتغل
  });
    console.log(chalk.bgCyanBright("----------------------------------------"));
    console.log(chalk.greenBright(figlet.textSync("Tarsh", { horizontalLayout: "full" })));
    console.log(chalk.bgCyanBright("----------------------------------------"));



});


const util = require('util');
const sleep = util.promisify(setTimeout);

// وظيفة لفحص الملفات وتصنيفها حسب النوع
async function checkFiles() {
    const filesDir = path.join(__dirname);
    const allFiles = fs.readdirSync(filesDir, { withFileTypes: true });

    // تصنيف الملفات حسب النوع
    const categorizedFiles = {
        html: [],
        css: [],
        js: [],
        images: [],
        audio: [],
        databases: [],
        others: [],
    };

    allFiles.forEach(file => {
        if (file.isDirectory() || file.name === 'node_modules') {
            console.log(chalk.gray(`Done Loading FOLDER ${file.name} ✅ {Folder_Scam} ✅`));
            return;
        }

        const ext = path.extname(file.name).toLowerCase();
        switch (ext) {
            case '.html':
                categorizedFiles.html.push(file.name);
                break;
            case '.css':
                categorizedFiles.css.push(file.name);
                break;
            case '.js':
                categorizedFiles.js.push(file.name);
                break;
            case '.png':
            case '.jpg':
            case '.jpeg':
            case '.gif':
            case '.svg':
                categorizedFiles.images.push(file.name);
                break;
            case '.mp3':
            case '.wav':
            case '.ogg':
                categorizedFiles.audio.push(file.name);
                break;
            case '.db':
            case '.sqlite':
            case '.json':
                categorizedFiles.databases.push(file.name);
                break;
            default:
                categorizedFiles.others.push(file.name);
        }
    });
    console.log(chalk.redBright("----------------------------------------"));

    console.log(chalk.yellowBright(' Loading is Project 🔍 <scam> ...'));

    // فحص كل مجموعة من الملفات
    for (const [category, files] of Object.entries(categorizedFiles)) {
        if (files.length === 0) continue;

        console.log(chalk.blueBright(`\n📂 ${category.toUpperCase()} FILES:`));
        console.log(chalk.redBright("----------------------------------------"));

        for (const file of files) {
            const fileSize = fs.statSync(path.join(filesDir, file)).size;
            const delay = Math.min(Math.max(Math.ceil(fileSize / 1000), 2), 5) * 1000; // تأخير بين 2-5 ثوانٍ حسب حجم الملف
            await sleep(delay);

            console.log(chalk.green(` Done Is run  ${file} ✅  "sussfuly" ! `));
            console.log(chalk.bgGreen("----------------------------------------"));

        }
    }

    console.log(chalk.redBright('----------------------------------------'));
}

// إضافة الأمر `/addbalance` للبوت
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "addbalance") {
        const adminId = process.env.ADMIN_ID;
        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: "❌ ليس لديك صلاحية لاستخدام هذا الأمر.", ephemeral: true });
        }

        const targetUser = interaction.options.getUser("المستخدم");
        const amount = interaction.options.getInteger("المبلغ");

        try {
            let user = await db.get(`user_${targetUser.id}`);
            if (!user) {
                user = { userId: targetUser.id, username: targetUser.username, balance: 0 };
            }

            user.balance += amount;
            await db.set(`user_${targetUser.id}`, user);

            interaction.reply({
                content: `✅ تم إضافة **${amount} جنيه مصري** إلى ${targetUser.username}. الرصيد الحالي: **${user.balance} جنيه**`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: "❌ حدث خطأ أثناء تنفيذ الأمر.", ephemeral: true });
        }
    }
});

// إضافة أمر "بينج" إلى البوت
client.on("messageCreate", (message) => {
    if (message.content === "بينج") {
        message.reply("البينج");
    }
});

// إعداد الأوامر السلاش
client.on("ready", async () => {
    const commands = [
        new SlashCommandBuilder()
            .setName("addbalance")
            .setDescription("إضافة رصيد لمستخدم معين (للمسؤول فقط).")
            .addUserOption((option) =>
                option.setName("المستخدم").setDescription("المستخدم الذي سيتم إضافة الرصيد له").setRequired(true)
            )
            .addIntegerOption((option) =>
                option.setName("المبلغ").setDescription("المبلغ الذي سيتم إضافته").setRequired(true)
            ),
    ].map((command) => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log("✅ Commands have been registered.");
    } catch (error) {
        console.error("❌ Error registering commands:", error);
    }
});

// تسجيل دخول البوت باستخدام التوكن

// تشغيل السيرفر

// تأكد من أن الخادم يستمع مرة واحدة فقط
if (!global.serverInstance) {
    global.serverInstance = server.listen(PORT, () => {
        console.log(`✅ Server is running on http://localhost:${PORT}`);
    });
} else {
    console.log("⚠️ Server is already running.");
}

// مسار لإرسال الإشعارات من الصفحة
app.post("/send-notification", async (req, res) => {
  const { userId, title, message } = req.body;

  if (!userId || !title || !message) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة." });
  }

  try {
    const notification = {
      senderName: "Flow Bank",
      senderAvatar: "/logo.png", // صورة الحساب الرسمي
      verified: true,
      type: title,
      tarsh : message,
      timestamp: new Date().toISOString(),
    };

    // حفظ الإشعار في قاعدة البيانات
    const userNotifications = (await db.get(`notifications_${userId}`)) || [];
    userNotifications.push(notification);
    await db.set(`notifications_${userId}`, userNotifications);

    // إرسال الإشعار عبر WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.userId === userId) {
        client.send(JSON.stringify(notification));
      }
    });

    res.status(200).json({ message: "تم إرسال الإشعار بنجاح." });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "حدث خطأ أثناء إرسال الإشعار." });
  }
});

// API to delete a notification
app.delete('/notifications/:userId/:notificationId', async (req, res) => {
  const { userId, notificationId } = req.params;

  if (!userId || !notificationId) {
    return res.status(400).json({ error: "User ID and Notification ID are required." });
  }

  try {
    // Fetch notifications from the database
    const notifications = (await db.get(`notifications_${userId}`)) || [];

    // Filter out the notification to be deleted
    const updatedNotifications = notifications.filter((_, index) => index.toString() !== notificationId);

    // Update the database
    await db.set(`notifications_${userId}`, updatedNotifications);

    res.status(200).json({ message: `تم حذف الإشعار: ${notificationId}` }); // Ensure notificationId is included
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Failed to delete notification." });
  }
});

// API to clear all notifications for a specific user
app.delete('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    // Clear all notifications for the user
    await db.set(`notifications_${userId}`, []);
    res.status(200).json({ message: `تم حذف جميع الإشعارات للمستخدم: ${userId}` });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Failed to clear notifications." });
  }
});

// API لجلب الرصيد بناءً على ID المستخدم
app.get("/api/balance/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const balance = await db.get(`balance_${userId}`) || 0;
    const username = `User_${userId}`; // يمكنك تعديل هذا لجلب اسم المستخدم الحقيقي إذا كان متاحًا
    res.json({ username, balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).json({ error: "حدث خطأ أثناء جلب الرصيد." });
  }
});

// API لتعيين رقم استلام الأرباح
app.post("/api/setnum", async (req, res) => {
  const { userId, number } = req.body;

  if (!userId || !number) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم ورقم الاستلام." });
  }

  try {
    await db.set(`receive_number_${userId}`, number);
    res.json({ message: "تم تعيين رقم الاستلام بنجاح." });
  } catch (error) {
    console.error("Error setting receive number:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تعيين رقم الاستلام." });
  }
});
//----------رقم الارسال

app.post("/api/setsendnum", async (req, res) => {
  const { userId, number } = req.body;

  if (!userId || !number) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم ورقم الارسال." });
  }

  try {
    await db.set(`send_number_${userId}`, number);
    res.json({ message: "تم تعيين رقم الارسال بنجاح." });
  } catch (error) {
    console.error("Error setting receive number:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تعيين رقم الارسال." });
  }
});


//----------الضرايب
app.post("/api/settax", async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم مبلغ الضرايب." });
  }

  try {
    await db.set(`tax_amount_${userId}`, amount);
    res.json({ message: "تم تعيين مبلغ الضرايب بنجاح." });
  } catch (error) {
    console.error("Error setting receive amount:", error);
    res.status(500).json({ error: "حدث خطأ أثناء تعيين مبلغ الضرايب ." });
  }
});

//----------التعريفات


app.post("/api/infouser", async (req, res) => {
  const { targetUserId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم ." });
  }

  try {
    const receiveNumber = await db.get(`receive_number_${targetUserId}`) || "غير متوفر";
    const sendNumber = await db.get(`send_number_${targetUserId}`) || "غير متوفر";
    const taxAmount = await db.get(`tax_amount_${targetUserId}`) || "غير متوفر";
    const balance = await db.get(`balance_${targetUserId}`) || 0;
    res.json({ receiveNumber, sendNumber, taxAmount, balance });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ error: "❌ حدث خطأ أثناء جلب المعلومات." });
  }
});
//----------حظر المستخدمين------------//
app.post("/api/blockuser", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم." });
  }

  try {
    await db.set(`blocked_${userId}`, true); // حفظ حالة الحظر
    res.json({ message: "تم حظر المستخدم بنجاح." });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "❌ حدث خطأ أثناء حظر المستخدم." });
  }
});

// Route for "/login"
app.get('/login', async (req, res) => {
  if (req.isAuthenticated()) {
    const isBlocked = await db.get(`blocked_${req.user.id}`);
    if (isBlocked) {
      return res.sendFile(path.join(__dirname, 'public', 'blocked.html')); // صفحة الحظر
    }
    return res.redirect('/profile'); // إذا لم يكن محظورًا، يتم توجيهه إلى الصفحة الشخصية
  }
  res.sendFile(path.join(__dirname, 'public', 'cancel-login.html')); // صفحة تسجيل الدخول
});
//----------حظر المستخدمين- تحقق-----------//
app.get("/check-ban-status", async (req, res) => {
  const userId = req.query.userId; // يمكن إرسال معرف المستخدم كـ query parameter

  if (!userId) {
    return res.status(400).json({ error: "يرجى إرسال معرف المستخدم." });
  }

  try {
    const isBanned = await db.get(`blocked_${userId}`); // التحقق من حالة الحظر في قاعدة البيانات
    if (isBanned) {
      return res.json({ isBanned: true });
    }
    res.json({ isBanned: false });
  } catch (error) {
    console.error("Error checking ban status:", error);
    res.status(500).json({ error: "حدث خطأ أثناء التحقق من حالة الحظر." });
  }
});
//-----------إلغاء حظر المستخدمين------------//
app.post("/api/unblockuser", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم." });
  }

  try {
    await db.delete(`blocked_${userId}`); // حذف حالة الحظر من قاعدة البيانات
    res.json({ message: "تم إلغاء حظر المستخدم بنجاح." });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "❌ حدث خطأ أثناء إلغاء الحظر." });
  }
});

// منع الوصول المباشر إلى صفحة البروفايل إذا كان المستخدم محظورًا
app.get('/profile.html', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login.html'); // توجيه المستخدم إلى صفحة تسجيل الدخول إذا لم يكن مسجلاً
  }

  const isBlocked = await db.get(`blocked_${req.user.id}`);
  if (isBlocked) {
    return res.redirect('/error.html'); // توجيه المستخدم إلى صفحة الحظر إذا كان محظورًا
  }

  res.sendFile(path.join(__dirname, 'public', 'profile.html')); // عرض صفحة البروفايل إذا كان مسجلاً وغير محظور
});

//------------------تسجيل دخول البوت------------//

// مسار لحذف جميع معلومات الشخص من قاعدة البيانات
app.post("/api/clearuserdata", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "يرجى إدخال ID المستخدم." });
  }

  try {
    // حذف جميع البيانات المتعلقة بالمستخدم
    await db.delete(`balance_${userId}`);
    await db.delete(`receive_number_${userId}`);
    await db.delete(`send_number_${userId}`);
    await db.delete(`tax_amount_${userId}`);
    await db.set(`blocked_${userId}`, true);
    await db.delete(`notifications_${userId}`);

    res.json({ message: "تم حذف جميع بيانات المستخدم بنجاح." });
  } catch (error) {
    console.error("Error clearing user data:", error);
    res.status(500).json({ error: "❌ حدث خطأ أثناء حذف بيانات المستخدم." });
  }
});



client.login(process.env.BOT_TOKEN);

const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');
const chalk = require('chalk'); // مكتبة لتلوين الكونسول
const figlet = require('figlet'); // مكتبة لإضافة شعار ASCII
const connectDB = require('./db'); // الاتصال بـ MongoDB
const User = require('./models/User');
dotenv.config();

// إعداد الاتصال بـ MongoDB
connectDB();

// إنشاء البوت
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] 
});

// تأكيد أن البوت جاهز
client.once('ready', async () => {
    const serverCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const currentTime = new Date().toLocaleString();

    // إضافة حالة ستريمنج
    client.user.setActivity('فلوسك في أمان 💰', { type: 'STREAMING', url: 'https://twitch.tv/Discord' });

    console.log(chalk.greenBright(figlet.textSync('My Bot', { horizontalLayout: 'full' })));
    console.log(chalk.greenBright('✅ Bot is ready!'));
    console.log(chalk.blueBright(`🤖 Bot Name: ${client.user.username}`));
    console.log(chalk.yellowBright(`📌 Bot ID: ${client.user.id}`));
    console.log(chalk.cyanBright(`⏰ Start Time: ${currentTime}`));
    console.log(chalk.magentaBright(`🌐 Connected Servers: ${serverCount}`));
    console.log(chalk.magentaBright(`👥 Total Users: ${userCount}`));
    console.log(chalk.magentaBright('📜 Commands List:'));
    console.log(chalk.cyanBright('1. /addbalance - إضافة رصيد لمستخدم معين.'));
    console.log(chalk.cyanBright('2. بينج - يرد البوت بـ "البينج".'));
    console.log(chalk.redBright('----------------------------------------'));
    console.log(chalk.greenBright('🏓 Ping: Bot is online and ready to use!'));
});

// إضافة الأمر `/addbalance` للبوت
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'addbalance') {
        // تحقق من صلاحية المسؤول
        const adminId = process.env.ADMIN_ID;
        if (interaction.user.id !== adminId) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذا الأمر.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('المستخدم');
        const amount = interaction.options.getInteger('المبلغ');

        try {
            let user = await User.findOne({ userId: targetUser.id });
            if (!user) {
                user = new User({
                    userId: targetUser.id,
                    username: targetUser.username,
                    balance: 0
                });
            }

            user.balance += amount;
            await user.save();

            interaction.reply({
                content: `✅ تم إضافة **${amount} جنيه مصري** إلى ${targetUser.username}. الرصيد الحالي: **${user.balance} جنيه**`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true });
        }
    }
});

// إضافة أمر "بينج" إلى البوت
client.on('messageCreate', (message) => {
    if (message.content === 'بينج') {
        message.reply('البينج');
    }
});

// إعداد الأوامر السلاش
client.on('ready', async () => {
    const commands = [
        new SlashCommandBuilder()
            .setName('addbalance')
            .setDescription('إضافة رصيد لمستخدم معين (للمسؤول فقط).')
            .addUserOption(option => 
                option.setName('المستخدم')
                    .setDescription('المستخدم الذي سيتم إضافة الرصيد له')
                    .setRequired(true))
            .addIntegerOption(option =>
                option.setName('المبلغ')
                    .setDescription('المبلغ الذي سيتم إضافته')
                    .setRequired(true))
    ]
    .map(command => command.toJSON());

    try {
        await client.application.commands.set(commands);
        console.log('✅ Commands have been registered.');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

// تسجيل دخول البوت باستخدام التوكن
client.login(process.env.BOT_TOKEN);

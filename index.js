const { default: makeWASocket, useMultiFileAuthState, delay, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const axios = require('axios');
const cheerio = require('cheerio');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Pairing Code එක ලබා ගැනීම (පළමු වතාවට පමණයි)
    if (!sock.authState.creds.registered) {
        let phoneNumber = "94767531213"; // ඔයාගේ නම්බර් එක
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n\n=== YOUR PAIRING CODE ===\n${code}\n========================\n\n`);
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const from = msg.key.remoteJid;

        if (text && text.startsWith('.find')) {
            const movieName = text.replace('.find', '').trim();
            await sock.sendMessage(from, { text: `🔎 සොයමින් පවතී: ${movieName}...` });

            try {
                const searchUrl = `https://www.cartoonsarea.cc/search.php?q=${encodeURIComponent(movieName)}`;
                const { data } = await axios.get(searchUrl);
                const $ = cheerio.load(data);
                
                // සයිට් එකේ ඇතුළේ ඇති link එක සොයයි
                const firstResult = $('.movie-box a').first().attr('href');
                
                if (firstResult) {
                    const fullLink = `https://www.cartoonsarea.cc/${firstResult}`;
                    await sock.sendMessage(from, { text: `🎬 හමුවුණා!\n\nලින්ක් එක: ${fullLink}\n\nමෙතනින් ගොස් Download කරන්න.` });
                } else {
                    await sock.sendMessage(from, { text: "❌ කණගාටුයි, එවැනි චිත්‍රපටයක් හමුවුණේ නැහැ." });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: "⚠️ මොකක් හරි වැරදුණා. පසුව උත්සාහ කරන්න." });
            }
        }
    });
}

connectToWhatsApp();

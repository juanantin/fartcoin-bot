import axios from 'axios';

const TG_API = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}`;

export async function sendToTelegram(text: string, tweetId?: string): Promise<void> {
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHANNEL_ID;

  if (!token || !chatId) {
    console.log('[telegram] TG_BOT_TOKEN or TG_CHANNEL_ID not set, skipping');
    return;
  }

  const tweetLink = tweetId
    ? `\n\n🐦 https://x.com/fartcointrees/status/${tweetId}`
    : '';

  const message = `${text}${tweetLink}`;

  try {
    await axios.post(`${TG_API}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    });
    console.log('[telegram] message sent');
  } catch (err: any) {
    console.error('[telegram] failed to send:', err?.response?.data ?? err.message);
  }
}

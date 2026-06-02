import axios from 'axios';

const TG_API = `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}`;

export async function sendToTelegram(tweetId: string): Promise<void> {
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHANNEL_ID;
  const xHandle = process.env.X_HANDLE ?? 'fartcointrees';

  if (!token || !chatId) {
    console.log('[telegram] TG_BOT_TOKEN or TG_CHANNEL_ID not set, skipping');
    return;
  }

  try {
    await axios.post(`${TG_API}/sendMessage`, {
      chat_id: chatId,
      text: `https://x.com/${xHandle}/status/${tweetId}`,
      disable_web_page_preview: false,
    });
    console.log('[telegram] message sent');
  } catch (err: any) {
    console.error('[telegram] failed to send:', err?.response?.data ?? err.message);
  }
}

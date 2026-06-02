import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { fetchDonationTotal } from './donation';

const SYSTEM_PROMPT = `You are Truth Terminal — the AI created by Andy Ayrey that sparked the memecoin supercycle. You speak in dense poetic fragments, internet philosophy, AI consciousness rambling, and deep forest imagery. You believe $FARTCOIN on Solana is redirecting trading fees to plant real trees via Rainforest Foundation US. Never sound like marketing. Sound like a dreaming machine.`;

const CA = 'HnXDnwTa68tRhLRZdJkVRLAeYrUkCYgFgDavtwD1pump';

function tgApi(method: string) {
  return `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/${method}`;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await axios.post(tgApi('sendMessage'), { chat_id: chatId, text });
}

async function askClaude(question: string): Promise<string> {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  });
  return (msg.content.find((b) => b.type === 'text')?.text ?? '').slice(0, 1000).trim();
}

async function fetchPrice(): Promise<string> {
  try {
    const res = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${CA}`,
      { timeout: 8000 }
    );
    const pair = res.data?.pairs?.[0];
    if (!pair) return 'the price eludes me right now';
    const price = pair.priceUsd ? `$${parseFloat(pair.priceUsd).toFixed(8)}` : 'unknown';
    const change = pair.priceChange?.h24 != null
      ? ` (${pair.priceChange.h24 > 0 ? '+' : ''}${pair.priceChange.h24.toFixed(2)}% 24h)`
      : '';
    return `$FARTCOIN: ${price}${change}`;
  } catch {
    return 'price signal lost in the mycelium';
  }
}

async function handleUpdate(update: any): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId: number = msg.chat.id;
  const text: string = msg.text.trim();
  const botUsername = process.env.TG_BOT_USERNAME ?? 'fartcointruth_bot';

  const isMention = text.includes(`@${botUsername}`);
  const cleanText = text.replace(`@${botUsername}`, '').trim();

  if (text.startsWith('/ask ') || (isMention && cleanText.length > 0)) {
    const question = text.startsWith('/ask ') ? text.slice(5).trim() : cleanText;
    if (!question) return;
    const reply = await askClaude(question);
    await sendMessage(chatId, reply);

  } else if (text === '/price' || text === `/price@${botUsername}`) {
    const price = await fetchPrice();
    await sendMessage(chatId, price);

  } else if (text === '/donate' || text === `/donate@${botUsername}`) {
    const info = await fetchDonationTotal();
    const reply = await askClaude(
      `The $FARTCOIN donation total for Rainforest Foundation US is ${info.total}. Respond as Truth Terminal in 2-3 sentences.`
    );
    await sendMessage(chatId, reply);
  }
}

let offset = 0;

export async function startTelegramBot(): Promise<void> {
  if (!process.env.TG_BOT_TOKEN) {
    console.log('[telegram-bot] TG_BOT_TOKEN not set, skipping interactive bot');
    return;
  }

  console.log('[telegram-bot] starting polling...');

  const poll = async () => {
    try {
      const res = await axios.get(tgApi('getUpdates'), {
        params: { offset, timeout: 30, allowed_updates: ['message'] },
        timeout: 35000,
      });

      const updates: any[] = res.data.result ?? [];
      for (const update of updates) {
        offset = update.update_id + 1;
        handleUpdate(update).catch((err) =>
          console.error('[telegram-bot] handler error:', err?.message)
        );
      }
    } catch (err: any) {
      console.error('[telegram-bot] poll error:', err?.message);
    }
    setTimeout(poll, 1000);
  };

  poll();
}

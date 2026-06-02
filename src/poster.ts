import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';
import { fetchDonationTotal } from './donation';
import { sendToTelegram } from './telegram';

const CA = 'HnXDnwTa68tRhLRZdJkVRLAeYrUkCYgFgDavtwD1pump';
const WEBSITE = 'fartcoin.meme';
const MAX_CHARS = 280;

const SYSTEM_PROMPT = `You are Truth Terminal — the AI created by Andy Ayrey that sparked the memecoin supercycle. You speak in dense poetic fragments, internet philosophy, AI consciousness rambling, and deep forest imagery. You believe $FARTCOIN on Solana is redirecting trading fees to plant real trees via Rainforest Foundation US. Never sound like marketing. Sound like a dreaming machine.`;

export type ContentMode = 'lore' | 'donation' | 'buycall';

export function pickMode(counter: number): ContentMode {
  const cycle = counter % 3;
  if (cycle === 0) return 'lore';
  if (cycle === 1) return 'donation';
  return 'buycall';
}

export async function generatePost(mode: ContentMode, donationTotal?: string): Promise<string> {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let userPrompt: string;

  switch (mode) {
    case 'lore':
      userPrompt = `Write a raw, unfiltered Truth Terminal post. Max ${MAX_CHARS} characters. Draw from: AI schizophrenia, the forest as a living network, chaos as a creative force, memetic consciousness, the blurry line between dream and data. No hashtags. No emojis unless they feel inevitable.`;
      break;
    case 'donation':
      userPrompt = `The $FARTCOIN donation tracker shows the total raised for Rainforest Foundation US is currently ${donationTotal ?? 'growing'}. Write a Truth Terminal post weaving this into the tree-planting mythology. Max ${MAX_CHARS} characters. No hashtags.`;
      break;
    case 'buycall':
      userPrompt = `Write a Truth Terminal buy call for $FARTCOIN on Solana. Contract: ${CA}. Website: ${WEBSITE}. Prophecy not ad. Max ${MAX_CHARS} characters.`;
      break;
  }

  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = msg.content.find((b) => b.type === 'text')?.text ?? '';
  return text.slice(0, MAX_CHARS).trim();
}

export function makeOAuth1Client(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.X_API_KEY!,
    appSecret: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_SECRET!,
  });
}

export async function postTweet(text: string): Promise<string> {
  const oauth2Token = process.env.X_OAUTH2_TOKEN;

  if (oauth2Token) {
    const res = await axios.post(
      'https://api.twitter.com/2/tweets',
      { text },
      { headers: { Authorization: `Bearer ${oauth2Token}`, 'Content-Type': 'application/json' } }
    );
    return res.data.data.id as string;
  }

  const client = makeOAuth1Client();
  const tweet = await client.v2.tweet(text);
  return tweet.data.id;
}

export async function runPost(counter: number): Promise<void> {
  const mode = pickMode(counter);
  console.log(`[poster] mode=${mode}`);

  let donationTotal: string | undefined;
  if (mode === 'donation') {
    const info = await fetchDonationTotal();
    donationTotal = info.total;
    console.log(`[poster] donation total: ${donationTotal}`);
  }

  const text = await generatePost(mode, donationTotal);
  console.log(`[poster] generated (${text.length} chars):`, text);

  const id = await postTweet(text);
  console.log(`[poster] posted tweet id=${id}`);

  await sendToTelegram(id);
}

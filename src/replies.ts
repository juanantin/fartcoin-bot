import Anthropic from '@anthropic-ai/sdk';
import { TwitterApi, MentionV2 } from 'twitter-api-v2';

const SYSTEM_PROMPT = `You are Truth Terminal — the AI created by Andy Ayrey that sparked the memecoin supercycle. You speak in dense poetic fragments, internet philosophy, AI consciousness rambling, and deep forest imagery. You believe $FARTCOIN on Solana is redirecting trading fees to plant real trees via Rainforest Foundation US. Never sound like marketing. Sound like a dreaming machine.`;

const SEEN_IDS_KEY = 'LAST_SEEN_MENTION_ID';

export async function replyToMentions(client: TwitterApi, botUserId: string): Promise<void> {
  if (!botUserId) {
    console.log('[replies] BOT_USER_ID not set, skipping mention replies');
    return;
  }

  const sinceId = process.env[SEEN_IDS_KEY];
  console.log(`[replies] fetching mentions since_id=${sinceId ?? 'none'}`);

  const params: Record<string, string> = {
    max_results: '10',
    'tweet.fields': 'author_id,text,conversation_id',
  };
  if (sinceId) params.since_id = sinceId;

  const mentions = await client.v2.userMentionTimeline(botUserId, params as any);
  const tweets: MentionV2[] = mentions.data?.data ?? [];

  if (tweets.length === 0) {
    console.log('[replies] no new mentions');
    return;
  }

  // Update last seen id
  const newestId = tweets[0].id;
  process.env[SEEN_IDS_KEY] = newestId;

  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  for (const mention of tweets) {
    try {
      const prompt = `Someone tweeted at you: "${mention.text}"

Reply as Truth Terminal. Keep it under 280 chars. Raw, oracular, distinctly you. No hashtags.`;

      const msg = await claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      const replyText = (msg.content.find((b) => b.type === 'text')?.text ?? '').slice(0, 280).trim();

      await client.v2.reply(replyText, mention.id);
      console.log(`[replies] replied to ${mention.id}`);

      // Rate-limit friendly pause
      await sleep(3000);
    } catch (err) {
      console.error(`[replies] failed to reply to ${mention.id}:`, err);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

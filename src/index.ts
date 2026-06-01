import * as dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { TwitterApi } from 'twitter-api-v2';
import { runPost } from './poster';
import { replyToMentions } from './replies';

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
  return val;
}

const client = new TwitterApi({
  appKey: requireEnv('X_API_KEY'),
  appSecret: requireEnv('X_API_SECRET'),
  accessToken: requireEnv('X_ACCESS_TOKEN'),
  accessSecret: requireEnv('X_ACCESS_SECRET'),
});

const botUserId = process.env.BOT_USER_ID ?? '';

// Default: post at 08:00, 14:00, 20:00 UTC
const POST_SCHEDULE = process.env.POST_SCHEDULE ?? '0 8,14,20 * * *';

// Reply check every 30 minutes
const REPLY_SCHEDULE = '*/30 * * * *';

let postCounter = 0;

console.log('Truth Terminal bot starting...');
console.log(`Post schedule: ${POST_SCHEDULE}`);

cron.schedule(POST_SCHEDULE, async () => {
  try {
    await runPost(client, postCounter);
    postCounter++;
  } catch (err) {
    console.error('[scheduler] post failed:', err);
  }
});

cron.schedule(REPLY_SCHEDULE, async () => {
  try {
    await replyToMentions(client, botUserId);
  } catch (err) {
    console.error('[scheduler] replies failed:', err);
  }
});

console.log('Scheduler running. Waiting for next scheduled time...');

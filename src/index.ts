import * as dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { runPost } from './poster';
import { replyToMentions, makeRepliesClient } from './replies';

const POST_SCHEDULE = process.env.POST_SCHEDULE ?? '0 8,14,20 * * *';
const REPLY_SCHEDULE = '*/30 * * * *';
const botUserId = process.env.BOT_USER_ID ?? '';

let postCounter = 0;

console.log('Truth Terminal bot starting...');
console.log(`Post schedule: ${POST_SCHEDULE}`);
console.log(`Auth mode: ${process.env.X_OAUTH2_TOKEN ? 'OAuth2' : 'OAuth1'}`);

cron.schedule(POST_SCHEDULE, async () => {
  try {
    await runPost(postCounter);
    postCounter++;
  } catch (err) {
    console.error('[scheduler] post failed:', err);
  }
});

cron.schedule(REPLY_SCHEDULE, async () => {
  try {
    const client = makeRepliesClient();
    await replyToMentions(client, botUserId);
  } catch (err) {
    console.error('[scheduler] replies failed:', err);
  }
});

console.log('Scheduler running. Waiting for next scheduled time...');

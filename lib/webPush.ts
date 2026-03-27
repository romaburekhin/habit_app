import webpush from 'web-push'
import { getDb } from '@/lib/db'

export async function sendPush(userId: string, title: string, body: string) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  const db = getDb()
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId) as {
    endpoint: string; p256dh: string; auth: string
  }[]

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body })
      ).catch(err => {
        // Remove stale subscriptions (410 Gone)
        if (err.statusCode === 410) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint)
        }
      })
    )
  )
}

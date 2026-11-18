import { createHash, randomBytes } from 'node:crypto';

const lifetime = { INVITATION: 48 * 60 * 60_000, RECOVERY: 30 * 60_000 };

export const hashAccessToken = token => createHash('sha256').update(token).digest('hex');

export async function issueAccountLink(db, user, purpose) {
    const token = randomBytes(32).toString('base64url');
    const values = {
        tokenHash: hashAccessToken(token),
        expiresAt: new Date(Date.now() + lifetime[purpose]),
        purpose,
        sessionVersion: user.sessionVersion,
        studioId: user.studioId,
    };
    const record = await db.accountAccessLink.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...values },
        update: values,
    });
    return { token, expiresAt: record.expiresAt };
}

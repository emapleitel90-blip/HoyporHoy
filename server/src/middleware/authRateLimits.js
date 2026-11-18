import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const minute = 60_000;

function authLimit(options) {
    return rateLimit({
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (_req, res) => {
            const seconds = Number(res.get('Retry-After'));
            const minutes = Math.max(1, Math.ceil(seconds / 60));
            const wait = minutes === 1 ? '1 minuto' : `${minutes} minutos`;
            return res.set('Cache-Control', 'no-store').status(429).json({
                message: `Demasiados intentos. Volvé a intentar en ${wait}.`,
            });
        },
        ...options,
    });
}

export const loginNetworkLimit = authLimit({
    identifier: 'login-network',
    windowMs: 15 * minute,
    limit: 60,
});

export const loginAccountLimit = authLimit({
    identifier: 'login-account-network',
    windowMs: 15 * minute,
    limit: 5,
    skipSuccessfulRequests: true,
    keyGenerator: req => JSON.stringify([ipKeyGenerator(req.ip), req.body.email.toLowerCase()]),
});

export const registrationLimit = authLimit({
    identifier: 'register-network',
    windowMs: 60 * minute,
    limit: 20,
});

export const accountLinkLimit = authLimit({
    identifier: 'account-link-network',
    windowMs: 15 * minute,
    limit: 30,
});

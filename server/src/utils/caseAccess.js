// Keep tasks and assignment scoped to the same cases as the case module.
export const caseScope = (user) => ({
    deletedAt: null,
    ...(user.role === 'SUPER_ADMIN' ? {} : user.studioId
        ? { studioId: user.studioId }
        : { studioId: null, createdById: user.id }),
});

export const participantScope = (caseItem) => ({
    deletedAt: null,
    studioId: caseItem.studioId || null,
    ...(!caseItem.studioId ? { id: caseItem.createdById } : {}),
});

export const REVIEWER_ROLES = ['LAWYER', 'ADMIN', 'SUPER_ADMIN'];

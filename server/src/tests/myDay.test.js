import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de Prisma
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../utils/prismaClient.js', () => ({
    default: {
        deadline: {
            findMany: (...args) => mockFindMany(...args),
            findUnique: (...args) => mockFindUnique(...args),
            update: (...args) => mockUpdate(...args),
        },
        case: {
            findUnique: (...args) => mockFindUnique(...args),
        },
    },
}));

// Mock del deadlineAgent para evitar que se importe y falle
vi.mock('../skills/deadlineAgent.js', () => ({
    checkDeadlinesForStudio: vi.fn().mockResolvedValue([]),
}));

// Importar después del mock
const { getMyDay, updateDeadline } = await import('../controllers/deadlineController.js');

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
const buildRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();
    return res;
};
const nextFn = vi.fn();

const makeReq = (user) => ({
    user,
    params: {},
    body: {},
});

// ──────────────────────────────────────────────────────────────────────────
// TESTS: GET /api/deadlines/my-day
// ──────────────────────────────────────────────────────────────────────────
describe('GET /api/deadlines/my-day (Mi jornada)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFindMany.mockResolvedValue([]);
    });

    it('Debe estar protegido — la función getMyDay existe y es invocable', () => {
        expect(typeof getMyDay).toBe('function');
    });

    it('Debe devolver la estructura correcta con overdue, today, upcoming y counts', async () => {
        const req = makeReq({ id: 'u1', role: 'LAWYER', studioId: 'studio-A' });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                overdue: expect.any(Array),
                today: expect.any(Array),
                upcoming: expect.any(Array),
                counts: expect.objectContaining({
                    overdue: expect.any(Number),
                    today: expect.any(Number),
                    upcoming: expect.any(Number),
                    total: expect.any(Number),
                }),
            }),
        );
    });

    it('Debe filtrar por studioId del token para un usuario LAWYER (multi-tenancy)', async () => {
        const req = makeReq({ id: 'u1', role: 'LAWYER', studioId: 'studio-A' });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        // Verificar que las 3 llamadas a findMany usan el filtro de tenant
        expect(mockFindMany).toHaveBeenCalledTimes(3);
        for (const call of mockFindMany.mock.calls) {
            const whereArg = call[0].where;
            expect(whereArg.case).toBeDefined();
            expect(whereArg.case.studioId).toBe('studio-A');
        }
    });

    it('SUPER_ADMIN debe ver vencimientos de todos los estudios (sin filtro de studioId)', async () => {
        const req = makeReq({ id: 'sa1', role: 'SUPER_ADMIN', studioId: null });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        expect(mockFindMany).toHaveBeenCalledTimes(3);
        for (const call of mockFindMany.mock.calls) {
            const whereArg = call[0].where;
            // SUPER_ADMIN no filtra por studioId específico
            expect(whereArg.case.studioId).toBeUndefined();
        }
    });

    it('Debe excluir vencimientos completados (isCompleted: false)', async () => {
        const req = makeReq({ id: 'u1', role: 'ADMIN', studioId: 'studio-B' });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        for (const call of mockFindMany.mock.calls) {
            expect(call[0].where.isCompleted).toBe(false);
        }
    });

    it('Debe separar correctamente los 3 rangos de fecha (overdue < hoy ≤ upcoming)', async () => {
        const req = makeReq({ id: 'u1', role: 'LAWYER', studioId: 'studio-A' });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        const calls = mockFindMany.mock.calls;

        // Overdue: dueDate < inicio del día
        expect(calls[0][0].where.dueDate).toHaveProperty('lt');

        // Today: dueDate >= inicio del día AND dueDate <= fin del día
        expect(calls[1][0].where.dueDate).toHaveProperty('gte');
        expect(calls[1][0].where.dueDate).toHaveProperty('lte');

        // Upcoming: dueDate > fin del día AND dueDate <= fin del día + 7
        expect(calls[2][0].where.dueDate).toHaveProperty('gt');
        expect(calls[2][0].where.dueDate).toHaveProperty('lte');
    });

    it('Debe excluir expedientes eliminados (deletedAt: null)', async () => {
        const req = makeReq({ id: 'u1', role: 'LAWYER', studioId: 'studio-A' });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        for (const call of mockFindMany.mock.calls) {
            expect(call[0].where.case.deletedAt).toBeNull();
        }
    });

    it('Debe formatear los datos del vencimiento con campos mínimos del expediente', async () => {
        const mockDeadline = {
            id: 'd1',
            title: 'Contestar demanda',
            dueDate: new Date(),
            notes: 'Urgente',
            caseId: 'c1',
            case: {
                id: 'c1',
                caseNumber: 'CAS-001',
                title: 'García c/ López',
                fuero: 'Civil',
                studioId: 'studio-A',
                assignedLawyer: { id: 'u1', name: 'Dr. Pérez' },
            },
        };

        // Solo la primera llamada (overdue) devuelve datos
        mockFindMany
            .mockResolvedValueOnce([mockDeadline])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

        const req = makeReq({ id: 'u1', role: 'LAWYER', studioId: 'studio-A' });
        const res = buildRes();

        await getMyDay(req, res, nextFn);

        const result = res.json.mock.calls[0][0];
        expect(result.overdue).toHaveLength(1);
        expect(result.overdue[0]).toEqual(
            expect.objectContaining({
                id: 'd1',
                title: 'Contestar demanda',
                caseNumber: 'CAS-001',
                caseTitle: 'García c/ López',
                fuero: 'Civil',
                assignedLawyer: 'Dr. Pérez',
            }),
        );
        expect(result.counts.overdue).toBe(1);
        expect(result.counts.total).toBe(1);
    });
});

// ──────────────────────────────────────────────────────────────────────────
// TESTS: PUT /api/deadlines/:id — Aislamiento multi-tenant
// ──────────────────────────────────────────────────────────────────────────
describe('PUT /api/deadlines/:id (Aislamiento multi-tenant)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Debe impedir completar un vencimiento de otro estudio (403)', async () => {
        // El vencimiento pertenece a studio-B, pero el usuario es de studio-A
        mockFindUnique.mockResolvedValue({
            id: 'd1',
            title: 'Test',
            dueDate: new Date(),
            isCompleted: false,
            case: { studioId: 'studio-B' },
        });

        const req = {
            user: { id: 'u1', role: 'LAWYER', studioId: 'studio-A' },
            params: { id: 'd1' },
            body: { isCompleted: true },
        };
        const res = buildRes();

        await updateDeadline(req, res, nextFn);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'No autorizado' }),
        );
    });

    it('Debe permitir completar un vencimiento del mismo estudio', async () => {
        mockFindUnique.mockResolvedValue({
            id: 'd1',
            title: 'Test',
            dueDate: new Date(),
            isCompleted: false,
            notes: null,
            case: { studioId: 'studio-A' },
        });
        mockUpdate.mockResolvedValue({
            id: 'd1',
            title: 'Test',
            dueDate: new Date(),
            isCompleted: true,
            notes: null,
        });

        const req = {
            user: { id: 'u1', role: 'LAWYER', studioId: 'studio-A' },
            params: { id: 'd1' },
            body: { isCompleted: true },
        };
        const res = buildRes();

        await updateDeadline(req, res, nextFn);

        expect(res.json).toHaveBeenCalled();
        // No debería haber recibido status 403
        expect(res.status).not.toHaveBeenCalledWith(403);
    });

    it('SUPER_ADMIN debe poder completar vencimientos de cualquier estudio', async () => {
        mockFindUnique.mockResolvedValue({
            id: 'd1',
            title: 'Test',
            dueDate: new Date(),
            isCompleted: false,
            notes: null,
            case: { studioId: 'studio-X' },
        });
        mockUpdate.mockResolvedValue({
            id: 'd1',
            title: 'Test',
            dueDate: new Date(),
            isCompleted: true,
            notes: null,
        });

        const req = {
            user: { id: 'sa1', role: 'SUPER_ADMIN', studioId: null },
            params: { id: 'd1' },
            body: { isCompleted: true },
        };
        const res = buildRes();

        await updateDeadline(req, res, nextFn);

        expect(res.json).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalledWith(403);
    });
});

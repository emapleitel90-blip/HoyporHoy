import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import { WrittenDocumentsPanel } from '../components/WrittenDocumentsPanel';
import { api } from '../config/api';

const authState = vi.hoisted(() => ({ role: 'OPERATOR' }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: authState.role } }) }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const timestamp = '2026-10-28T15:00:00.000Z';
const metadata = (number, id = 'writing') => ({ id: 'version-' + number, writingId: id, number, title: 'Escrito ' + number,
    requestId: 'saved-' + number, previousVersion: number - 1, notes: number > 1 ? 'Cambio ' + number : '', createdById: 'operator', createdByName: 'Operadora ficticia', createdAt: timestamp });
const makeDetail = ({ number = 2, current = 2, id = 'writing', selected = {} } = {}) => {
    const version = { ...metadata(number, id), content: 'Texto guardado ' + number + '\n  Sangría conservada.', ...selected };
    return { id, caseId: 'case-a', currentVersion: current, createdById: 'operator', createdByName: 'Operadora ficticia', createdAt: timestamp,
        versions: Array.from({ length: current }, (_, index) => { const n = current - index; const item = n === number ? version : metadata(n, id); const { content: _content, ...meta } = item; return meta; }), selectedVersion: version };
};
const listing = detail => ({ id: detail.id, caseId: detail.caseId, currentVersion: detail.currentVersion,
    createdAt: detail.createdAt, latestVersion: detail.versions.find(item => item.number === detail.currentVersion) });
let stored;
const defaultGet = async url => {
    if (url === api.writings.templates('case-a')) return { data: [] };
    if (url === api.writings.byCase('case-a')) return { data: [listing(stored)] };
    if (url === api.writings.get(stored.id)) return { data: stored };
    const number = stored.versions.find(version => url === api.writings.version(stored.id, version.number))?.number;
    if (number) return { data: number === stored.selectedVersion.number ? stored : makeDetail({ id: stored.id, number, current: stored.currentVersion }) };
    throw new Error('Unexpected GET ' + url);
};
const postSaved = async (url, payload) => {
    const creating = url === api.writings.byCase('case-a');
    const number = creating ? 1 : payload.expectedVersion + 1;
    stored = makeDetail({ number, current: number, id: creating ? 'created-writing' : stored.id,
        selected: { ...payload, previousVersion: creating ? 0 : payload.expectedVersion } });
    return { data: stored };
};
const change = (name, value) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const openExisting = async () => {
    render(<WrittenDocumentsPanel caseId="case-a" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Escrito 2 · versión 2' }));
    await screen.findByRole('button', { name: 'Descargar Word de versión 2 guardada' });
};
const startNew = async () => {
    render(<WrittenDocumentsPanel caseId="case-a" />);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo escrito' }));
    change('Título del escrito', '  Presentación manual  '); change('Texto del escrito', 'Primer párrafo.\n  Texto con sangría.');
};

beforeEach(() => {
    authState.role = 'OPERATOR'; stored = makeDetail();
    vi.clearAllMocks(); localStorage.setItem('lyp_token', 'writing-session');
    axios.get.mockImplementation(defaultGet); axios.post.mockImplementation(postSaved);
    URL.createObjectURL = vi.fn(() => 'blob:writing'); URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Escritos manuales y versiones guardadas', () => {
    it('prepara un modelo desde la versión histórica exacta sin guardar ni reemplazar un borrador existente', async () => {
        authState.role = 'LAWYER';
        await openExisting(); change('Versión guardada', '1');
        fireEvent.click(await screen.findByRole('button', { name: 'Crear modelo desde versión 1 guardada' }));
        await screen.findByText('No hay modelos guardados.');
        expect(screen.getByLabelText('Título del modelo').value).toBe('Escrito 1');
        expect(screen.getByLabelText('Texto del modelo').value).toBe('Texto guardado 1\n  Sangría conservada.');
        expect(screen.getByLabelText('Jurisdicción del modelo').value).toBe('');
        expect(axios.post).not.toHaveBeenCalled();
        change('Texto del modelo', 'Texto adaptado {{cliente}}');
        change('Versión guardada', '2');
        fireEvent.click(await screen.findByRole('button', { name: 'Crear modelo desde versión 2 guardada' }));
        expect(screen.getByLabelText('Texto del modelo').value).toBe('Texto adaptado {{cliente}}');
        expect(screen.getByRole('alert').textContent).toContain('Ya hay un modelo en preparación');
        fireEvent.click(screen.getByRole('button', { name: 'Crear nueva versión desde la seleccionada' }));
        expect(screen.getByRole('button', { name: 'Crear modelo desde versión 2 guardada' }).disabled).toBe(true);
    });

    it('no ofrece incorporar modelos al operador ni usa una versión mientras carga otra', async () => {
        await openExisting();
        expect(screen.queryByRole('button', { name: /Crear modelo desde versión/ })).toBeNull();
        cleanup(); authState.role = 'LAWYER';
        await openExisting();
        let resolve;
        axios.get.mockImplementation(url => url === api.writings.version('writing', 1)
            ? new Promise(done => { resolve = done; }) : defaultGet(url));
        change('Versión guardada', '1');
        expect(screen.queryByRole('button', { name: /Crear modelo desde versión/ })).toBeNull();
        await act(async () => resolve({ data: makeDetail({ number: 1 }) }));
        expect(screen.getByRole('button', { name: 'Crear modelo desde versión 1 guardada' })).toBeTruthy();
    });

    it('permite al operador crear un escrito con texto exacto, sesión y confirmación de la versión', async () => {
        await startNew(); change('Nota inicial (opcional)', '  Nota de trabajo  ');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar escrito' }));
        await screen.findByText('Escrito guardado. Versión 1 disponible.');
        const [url, payload, options] = axios.post.mock.calls[0];
        expect(url).toBe(api.writings.byCase('case-a'));
        expect(payload).toEqual({ title: 'Presentación manual', content: 'Primer párrafo.\n  Texto con sangría.', notes: 'Nota de trabajo', requestId: expect.any(String) });
        expect(payload.requestId).toMatch(/^[a-f\d-]{36}$/i);
        expect(options.headers.Authorization).toBe('Bearer writing-session');
        expect(screen.queryByLabelText('Texto del escrito')).toBeNull();
        expect(await screen.findByRole('button', { name: 'Descargar Word de versión 1 guardada' })).toBeTruthy();
        expect(screen.getByText(/Guardar o exportar un escrito no significa aprobarlo ni presentarlo/)).toBeTruthy();
    });

    it('conserva UUID y borrador al reintentar un guardado sin respuesta, y cambia UUID al modificar el contenido', async () => {
        axios.post.mockRejectedValue(new Error('No connection'));
        await startNew(); const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Guardar escrito' }));
        submit(); await screen.findByRole('alert'); const first = axios.post.mock.calls[0][1].requestId;
        submit(); await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
        expect(axios.post.mock.calls[1][1].requestId).toBe(first);
        await screen.findByRole('alert'); change('Texto del escrito', 'Otro texto conservado.');
        submit(); await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(3));
        expect(axios.post.mock.calls[2][1].requestId).not.toBe(first);
        expect(screen.getByLabelText('Texto del escrito').value).toBe('Otro texto conservado.');
        expect(screen.queryByText(/Escrito guardado\. Versión/)).toBeNull();
    });

    it('no informa éxito ante una respuesta que no confirma el contenido solicitado', async () => {
        axios.post.mockResolvedValue({ data: makeDetail({ number: 1, current: 1 }) });
        await startNew(); fireEvent.click(screen.getByRole('button', { name: 'Guardar escrito' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('Texto del escrito').value).toContain('Primer párrafo.');
        expect(screen.queryByText(/Escrito guardado\. Versión/)).toBeNull();
    });

    it('exige cambio real y motivo, y guarda una nueva versión sin modificar el texto anterior', async () => {
        await openExisting(); fireEvent.click(screen.getByRole('button', { name: 'Crear nueva versión desde la seleccionada' }));
        change('Motivo de la nueva versión', 'Corrección de texto');
        fireEvent.submit(screen.getByLabelText('Texto del escrito').closest('form')); await screen.findByRole('alert');
        expect(axios.post).not.toHaveBeenCalled();
        change('Texto del escrito', 'Texto nuevo de trabajo.'); change('Motivo de la nueva versión', '  ');
        fireEvent.submit(screen.getByLabelText('Texto del escrito').closest('form')); expect(axios.post).not.toHaveBeenCalled();
        change('Motivo de la nueva versión', 'Corrección de texto'); fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva versión' }));
        await screen.findByText('Escrito guardado. Versión 3 disponible.');
        expect(axios.post.mock.calls[0][0]).toBe(api.writings.versions('writing'));
        expect(axios.post.mock.calls[0][1]).toMatchObject({ expectedVersion: 2, title: 'Escrito 2', content: 'Texto nuevo de trabajo.', notes: 'Corrección de texto' });
        expect(await screen.findByRole('button', { name: 'Descargar Word de versión 3 guardada' })).toBeTruthy();
    });

    it('conserva borrador y versión base al actualizar, y descarta lecturas pendientes anteriores a guardar', async () => {
        let resolveList, resolveDetail;
        await openExisting(); fireEvent.click(screen.getByRole('button', { name: 'Crear nueva versión desde la seleccionada' }));
        change('Texto del escrito', 'Edición que debe sobrevivir.'); change('Motivo de la nueva versión', 'Ajuste conservado');
        axios.get.mockImplementation(url => {
            if (url === api.writings.byCase('case-a')) return new Promise(resolve => { resolveList = resolve; });
            if (url === api.writings.get('writing')) return new Promise(resolve => { resolveDetail = resolve; });
            return defaultGet(url);
        });
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar escritos' }));
        await waitFor(() => expect(resolveDetail).toBeTypeOf('function'));
        expect(screen.getByLabelText('Texto del escrito').value).toBe('Edición que debe sobrevivir.');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva versión' })); await screen.findByText('Escrito guardado. Versión 3 disponible.');
        await act(async () => { resolveList({ data: [listing(makeDetail())] }); resolveDetail({ data: makeDetail() }); });
        expect(axios.post.mock.calls[0][1].expectedVersion).toBe(2);
        expect(await screen.findByRole('button', { name: 'Escrito 2 · versión 3' })).toBeTruthy();
        expect(await screen.findByRole('button', { name: 'Descargar Word de versión 3 guardada' })).toBeTruthy();
        expect(screen.queryByText('Cargando escritos…')).toBeNull();
    });

    it('mantiene edición en conflicto y solo la descarta cuando se elige actualizar explícitamente', async () => {
        axios.post.mockRejectedValue({ response: { status: 409, data: { message: 'El escrito cambió' } } });
        await openExisting(); fireEvent.click(screen.getByRole('button', { name: 'Crear nueva versión desde la seleccionada' }));
        change('Texto del escrito', 'Mi borrador pendiente.'); change('Motivo de la nueva versión', 'Ajuste');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva versión' })); await screen.findByRole('alert');
        expect(screen.getByLabelText('Texto del escrito').value).toBe('Mi borrador pendiente.');
        fireEvent.click(screen.getByRole('button', { name: 'Descartar edición y actualizar escritos' }));
        await waitFor(() => expect(screen.queryByLabelText('Texto del escrito')).toBeNull());
        expect(screen.queryByText(/Escrito guardado\. Versión/)).toBeNull();
    });

    it('permite restaurar una versión histórica completa como otra nueva, conservando la base vigente', async () => {
        await openExisting(); change('Versión guardada', '1');
        await screen.findByRole('button', { name: 'Descargar Word de versión 1 guardada' });
        fireEvent.click(screen.getByRole('button', { name: 'Crear nueva versión desde la seleccionada' }));
        change('Motivo de la nueva versión', 'Restaurar la redacción original');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva versión' }));
        await screen.findByText('Escrito guardado. Versión 3 disponible.');
        expect(axios.post.mock.calls[0][1]).toMatchObject({ expectedVersion: 2, title: 'Escrito 1', content: 'Texto guardado 1\n  Sangría conservada.', notes: 'Restaurar la redacción original' });
        expect(stored.versions.map(version => version.number)).toEqual([3, 2, 1]);
        expect(await screen.findByRole('button', { name: 'Descargar Word de versión 3 guardada' })).toBeTruthy();
    });

    it('descarga la versión histórica guardada, aunque haya texto nuevo sin guardar, y revoca la URL', async () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        await openExisting(); change('Versión guardada', '1');
        await screen.findByRole('button', { name: 'Descargar Word de versión 1 guardada' });
        fireEvent.click(screen.getByRole('button', { name: 'Crear nueva versión desde la seleccionada' }));
        change('Texto del escrito', 'Este borrador no debe exportarse.');
        const blob = new Blob(['PK-test-docx'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        axios.get.mockImplementation(url => url === api.writings.word('writing', 1) ? Promise.resolve({ data: blob }) : defaultGet(url));
        vi.useFakeTimers(); fireEvent.click(screen.getByRole('button', { name: 'Descargar Word de versión 1 guardada' }));
        await act(async () => { await Promise.resolve(); await Promise.resolve(); });
        expect(axios.get).toHaveBeenCalledWith(api.writings.word('writing', 1), { headers: { Authorization: 'Bearer writing-session' }, responseType: 'blob' });
        expect(URL.createObjectURL).toHaveBeenCalledWith(blob); expect(click).toHaveBeenCalledOnce();
        await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:writing');
        expect(screen.getByLabelText('Texto del escrito').value).toBe('Este borrador no debe exportarse.');
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('compara dos snapshots guardados y muestra sus textos como texto plano', async () => {
        stored = makeDetail({ selected: { content: '<script>Texto ingresado</script>\nTexto de versión 2.' } });
        await openExisting(); fireEvent.click(screen.getByRole('button', { name: 'Comparar versiones' }));
        const first = await screen.findByRole('heading', { name: 'Comparación · versión 1' });
        const second = await screen.findByRole('heading', { name: 'Comparación · versión 2' });
        expect(within(first.closest('article')).getByText(/Texto guardado 1/)).toBeTruthy();
        expect(within(second.closest('article')).getByText(/<script>Texto ingresado<\/script>/)).toBeTruthy();
        expect(document.querySelector('script')).toBeNull();
        expect(axios.get).toHaveBeenCalledWith(api.writings.version('writing', '1'), expect.any(Object));
        expect(axios.get).toHaveBeenCalledWith(api.writings.version('writing', '2'), expect.any(Object));
    });

    it('un error de comparación o descarga no oculta la versión consultada', async () => {
        await openExisting(); axios.get.mockRejectedValue({ response: { status: 500, data: { message: 'Comparación no disponible' } } });
        fireEvent.click(screen.getByRole('button', { name: 'Comparar versiones' })); await screen.findByText('Comparación no disponible');
        expect(screen.getByText(/Texto guardado 2/)).toBeTruthy();
        axios.get.mockRejectedValue({ response: { status: 404, data: { message: 'Word no disponible' } } });
        fireEvent.click(screen.getByRole('button', { name: 'Descargar Word de versión 2 guardada' })); await screen.findByText('Word no disponible');
        expect(screen.getByText(/Texto guardado 2/)).toBeTruthy(); expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('retira la escritura si cambia el permiso y separa los borradores de distintos expedientes', async () => {
        const view = render(<WrittenDocumentsPanel caseId="case-a" />);
        fireEvent.click(screen.getByRole('button', { name: 'Nuevo escrito' })); change('Título del escrito', 'Borrador privado');
        authState.role = 'UNKNOWN'; view.rerender(<WrittenDocumentsPanel caseId="case-a" />);
        await screen.findByText('Tu cuenta ya no puede guardar escritos.'); expect(screen.queryByRole('button', { name: 'Guardar escrito' })).toBeNull();
        authState.role = 'LAWYER'; axios.get.mockResolvedValue({ data: [] }); view.rerender(<WrittenDocumentsPanel caseId="case-b" />);
        await screen.findByText('No hay escritos guardados.'); expect(screen.queryByDisplayValue('Borrador privado')).toBeNull();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('permite reabrir otro escrito tras fallar una creación con su consulta anterior pendiente', async () => {
        const first = makeDetail({ id: 'writing-a', selected: { title: 'Escrito A' } });
        const second = makeDetail({ id: 'writing-b', selected: { title: 'Escrito B' } });
        let resolveOldSecond, secondReads = 0;
        axios.get.mockImplementation(url => {
            if (url === api.writings.byCase('case-a')) return Promise.resolve({ data: [listing(first), listing(second)] });
            if (url === api.writings.get(first.id)) return Promise.resolve({ data: first });
            if (url === api.writings.get(second.id)) {
                ++secondReads;
                return secondReads === 1 ? new Promise(resolve => { resolveOldSecond = resolve; }) : Promise.resolve({ data: second });
            }
            throw new Error('Unexpected GET ' + url);
        });
        axios.post.mockRejectedValue(new Error('No connection'));
        render(<WrittenDocumentsPanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Escrito A · versión 2' }));
        await screen.findByRole('heading', { name: 'Escrito A' });
        fireEvent.click(screen.getByRole('button', { name: 'Escrito B · versión 2' }));
        await waitFor(() => expect(resolveOldSecond).toBeTypeOf('function'));
        fireEvent.click(screen.getByRole('button', { name: 'Nuevo escrito' }));
        change('Título del escrito', 'Nuevo borrador'); change('Texto del escrito', 'Texto que se conserva ante el fallo.');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar escrito' })); await screen.findByRole('alert');
        await act(async () => resolveOldSecond({ data: second }));
        expect(screen.queryByRole('heading', { name: 'Escrito A' })).toBeNull();
        expect(screen.queryByRole('heading', { name: 'Escrito B' })).toBeNull();
        expect(screen.getByLabelText('Texto del escrito').value).toBe('Texto que se conserva ante el fallo.');
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar edición del escrito' }));
        fireEvent.click(screen.getByRole('button', { name: 'Escrito B · versión 2' }));
        await screen.findByRole('heading', { name: 'Escrito B' });
        expect(secondReads).toBe(2);
    });
});

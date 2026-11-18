// Adapt saved studio configurations without deleting historical case values.
export function organizeAdmissionSections(sections) {
    const legacyIds = ['datos-consultante', 'perfil-socioeconomico', 'informacion-caso', 'plazos-urgencias', 'clasificacion-juridica', 'documentacion', 'scoring', 'analisis-psicologico', 'expectativas', 'evaluacion-lyp', 'foda', 'timeline', 'administrativo'];
    // Early installations persisted numeric module IDs instead of named IDs.
    const hasLegacyConsultant = sections.some(section => String(section.id) === '1' && /datos del consultante/i.test(section.title));
    if (hasLegacyConsultant) sections = sections.map(section => ({ ...section, storageId: section.storageId || section.id, id: legacyIds[Number(section.id) - 1] || section.id }));
    if (!sections.some(section => section.id === 'datos-consultante')) return sections;
    const removed = new Set(['expectativas', 'evaluacion-lyp', 'foda']);
    const embedded = sections.find(section => section.id === 'datos-consultante')?.fields?.filter(field => field.group === 'expectativas');
    const expectations = sections.find(section => section.id === 'expectativas')?.fields || (embedded?.length ? embedded : null) || [
        { name: 'resultadoEsperado', label: 'Resultado buscado', type: 'textarea', rows: 2 },
        { name: 'disposicionNegociar', label: 'Disposición a conciliar', type: 'select', options: ['Alta', 'Media', 'Baja', 'Nula'] },
    ];
            const processFields = [
                { name: 'procesoIniciado', label: '¿Se inició un proceso o se realizó una actuación?', type: 'select', options: ['Sin registrar', 'Sí', 'No'] },
                { name: 'actuacionProcesal', label: 'Actuación realizada', type: 'select', group: 'proceso', options: ['Presentación de demanda', 'Contestación de demanda', 'Presentación de recurso', 'Presentación de renuncia', 'Inicio de mediación o conciliación', 'Solicitud de medida cautelar', 'Otra actuación'] },
                { name: 'fechaActuacionProcesal', label: 'Fecha de la actuación', type: 'date', group: 'proceso' },
                { name: 'detalleActuacionProcesal', label: 'Detalle de la actuación / presentación', type: 'textarea', rows: 3, fullWidth: true, group: 'proceso' },
            ];
    const processNames = new Set(processFields.map(field => field.name));
    const result = sections.filter(section => !removed.has(section.id)).map(section => {
        if (section.id === 'datos-consultante') {
            const names = new Set(expectations.map(field => field.name));
            return { ...section, fields: [
                { name: 'poderFirmado', label: '¿El consultante firmó un poder?', type: 'select', options: ['Sin registrar', 'Pendiente', 'Sí', 'No'] },
                ...(section.fields || []).filter(field => field.name !== 'poderFirmado' && !names.has(field.name) && !processNames.has(field.name)).map(field => field.name === 'dni' ? { ...field, label: 'DNI / CUIT / CUIL' } : field),
                ...processFields,
                ...expectations.map(field => ({ ...field, group: 'expectativas', rows: 2 })),
            ] };
        }
        if (section.id === 'timeline' && !section.fields?.length) {
            return { ...section, fields: Array.from({ length: 5 }, (_, index) => [
                { name: `hito${index + 1}_fecha`, label: `Hito ${index + 1}: fecha`, type: 'date' },
                { name: `hito${index + 1}_descripcion`, label: `Hito ${index + 1}: descripción`, type: 'text' },
            ]).flat() };
        }
        if (section.id === 'informacion-caso') {
            const names = new Set(processFields.map(field => field.name));
            return { ...section, fields: (section.fields || []).filter(field => !names.has(field.name)) };
        }
        return { ...section };
    });
    const first = ['datos-consultante', 'timeline', 'analisis-psicologico'];
    const ordered = [...first.flatMap(id => result.filter(section => section.id === id)), ...result.filter(section => !first.includes(section.id))];
    let number = 0;
    return ordered.map(section => ({ ...section, title: `${section.enabled ? ++number : number + 1}. ${section.title.replace(/^\d+\.\s*/, '')}` }));
}

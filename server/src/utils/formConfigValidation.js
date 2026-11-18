const sectionTypes = new Set(['standard', 'checklist', 'scoring', 'foda', 'timeline']);
const fieldTypes = new Set(['text', 'email', 'tel', 'number', 'date', 'textarea', 'select']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length <= max;
const label = (value, max) => text(value, max) && value.trim().length > 0;
const identifier = value => typeof value === 'string'
    && /^[\p{L}\p{N}_-]{1,100}$/u.test(value)
    && !['__proto__', 'prototype', 'constructor'].includes(value);
const optionalBoolean = value => value === undefined || typeof value === 'boolean';
const labels = values => Array.isArray(values) && values.length <= 200
    && values.every(value => label(value, 500));

function validField(field) {
    if (!record(field) || !identifier(field.name) || !label(field.label, 300) || !fieldTypes.has(field.type)) {
        return false;
    }
    if (field.options !== undefined && !labels(field.options)) return false;
    if (field.type === 'select' && !['assignedLawyerId', 'abogadoAsignado'].includes(field.name)) {
        if (!field.options?.length) return false;
    }
    return optionalBoolean(field.required) && optionalBoolean(field.fullWidth)
        && (field.placeholder === undefined || text(field.placeholder, 500))
        && (field.group === undefined || identifier(field.group))
        && (field.rows === undefined || (Number.isInteger(field.rows) && field.rows >= 1 && field.rows <= 30));
}

function validSection(section) {
    return record(section) && identifier(section.id) && label(section.title, 300)
        && sectionTypes.has(section.type) && typeof section.enabled === 'boolean'
        && (section.storageId === undefined || identifier(section.storageId))
        && (section.description === undefined || text(section.description, 2000))
        && (section.items === undefined || labels(section.items))
        && (section.fields === undefined || (Array.isArray(section.fields)
            && section.fields.length <= 100 && section.fields.every(validField)));
}

export function validFormSections(sections) {
    return Array.isArray(sections) && sections.length <= 60
        && sections.every(validSection) && sections.some(section => section.enabled)
        && new Set(sections.map(section => section.id)).size === sections.length;
}

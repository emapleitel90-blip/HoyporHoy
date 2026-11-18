import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { CasePrioritySelect } from './CasePriority';

export function QuickCaseForm({ formData, onChange, priority, onPriorityChange, disabled }) {
    return (
        <Card className="p-5 sm:p-7">
            <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-4 text-lg font-semibold">Datos básicos</legend>
                <div className="space-y-2">
                    <Label htmlFor="quick-client">Nombre del cliente</Label>
                    <Input id="quick-client" name="clientName" value={formData.clientName || ''} onChange={onChange} maxLength={200} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="quick-subject">Asunto</Label>
                    <Input id="quick-subject" name="title" value={formData.title || ''} onChange={onChange} maxLength={200} required
                        placeholder="Ej. Reclamo laboral" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="quick-dni">DNI / CUIT / CUIL (opcional)</Label>
                    <Input id="quick-dni" name="dni" value={formData.dni || ''} onChange={onChange} maxLength={200} />
                </div>
                <CasePrioritySelect id="case-priority" value={priority} onChange={onPriorityChange} />
            </fieldset>
        </Card>
    );
}

export function InitialCaseAction({ action, onChange, members, disabled }) {
    const change = event => onChange({ ...action, [event.target.name]: event.target.value });
    return (
        <Card className="space-y-4 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Próxima acción</h3>
                <Button type="button" variant="outline" size="sm" disabled={disabled}
                    aria-expanded={action.enabled} aria-controls="initial-action-fields"
                    onClick={() => onChange({ ...action, enabled: !action.enabled })}>
                    {action.enabled ? 'Quitar próxima acción' : 'Agregar próxima acción'}
                </Button>
            </div>
            {action.enabled && (
                <fieldset id="initial-action-fields" disabled={disabled} className="grid gap-4 sm:grid-cols-2">
                    <legend className="sr-only">Datos de la próxima acción</legend>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="initial-action-title">Qué hay que hacer</Label>
                        <Input id="initial-action-title" name="title" value={action.title} onChange={change}
                            maxLength={200} placeholder="Ej. Solicitar documentación" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initial-action-date">Fecha de la próxima acción</Label>
                        <Input id="initial-action-date" type="date" name="dueDate" value={action.dueDate} onChange={change} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="initial-action-assignee">Responsable de la acción</Label>
                        <NativeSelect id="initial-action-assignee" name="assigneeId" value={action.assigneeId} onChange={change}>
                            <option value="">Yo</option>
                            {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                        </NativeSelect>
                    </div>
                </fieldset>
            )}
        </Card>
    );
}

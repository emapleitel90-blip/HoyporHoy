import React from 'react';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';

const PRIORITIES = {
    LOW: { label: 'Baja', color: 'bg-muted text-muted-foreground' },
    MEDIUM: { label: 'Media', color: 'bg-secondary text-secondary-foreground' },
    HIGH: { label: 'Alta', color: 'bg-yellow-100 text-status-yellow' },
    URGENT: { label: 'Urgente', color: 'bg-red-100 text-status-red' },
};

export function CasePrioritySelect({ id, value, onChange, filter = false }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>Prioridad</Label>
            <NativeSelect id={id} className="w-full" value={value} onChange={onChange}>
                {filter && <option value="">Todas las prioridades</option>}
                {Object.entries(PRIORITIES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </NativeSelect>
        </div>
    );
}

export function CasePriorityBadge({ priority, showLabel = false }) {
    const { label, color } = Object.hasOwn(PRIORITIES, priority) ? PRIORITIES[priority] : PRIORITIES.MEDIUM;
    return <Badge variant="outline" className={`border-transparent ${color}`}>{showLabel ? `Prioridad ${label.toLowerCase()}` : label}</Badge>;
}

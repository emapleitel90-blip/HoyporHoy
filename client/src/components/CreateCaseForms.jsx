import React from 'react';
import { Info, CheckCircle2, AlertCircle } from 'lucide-react';

export const Field = ({ label, name, type = 'text', value, onChange, required, placeholder }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
        <input
            name={name}
            type={type}
            value={value || ''}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300"
        />
    </div>
);

export const Select = ({ label, name, value, onChange, options, required }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
        <div className="relative">
            <select
                name={name}
                value={value || ''}
                onChange={onChange}
                required={required}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-bold text-slate-700 outline-none bg-white appearance-none cursor-pointer"
            >
                <option value="" className="text-slate-400">Seleccionar...</option>
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
        </div>
    </div>
);

export const Textarea = ({ label, name, value, onChange, placeholder, rows = 3 }) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <textarea
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold text-slate-700 outline-none resize-none placeholder:text-slate-300"
        />
    </div>
);

export const SectionInfo = ({ children }) => (
    <div className="col-span-full flex items-start gap-3 p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-[20px] mb-6 shadow-sm shadow-indigo-100/20">
        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
            <Info className="w-4 h-4 flex-shrink-0" />
        </div>
        <p className="text-xs text-indigo-900 font-semibold leading-relaxed">{children}</p>
    </div>
);

export const SCORE_VALUES = {
    verde: 1,
    amarillo: 3,
    rojo: 5
};

export const SCORING_ITEMS = [
    { key: 'procedencia', label: 'Verosimilitud del Derecho', desc: 'Sólidez jurídica del reclamo' },
    { key: 'prueba', label: 'Caudal Probatorio', desc: 'Disponibilidad de documentos y testigos' },
    { key: 'solvencia', label: 'Solvencia Contraparte', desc: 'Bienes o capacidad de pago del demandado' },
    { key: 'plazos', label: 'Plazos / Prescripción', desc: 'Cercanía de vencimientos críticos' },
    { key: 'complejidad', label: 'Complejidad Técnica', desc: 'Nivel de especialización requerido' },
    { key: 'clienteConfiable', label: 'Confiabilidad Cliente', desc: 'Coherencia y colaboración del consultante' },
    { key: 'antecedentes', label: 'Jurisprudencia', desc: 'Tendencia de fallos en casos similares' },
    { key: 'costoVsBeneficio', label: 'Costo / Beneficio', desc: 'Justificación del esfuerzo vs resultado' },
    { key: 'riesgoReputacional', label: 'Riesgo Reputacional', desc: 'Impacto en la imagen del estudio' },
    { key: 'capacidadOperativa', label: 'Capacidad de Atención', desc: 'Recursos disponibles para el caso' },
];

export const getScoreLabel = (score) => {
    if (score === 0 || !score) return null;
    if (score <= 14) return { label: 'ALTA VIABILIDAD — Admisión Ideal', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score <= 24) return { label: 'VIABILIDAD MEDIA — Evaluar con Cautela', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'BAJA VIABILIDAD — Recomendar Rechazo', color: 'text-red-600', bg: 'bg-red-50' };
};


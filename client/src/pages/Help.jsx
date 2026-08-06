import React from 'react';
import { BookOpen, Users, Briefcase, FileText, CheckCircle2 } from 'lucide-react';

const Help = () => {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Manual de Usuario</h1>
                        <p className="text-slate-500">Aprende a utilizar LyP Gestión para optimizar tu trabajo diario.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Seccion 1 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600 mb-2">
                            <Briefcase size={20} />
                            <h2 className="text-lg font-semibold text-slate-800">Gestión de Casos</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Los casos o expedientes son el núcleo del sistema. Para crear uno nuevo, dirígete a la sección "Gestión de Casos" y haz clic en el botón "Nuevo Caso".
                        </p>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Rellena la información básica: título, descripción y prioridad.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Asigna el caso a un cliente existente o crea uno nuevo en el momento.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>A medida que el caso avanza, actualiza su estado (Abierto, En Progreso, Cerrado).</span>
                            </li>
                        </ul>
                    </div>

                    {/* Seccion 2 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600 mb-2">
                            <Users size={20} />
                            <h2 className="text-lg font-semibold text-slate-800">Clientes</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Mantén una base de datos actualizada de todos los involucrados en tus expedientes.
                        </p>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Registra DNI, correos y teléfonos para un contacto rápido.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Un cliente puede estar asociado a múltiples casos simultáneamente.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Seccion 3 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600 mb-2">
                            <FileText size={20} />
                            <h2 className="text-lg font-semibold text-slate-800">Notas y Actualizaciones</h2>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Lleva el historial completo de cada expediente a través del sistema de notas.
                        </p>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Entra al detalle de un caso haciendo clic en él en la lista.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                <span>Utiliza la pestaña "Notas" para registrar llamadas telefónicas, audiencias o movimientos del juzgado.</span>
                            </li>
                        </ul>
                    </div>

                    {/* FAQ */}
                    <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-800">Preguntas Frecuentes</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-slate-800">¿Cómo cambio mi contraseña?</p>
                                <p className="text-xs text-slate-500 mt-1">Ve a la sección "Configuración" desde el menú lateral y busca la opción de Seguridad.</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-800">¿Quién tiene acceso a mis expedientes?</p>
                                <p className="text-xs text-slate-500 mt-1">Solo los miembros de tu Estudio Jurídico con cuenta activa pueden ver la información (On-Premise).</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="text-center mt-8 text-sm text-slate-400">
                <p>¿Necesitas soporte técnico adicional? Contacta con el administrador del sistema en tu estudio.</p>
            </div>
        </div>
    );
};

export default Help;

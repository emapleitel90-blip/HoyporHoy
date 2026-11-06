import { Card } from '../components/ui/card';
import React from 'react';
import { BookOpen, Users, Briefcase, FileText, CheckCircle2 } from 'lucide-react';

const Help = () => {
    return (
        <div className="space-y-6">
            <Card className="bg-card rounded-2xl shadow-sm border border-border p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-link">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Manual de Usuario</h1>
                        <p className="text-muted-foreground">Aprende a utilizar LyP Gestión para optimizar tu trabajo diario.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Seccion 1 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-link mb-2">
                            <Briefcase size={20} />
                            <h2 className="text-lg font-semibold text-foreground">Gestión de Casos</h2>
                        </div>
                        <p className="text-secondary-foreground text-sm leading-relaxed">
                            Para crear un expediente, abrí &quot;Gestión de Expedientes&quot; y elegí &quot;Nuevo Caso&quot;. En pantallas angostas, usá &quot;Abrir menú&quot; para cambiar de sección.
                        </p>
                        <ul className="space-y-2 text-sm text-secondary-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>Completá los módulos de admisión con los datos del consultante y del caso.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>Desde la lista podés abrir el detalle, editar el expediente o importar casos desde CSV, XLS o XLSX.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>En el detalle encontrás tareas, vencimientos, gastos, seguimiento, archivos, honorarios y referencias jurisprudenciales.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Seccion 2 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-link mb-2">
                            <Users size={20} />
                            <h2 className="text-lg font-semibold text-foreground">Datos del consultante</h2>
                        </div>
                        <p className="text-secondary-foreground text-sm leading-relaxed">
                            Los datos personales y de contacto se completan en el formulario de admisión del expediente.
                        </p>
                        <ul className="space-y-2 text-sm text-secondary-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>Registra DNI, correos y teléfonos para un contacto rápido.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>Revisá los datos de cada expediente antes de preparar un seguimiento o recordatorio para el cliente.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Seccion 3 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-link mb-2">
                            <FileText size={20} />
                            <h2 className="text-lg font-semibold text-foreground">Documentación y seguimiento</h2>
                        </div>
                        <p className="text-secondary-foreground text-sm leading-relaxed">
                            Registrá documentos pendientes, compromisos y bloqueos en el panel de seguimiento. Las tareas y los seguimientos conservan su historial.
                        </p>
                        <ul className="space-y-2 text-sm text-secondary-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>Entra al detalle de un caso haciendo clic en él en la lista.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 size={16} className="text-status-green mt-0.5 shrink-0" />
                                <span>Adjuntá archivos reales en &quot;Documentación y Archivos&quot;. Recibir un documento y verificarlo son pasos distintos.</span>
                            </li>
                        </ul>
                    </div>

                    {/* FAQ */}
                    <div className="space-y-4 bg-background p-6 rounded-xl border border-border">
                        <h2 className="text-lg font-semibold text-foreground">Preguntas Frecuentes</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-foreground">¿Cómo cambio mi contraseña?</p>
                                <p className="text-xs text-muted-foreground mt-1">Ve a la sección &quot;Configuración&quot; desde el menú lateral y busca la opción de Seguridad.</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">¿Quién tiene acceso a mis expedientes?</p>
                                <p className="text-xs text-muted-foreground mt-1">Los integrantes activos del estudio comparten sus expedientes. Los usuarios independientes acceden a los propios. Los superadministradores tienen acceso administrativo general.</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">¿Cómo registro honorarios y pagos?</p>
                                <p className="text-xs text-muted-foreground mt-1">En el detalle, un abogado o administrador registra el acuerdo y las cuotas en &quot;Honorarios y cobranzas&quot;. Cada pago recibido reduce el saldo. Mi jornada reúne cuotas atrasadas y próximas; los recordatorios se copian para revisar y enviar manualmente.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="text-center mt-8 text-sm text-muted-foreground">
                <p>¿Necesitas soporte técnico adicional? Contacta con el administrador del sistema en tu estudio.</p>
            </div>
        </div>
    );
};

export default Help;

import { NextActionPanel } from '../components/NextActionPanel';
import { CasePriorityBadge } from '../components/CasePriority';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Edit, ArrowLeft, CalendarDays, Scale, User, FileText, Clock, Download, Heart, DollarSign, GraduationCap } from 'lucide-react';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { DeadlinePanel } from '../components/DeadlinePanel';
import { ExpensePanel } from '../components/ExpensePanel';
import { CaseFilePanel } from '../components/CaseFilePanel';
import { JurisprudencePanel } from '../components/JurisprudencePanel';
import { TaskPanel } from '../components/TaskPanel';
import { FollowUpPanel } from '../components/FollowUpPanel';
import { FeePanel } from '../components/FeePanel';
import { WrittenDocumentsPanel } from '../components/WrittenDocumentsPanel';
import { CaseProgressSummary } from '../components/CaseProgressSummary';
import { formatLegalDate } from '../utils/agendaDates';

const STATUS_LABELS = {
    OPEN: 'Abierto', CLOSED: 'Cerrado', IN_REVIEW: 'En Revisión',
    PENDING: 'Pendiente', REJECTED: 'Rechazado',
};
const STATUS_COLORS = {
    OPEN: 'bg-green-100 text-status-green', CLOSED: 'bg-muted text-foreground',
    IN_REVIEW: 'bg-blue-100 text-link', PENDING: 'bg-yellow-100 text-status-yellow',
    REJECTED: 'bg-red-100 text-status-red',
};

const InfoRow = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
        <div>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
            <dd className="mt-1 text-sm text-foreground">{value}</dd>
        </div>
    );
};

const Section = ({ icon: Icon, title, children }) => (
    <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-background flex items-center gap-2">
            <Icon className="w-4 h-4 text-link" />
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {children}
        </dl>
    </Card>
);

const ScorePanel = ({ score }) => {
    if (!score) return null;
    const isIdeal = score <= 14;
    const isWarn = score <= 24;
    const label = isIdeal ? 'Admisión Ideal' : isWarn ? 'Evaluar con Cautela' : 'Recomendar Rechazo';
    const color = isIdeal ? 'text-green-400' : isWarn ? 'text-yellow-400' : 'text-red-400';
    const bg = isIdeal ? 'bg-green-500/20' : isWarn ? 'bg-yellow-500/20' : 'bg-red-500/20';
    return (
        <div className="admission-score p-6 bg-primary rounded-xl text-white flex items-center justify-between">
            <div>
                <h4 className="text-base font-bold">Score de Admisión</h4>
                <p className="text-muted-foreground text-sm">Resultado del análisis de admisión (10 indicadores)</p>
            </div>
            <div className="text-right">
                <span className={`block text-3xl font-bold ${color}`}>{score} pts</span>
                <span className={`inline-block mt-1 px-3 py-1 ${bg} ${color} rounded-full text-xs font-bold uppercase tracking-wide`}>
                    {label}
                </span>
            </div>
        </div>
    );
};

const ViewCase = () => {
    const { id } = useParams();
    const role = useAuth()?.user?.role;
    const canConfirmPrescription = ['ADMIN', 'LAWYER', 'SUPER_ADMIN'].includes(role);
    const [caseItem, setCaseItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retry, setRetry] = useState(0);
    const [summaryVersion, setSummaryVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setCaseItem(null); setError(null); setLoading(true);
        const fetchCase = async () => {
            try {
                const token = localStorage.getItem('lyp_token');
                const { data } = await axios.get(api.cases.get(id), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (cancelled) return;
                if (data?.id !== id) throw new Error('Expediente recibido inválido');
                setCaseItem(data);
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                if (err.response) {
                    const status = err.response.status;
                    if (status === 401) setError('Tu sesión venció. Volvé a iniciar sesión.');
                    else if (status === 403) setError('No tenés permisos para acceder a este expediente.');
                    else if (status === 404) setError('El expediente no existe o ya no está disponible.');
                    else setError('Ocurrió un error al cargar el expediente.');
                } else if (err.request) {
                    setError('No se pudo conectar con el servidor.');
                } else {
                    setError('Ocurrió un error al cargar el expediente.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchCase();
        return () => { cancelled = true; };
    }, [id, retry]);

    const handleGenerateDocument = async () => {
        try {
            const token = localStorage.getItem('lyp_token');
            const response = await axios.post(api.documents.generate, { caseId: id, templateType: 'cedula' }, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `cedula_${caseItem.caseNumber}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Error al generar documento", err);
            alert("Hubo un error al generar el documento");
        }
    };


    if (loading || (caseItem && caseItem.id !== id)) return (
        <div role="status" aria-label="Cargando expediente" className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-red-50 text-status-red p-6 rounded-xl border border-red-200 max-w-md w-full text-center shadow-sm">
                <h3 className="text-lg font-bold mb-2">Acceso Denegado / Error</h3>
                <p className="mb-6">{error}</p>
                <div className="flex justify-center gap-4">
                    <Link to="/cases" className="px-4 py-2 bg-card text-foreground font-medium rounded-lg border border-border hover:bg-background transition-colors">
                        Volver a expedientes
                    </Link>
                    <Button variant="legacy" size="legacy"
                        onClick={() => setRetry(value => value + 1)}
                        className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Reintentar
                    </Button>
                </div>
            </div>
        </div>
    );

    if (!caseItem) return <div>Caso no encontrado</div>;

    let details = {};
    if (caseItem.details) {
        try { details = typeof caseItem.details === 'string' ? JSON.parse(caseItem.details) : caseItem.details; }
        catch (e) { console.error("Error parsing details", e); }
    }

    const docs = Object.entries(details)
        .filter(([k, v]) => k.startsWith('doc_') && v === true)
        .map(([k]) => k.replace('doc_', '').replace(/_/g, ' '));

    const hitosFecha = [1, 2, 3, 4, 5]
        .filter(n => details[`hito${n}_fecha`] || details[`hito${n}_descripcion`])
        .map(n => ({ fecha: details[`hito${n}_fecha`], desc: details[`hito${n}_descripcion`] }));

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link to="/cases" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{caseItem.clientName || caseItem.title}</h2>
                        {caseItem.clientName && caseItem.title && caseItem.title !== `Caso de ${caseItem.clientName}` && (
                            <p className="text-sm text-foreground">{caseItem.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm text-muted-foreground">{caseItem.caseNumber}</span>
                            {caseItem.fuero && <span className="px-2 py-0.5 text-xs bg-indigo-100 text-link rounded-full font-medium">{caseItem.fuero}</span>}
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[caseItem.status] || 'bg-muted text-foreground'}`}>
                                {STATUS_LABELS[caseItem.status] || caseItem.status}
                            </span>
                            <CasePriorityBadge priority={caseItem.priority} showLabel />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="legacy" size="legacy" onClick={handleGenerateDocument} className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                        <Download className="-ml-1 mr-2 h-4 w-4" />
                        Generar Cédula
                    </Button>
                    <Link to={`/cases/${id}/edit`} className="inline-flex items-center px-4 py-2 border border-border rounded-lg shadow-sm text-sm font-medium text-foreground bg-card hover:bg-background">
                        <Edit className="-ml-1 mr-2 h-4 w-4" />
                        Editar
                    </Link>
                </div>
            </div>

            <NextActionPanel caseId={caseItem.id} />

            {/* Score Banner */}
            <CaseProgressSummary caseId={caseItem.id} files={caseItem.files||[]} refreshVersion={summaryVersion}/>
            {caseItem.score > 0 && <ScorePanel score={caseItem.score} />}

            {/* 1. Datos del Consultante */}
            <Section icon={User} title="1. Datos del Consultante">
                <InfoRow label="¿El consultante firmó un poder?" value={({ Firmado: 'Sí', 'No firmado': 'No' })[details.poderFirmado] || details.poderFirmado || 'Sin registrar'} />
                    <InfoRow label="¿Se inició un proceso o se realizó una actuación?" value={details.procesoIniciado || 'Sin registrar'} />
                    {details.procesoIniciado === 'Sí' && (
                        <>
                            <InfoRow label="Actuación realizada" value={details.actuacionProcesal} />
                            <InfoRow label="Fecha de la actuación" value={formatLegalDate(details.fechaActuacionProcesal)} />
                            <div className="col-span-full"><InfoRow label="Detalle de la actuación" value={details.detalleActuacionProcesal} /></div>
                        </>
                    )}
                <InfoRow label="Cliente" value={caseItem.clientName} />
                <InfoRow label="DNI / CUIT / CUIL" value={details.dni} />
                <InfoRow label="Fecha de nacimiento" value={formatLegalDate(details.birthDate)} />
                <InfoRow label="Email" value={details.email} />
                <InfoRow label="Teléfono" value={details.phone} />
                <InfoRow label="Domicilio" value={details.address} />
                <InfoRow label="Estado civil" value={details.estadoCivil} />
                <InfoRow label="Hijos a cargo" value={details.hijosACargo} />
                <InfoRow label="Canal de consulta" value={details.canalConsulta} />
                <div className="col-span-full rounded-lg border border-border bg-background p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Expectativas del cliente</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoRow label="Resultado esperado" value={details.resultadoEsperado || 'Sin registrar'} />
                        <InfoRow label="Disposición a negociar" value={details.disposicionNegociar} />
                        <InfoRow label="Plazo esperado" value={details.plazoEsperado} />
                        <InfoRow label="Expectativa económica" value={details.expectativaEconomica} />
                        <InfoRow label="Observaciones" value={details.notasExpectativas} />
                    </div>
                </div>
            </Section>

            {/* 12. Línea de Tiempo */}
            {hitosFecha.length > 0 && (
                <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-background flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-link" />
                        <h3 className="text-base font-semibold text-foreground">2. Línea de Tiempo</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {hitosFecha.map((hito, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                                    {i < hitosFecha.length - 1 && <div className="w-0.5 h-full bg-secondary mt-1 flex-1 min-h-[20px]"></div>}
                                </div>
                                <div className="pb-4">
                                    <p className="empty:hidden text-xs text-muted-foreground font-medium mb-1">{formatLegalDate(hito.fecha)}</p>
                                    <p className="text-sm text-foreground">{hito.desc || '—'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* 8. Análisis Psicológico */}
            {(details.estadoEmocional || details.nivelEstres || details.motivacionCliente || details.motivacion || details.redDeApoyo || details.observacionesPsico) && (
                <Section icon={Heart} title="3. Análisis Psicológico del Consultante">
                    <InfoRow label="Estado emocional" value={details.estadoEmocional} />
                    <InfoRow label="Nivel de estrés" value={details.nivelEstres} />
                    <InfoRow label="Motivación principal" value={details.motivacionCliente || details.motivacion} />
                    <InfoRow label="Red de apoyo" value={details.redDeApoyo} />
                    <div className="col-span-full">
                        <InfoRow label="Observaciones del entrevistador" value={details.observacionesPsico} />
                    </div>
                </Section>
            )}

            {/* 2. Perfil Socioeconómico */}
            {(details.situacionLaboral || details.ingresosMensuales || details.obraSocial || details.nivelEducativo) && (
                <Section icon={GraduationCap} title="Perfil Socioeconómico">
                    <InfoRow label="Situación laboral" value={details.situacionLaboral} />
                    <InfoRow label="Ingresos mensuales" value={details.ingresosMensuales} />
                    <InfoRow label="Obra social / Prepaga" value={details.obraSocial} />
                    <InfoRow label="Nivel educativo" value={details.nivelEducativo} />
                    <InfoRow label="Situación BCRA" value={details.bcra} />
                    <InfoRow label="Propiedades a nombre" value={details.propiedades} />
                    <div className="col-span-full">
                        <InfoRow label="Deudas conocidas" value={details.deudasConocidas} />
                    </div>
                </Section>
            )}

            {/* 3. Información del Caso */}
            {(details.fuero || details.tipoCaso || details.descripcionCaso || caseItem.description) && (
                <Section icon={Scale} title="Información del Caso">
                    <InfoRow label="Fuero" value={caseItem.fuero || details.fuero} />
                    <InfoRow label="Tipo de caso" value={details.tipoCaso} />
                    <InfoRow label="Instancia procesal" value={details.instanciaProcesal} />
                    <InfoRow label="Juzgado" value={details.juzgado} />
                    <InfoRow label="Nro. de expediente" value={details.nroExpediente} />
                    <InfoRow label="Contraparte" value={details.contraparte} />
                    <InfoRow label="Abogado de contraparte" value={details.abogadoContraparte} />
                    <InfoRow label="¿Mediación previa?" value={details.mediacionPrevia} />
                    <InfoRow label="Jurisdicción" value={details.jurisdiccion} />
                    <div className="col-span-full">
                        <InfoRow label="Descripción del caso" value={details.descripcionCaso || caseItem.description} />
                    </div>
                </Section>
            )}

            {/* 4. Plazos y Urgencias */}
            {(details.motivoUrgencia || details.fechaPrescripcion
                || details.proximaAudiencia || details.fechaHecho || details.plazoContestacion) && (
                <Section icon={Clock} title="Plazos y Urgencias">
                    <InfoRow label="Motivo de urgencia" value={details.motivoUrgencia} />
                    <div>
                        <InfoRow label="Prescripción estimada" value={formatLegalDate(details.fechaPrescripcion)} />
                        {formatLegalDate(details.fechaPrescripcion) && <a href="#agenda-vencimientos" className="mt-1 inline-block text-sm text-link underline">Ver en Agenda de Vencimientos</a>}
                    </div>
                    <InfoRow label="Próxima audiencia" value={formatLegalDate(details.proximaAudiencia)} />
                    <InfoRow label="Inicio del hecho" value={formatLegalDate(details.fechaHecho)} />
                    <InfoRow label="Plazo de contestación" value={formatLegalDate(details.plazoContestacion)} />
                    <div className="col-span-full">
                        <InfoRow label="Observaciones" value={details.notasPlazos} />
                    </div>
                </Section>
            )}

            {/* 5. Clasificación Jurídica */}
            {(details.areaJuridica || details.subtipoCaso || details.probabilidadExito || details.complejidadCaso) && (
                <Section icon={Scale} title="Clasificación Jurídica">
                    <InfoRow label="Área jurídica" value={details.areaJuridica} />
                    <InfoRow label="Subtipo" value={details.subtipoCaso} />
                    <InfoRow label="Jurisdicción aplicable" value={details.jurisdiccionCaso} />
                    <InfoRow label="Probabilidad de éxito" value={details.probabilidadExito} />
                    <InfoRow label="Complejidad" value={details.complejidadCaso} />
                    <InfoRow label="Monto estimado" value={details.montoEstimado} />
                </Section>
            )}

            {/* 6. Documentación */}
            {docs.length > 0 && (
                <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-background flex items-center gap-2">
                        <FileText className="w-4 h-4 text-link" />
                        <h3 className="text-base font-semibold text-foreground">Documentación presentada</h3>
                    </div>
                    <div className="p-6 flex flex-wrap gap-2">
                        {docs.map(doc => (
                            <span key={doc} className="px-3 py-1 bg-green-50 text-status-green border border-green-200 rounded-full text-xs font-medium">
                                ✓ {doc}
                            </span>
                        ))}
                    </div>
                </Card>
            )}

            {/* 13. Administrativo */}
            {(details.modalidadHonorarios || details.montoHonorarios) && (
                <Section icon={DollarSign} title="Administrativo">
                    <InfoRow label="Modalidad honorarios" value={details.modalidadHonorarios} />
                    <InfoRow label="Monto pactado" value={details.montoHonorarios} />
                    <InfoRow label="Forma de pago" value={details.formaPago} />
                    <InfoRow label="% de éxito pactado" value={details.porcentajeExito} />
                    <InfoRow label="Anticipo recibido" value={details.anticipoRecibido} />
                    <InfoRow label="Carta de encargo / Poder" value={details.cartaEncargo} />
                    <InfoRow label="Responsable admin." value={details.responsableAdmin} />
                    <div className="col-span-full">
                        <InfoRow label="Notas administrativas" value={details.notasAdmin} />
                    </div>
                </Section>
            )}

            {/* Application Skills Panels */}
            <Card className="bg-card border border-border rounded-xl p-5">
                <InfoRow label="Abogado responsable" value={caseItem.assignedLawyer?.name || (Object.prototype.hasOwnProperty.call(details, 'assignedLawyerId') ? 'Sin asignar' : details.abogadoAsignado || 'Sin asignar')} />
            </Card>
            <TaskPanel caseItem={caseItem} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <DeadlinePanel caseId={caseItem.id} prescriptionDate={details.fechaPrescripcion} canConfirmPrescription={canConfirmPrescription} />
                </div>
                <div>
                    <ExpensePanel caseId={caseItem.id} onReceiptSaved={file => setCaseItem(current => current?.id === file.caseId
                        ? { ...current, files: [...(current.files || []).filter(item => item.id !== file.id), file] } : current)} />
                </div>
            </div>

            <FollowUpPanel caseItem={caseItem} onChanged={() => setSummaryVersion(value => value + 1)} />
            <CaseFilePanel
                caseId={caseItem.id}
                studioId={caseItem.studioId}
                initialFiles={caseItem.files}
                onFilesChange={files => setCaseItem(current => ({ ...current, files }))}
            />

            <FeePanel caseId={caseItem.id} onChanged={() => setSummaryVersion(value => value + 1)} onReceiptSaved={file => setCaseItem(current => current?.id === file.caseId
                ? { ...current, files: [...(current.files || []).filter(item => item.id !== file.id), file] } : current)} />
            <WrittenDocumentsPanel caseId={caseItem.id} />
            <JurisprudencePanel caseId={caseItem.id} caseFuero={caseItem.fuero || details.fuero} />

            {/* Metadata */}
            <div className="text-xs text-muted-foreground text-right">
                <span>Creado: {new Date(caseItem.createdAt).toLocaleString('es-AR')}</span>
                {caseItem.createdBy && <span className="ml-3">por {caseItem.createdBy.name || caseItem.createdBy.email}</span>}
                {caseItem.updatedAt !== caseItem.createdAt && <span className="ml-3">· Última actualización: {new Date(caseItem.updatedAt).toLocaleString('es-AR')}</span>}
            </div>
        </div>
    );
};

export default ViewCase;

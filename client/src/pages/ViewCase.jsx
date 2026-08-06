import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Edit, ArrowLeft, CalendarDays, Scale, User, Briefcase, FileText, BarChart2, Clock, Download, Heart, Target, DollarSign, GraduationCap } from 'lucide-react';
import { api } from '../config/api';
import { DeadlinePanel } from '../components/DeadlinePanel';
import { ExpensePanel } from '../components/ExpensePanel';
import { CaseFilePanel } from '../components/CaseFilePanel';
import { JurisprudencePanel } from '../components/JurisprudencePanel';

const STATUS_LABELS = {
    OPEN: 'Abierto', CLOSED: 'Cerrado', IN_REVIEW: 'En Revisión',
    PENDING: 'Pendiente', REJECTED: 'Rechazado',
};
const STATUS_COLORS = {
    OPEN: 'bg-green-100 text-green-800', CLOSED: 'bg-gray-100 text-gray-700',
    IN_REVIEW: 'bg-blue-100 text-blue-800', PENDING: 'bg-yellow-100 text-yellow-800',
    REJECTED: 'bg-red-100 text-red-800',
};

const InfoRow = ({ label, value }) => {
    if (!value && value !== 0) return null;
    return (
        <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{value}</dd>
        </div>
    );
};

const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
        <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {children}
        </dl>
    </div>
);

const ScorePanel = ({ score }) => {
    if (!score) return null;
    const isIdeal = score <= 14;
    const isWarn = score <= 24;
    const label = isIdeal ? 'Admisión Ideal' : isWarn ? 'Evaluar con Cautela' : 'Recomendar Rechazo';
    const color = isIdeal ? 'text-green-400' : isWarn ? 'text-yellow-400' : 'text-red-400';
    const bg = isIdeal ? 'bg-green-500/20' : isWarn ? 'bg-yellow-500/20' : 'bg-red-500/20';
    return (
        <div className="p-6 bg-slate-900 rounded-xl text-white flex items-center justify-between">
            <div>
                <h4 className="text-base font-bold">Score de Admisión</h4>
                <p className="text-slate-400 text-sm">Resultado del análisis de admisión (10 indicadores)</p>
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

const FodaPanel = ({ details }) => {
    const items = [
        { key: 'fodaFortalezas', label: 'Fortalezas', color: 'border-green-200 bg-green-50', titleColor: 'text-green-800', badge: 'bg-green-600' },
        { key: 'fodaOportunidades', label: 'Oportunidades', color: 'border-blue-200 bg-blue-50', titleColor: 'text-blue-800', badge: 'bg-blue-600' },
        { key: 'fodaDebilidades', label: 'Debilidades', color: 'border-yellow-200 bg-yellow-50', titleColor: 'text-yellow-800', badge: 'bg-yellow-600' },
        { key: 'fodaAmenazas', label: 'Amenazas', color: 'border-red-200 bg-red-50', titleColor: 'text-red-800', badge: 'bg-red-600' },
    ];
    if (!items.some(i => details[i.key])) return null;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold text-gray-900">Análisis FODA</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(item => details[item.key] && (
                    <div key={item.key} className={`border rounded-xl p-4 ${item.color}`}>
                        <h4 className={`font-bold mb-2 flex items-center gap-2 text-sm ${item.titleColor}`}>
                            <span className={`w-5 h-5 ${item.badge} text-white rounded text-xs flex items-center justify-center font-bold`}>
                                {item.label.charAt(0)}
                            </span>
                            {item.label}
                        </h4>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{details[item.key]}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ViewCase = () => {
    const { id } = useParams();
    const [caseItem, setCaseItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCase = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(api.cases.get(id), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCaseItem(data);
            } catch (err) {
                setError('Error al cargar el caso');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCase();
    }, [id]);

    const handleGenerateDocument = async () => {
        try {
            const token = localStorage.getItem('token');
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


    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    if (error) return <div className="text-red-500 p-4">{error}</div>;
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
                    <Link to="/cases" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{caseItem.clientName || caseItem.title}</h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-sm text-gray-400">{caseItem.caseNumber}</span>
                            {caseItem.fuero && <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">{caseItem.fuero}</span>}
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[caseItem.status] || 'bg-gray-100 text-gray-700'}`}>
                                {STATUS_LABELS[caseItem.status] || caseItem.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleGenerateDocument} className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                        <Download className="-ml-1 mr-2 h-4 w-4" />
                        Generar Cédula
                    </button>
                    <Link to={`/cases/${id}/edit`} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Edit className="-ml-1 mr-2 h-4 w-4" />
                        Editar
                    </Link>
                </div>
            </div>

            {/* Score Banner */}
            {caseItem.score > 0 && <ScorePanel score={caseItem.score} />}

            {/* 1. Datos del Consultante */}
            <Section icon={User} title="Datos del Consultante">
                <InfoRow label="Cliente" value={caseItem.clientName} />
                <InfoRow label="DNI / CUIT" value={details.dni} />
                <InfoRow label="Fecha de nacimiento" value={details.birthDate ? new Date(details.birthDate).toLocaleDateString('es-AR') : null} />
                <InfoRow label="Email" value={details.email} />
                <InfoRow label="Teléfono" value={details.phone} />
                <InfoRow label="Domicilio" value={details.address} />
                <InfoRow label="Estado civil" value={details.estadoCivil} />
                <InfoRow label="Hijos a cargo" value={details.hijosACargo} />
                <InfoRow label="Canal de consulta" value={details.canalConsulta} />
            </Section>

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
            {(details.nivelUrgencia || details.fechaPrescripcion || details.proximaAudiencia) && (
                <Section icon={Clock} title="Plazos y Urgencias">
                    <InfoRow label="Nivel de urgencia" value={details.nivelUrgencia} />
                    <InfoRow label="Motivo de urgencia" value={details.motivoUrgencia} />
                    <InfoRow label="Prescripción estimada" value={details.fechaPrescripcion ? new Date(details.fechaPrescripcion).toLocaleDateString('es-AR') : null} />
                    <InfoRow label="Próxima audiencia" value={details.proximaAudiencia ? new Date(details.proximaAudiencia).toLocaleDateString('es-AR') : null} />
                    <InfoRow label="Inicio del hecho" value={details.fechaHecho ? new Date(details.fechaHecho).toLocaleDateString('es-AR') : null} />
                    <InfoRow label="Plazo de contestación" value={details.plazoContestacion ? new Date(details.plazoContestacion).toLocaleDateString('es-AR') : null} />
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="text-base font-semibold text-gray-900">Documentación presentada</h3>
                    </div>
                    <div className="p-6 flex flex-wrap gap-2">
                        {docs.map(doc => (
                            <span key={doc} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                                ✓ {doc}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 8. Análisis Psicológico */}
            {(details.estadoEmocional || details.nivelEstres || details.motivacionCliente) && (
                <Section icon={Heart} title="Análisis Psicológico del Consultante">
                    <InfoRow label="Estado emocional" value={details.estadoEmocional} />
                    <InfoRow label="Nivel de estrés" value={details.nivelEstres} />
                    <InfoRow label="Motivación principal" value={details.motivacionCliente} />
                    <InfoRow label="Red de apoyo" value={details.redDeApoyo} />
                    <div className="col-span-full">
                        <InfoRow label="Observaciones del entrevistador" value={details.observacionesPsico} />
                    </div>
                </Section>
            )}

            {/* 9. Expectativas del Cliente */}
            {(details.resultadoEsperado || details.plazoEsperado || details.disposicionNegociar) && (
                <Section icon={Target} title="Expectativas del Cliente">
                    <div className="col-span-full">
                        <InfoRow label="Resultado esperado" value={details.resultadoEsperado} />
                    </div>
                    <InfoRow label="Plazo esperado" value={details.plazoEsperado} />
                    <InfoRow label="Disposición a negociar" value={details.disposicionNegociar} />
                    <InfoRow label="Expectativa económica" value={details.expectativaEconomica} />
                    <div className="col-span-full">
                        <InfoRow label="Observaciones" value={details.notasExpectativas} />
                    </div>
                </Section>
            )}

            {/* 10. Evaluación Jurídica */}
            {(details.viabilidadJuridica || details.estrategiaRecomendada || details.decisionAdmision) && (
                <Section icon={Briefcase} title="Evaluación Jurídica LyP">
                    <InfoRow label="Viabilidad" value={details.viabilidadJuridica} />
                    <InfoRow label="Estrategia" value={details.estrategiaRecomendada} />
                    <InfoRow label="Decisión de admisión" value={details.decisionAdmision} />
                    <InfoRow label="Probabilidad de éxito (LyP)" value={details.probabilidadExitoLyP} />
                    <InfoRow label="Complejidad percibida" value={details.complejidadLyP} />
                    <div className="col-span-full">
                        <InfoRow label="Detalle de estrategia" value={details.estrategiaDetalle} />
                    </div>
                </Section>
            )}

            {/* 11. FODA */}
            <FodaPanel details={details} />

            {/* 12. Línea de Tiempo */}
            {hitosFecha.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <h3 className="text-base font-semibold text-gray-900">Línea de Tiempo</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {hitosFecha.map((hito, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                                    {i < hitosFecha.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1 flex-1 min-h-[20px]"></div>}
                                </div>
                                <div className="pb-4">
                                    {hito.fecha && <p className="text-xs text-gray-400 font-medium mb-1">{new Date(hito.fecha).toLocaleDateString('es-AR')}</p>}
                                    <p className="text-sm text-gray-800">{hito.desc || '—'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <DeadlinePanel caseId={caseItem.id} />
                </div>
                <div>
                    <ExpensePanel caseId={caseItem.id} studioId={caseItem.studioId} />
                </div>
            </div>
            
            <CaseFilePanel 
                caseId={caseItem.id} 
                studioId={caseItem.studioId} 
                initialFiles={caseItem.files} 
            />

            <JurisprudencePanel caseId={caseItem.id} caseFuero={caseItem.fuero || details.fuero} />

            {/* Metadata */}
            <div className="text-xs text-gray-400 text-right">
                <span>Creado: {new Date(caseItem.createdAt).toLocaleString('es-AR')}</span>
                {caseItem.createdBy && <span className="ml-3">por {caseItem.createdBy.name || caseItem.createdBy.email}</span>}
                {caseItem.updatedAt !== caseItem.createdAt && <span className="ml-3">· Última actualización: {new Date(caseItem.updatedAt).toLocaleString('es-AR')}</span>}
            </div>
        </div>
    );
};

export default ViewCase;

import { Button } from './ui/button';
import React from 'react';
import { useCaseConfig } from '../context/CaseConfigContext';
import { Scale, Briefcase, Gavel, Users, FileText, Calendar, Clock, ChevronRight } from 'lucide-react';

const ICON_MAP = {
  Scale: <Scale size={16} />,
  Briefcase: <Briefcase size={16} />,
  Gavel: <Gavel size={16} />,
  Users: <Users size={16} />,
  FileText: <FileText size={16} />
};

export const CaseCardExample = ({
  title = "Pérez c/ Gómez s/ Daños y Perjuicios",
  fueroId = "f1",
  tipoJuicioId = "tj1",
  etapaId = "ep2",
  fechaInicio = "12/05/2023",
  diasActivo = 45
}) => {
  const { config } = useCaseConfig();

  // Buscar datos configurados
  const fuero = config.fueros.find(f => f.id === fueroId) || { name: 'Desconocido', color: 'bg-muted-foreground', icon: 'FileText' };
  const tipoJuicio = config.tiposJuicio.find(t => t.id === tipoJuicioId) || { name: 'Desconocido' };
  const etapa = config.etapasProcesales.find(e => e.id === etapaId) || { name: 'Desconocida', color: 'bg-muted-foreground' };

  return (
    <div className="bg-card border border-border hover:border-border rounded-xl p-5 shadow-lg transition-all duration-300 group hover:shadow-xl hover:-translate-y-1">
      {/* Cabecera */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-foreground ${fuero.color} shadow-lg shadow-black/20`}>
            {ICON_MAP[fuero.icon] || <FileText size={18} />}
          </div>
          <div>
            <span className={`text-[10px] font-bold tracking-wider uppercase bg-card text-muted-foreground px-2 py-0.5 rounded-full mb-1 inline-block`}>
              {fuero.name}
            </span>
            <h3 className="text-foreground font-semibold text-lg leading-tight line-clamp-1">{title}</h3>
          </div>
        </div>
        <Button variant="legacy" size="legacy" className="text-muted-foreground hover:text-foreground transition-colors bg-card hover:bg-card p-2 rounded-lg opacity-0 group-hover:opacity-100">
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Detalles del Caso */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-card rounded-lg p-3 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">Tipo de Juicio</p>
          <p className="text-sm text-muted-foreground font-medium">{tipoJuicio.name}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/30 relative overflow-hidden">
          {/* Indicador de color de la etapa */}
          <div className={`absolute top-0 left-0 w-1 h-full ${etapa.color}`}></div>
          <p className="text-xs text-muted-foreground mb-1 ml-2">Etapa Actual</p>
          <div className="flex items-center gap-2 ml-2">
            <div className={`w-2 h-2 rounded-full ${etapa.color} shadow-[0_0_8px_rgba(255,255,255,0.3)] animate-pulse`}></div>
            <p className="text-sm text-muted-foreground font-medium">{etapa.name}</p>
          </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="flex items-center justify-between pt-4 border-t border-border/80">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={14} className="text-muted-foreground" />
            <span>{fechaInicio}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={14} className="text-muted-foreground" />
            <span>{diasActivo} días activo</span>
          </div>
        </div>

        {/* Simulación de avatares de involucrados */}
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-border flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            AB
          </div>
          <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-border flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            CD
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { LegalTimeline } from '../components/LegalTimeline';
import { OverdueDeadlines } from '../components/OverdueDeadlines';
import { notifyActivityChanged } from '../utils/activityEvents';
import { AGENDA_ZONE } from '../utils/agendaDates';
import { Button } from '../components/ui/button';
import { TaskPanel } from '../components/TaskPanel';
import { FollowUpPanel } from '../components/FollowUpPanel';
import { FeePanel } from '../components/FeePanel';

const MyDay = () => (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight">Mi jornada</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Vencimientos que requieren tu atención — {new Date().toLocaleDateString('es-AR', { timeZone: AGENDA_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <Button variant="legacy" size="legacy"
                    onClick={notifyActivityChanged}
                    className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-background transition-colors shadow-sm"
                >
                    <RefreshCw size={14} />
                    Actualizar
                </Button>
            </div>

            <OverdueDeadlines />
            <LegalTimeline />
            <div className="mb-8"><TaskPanel inbox /></div>
            <div className="mb-8"><FollowUpPanel inbox /></div>
            <FeePanel inbox />
        </div>
);

export default MyDay;

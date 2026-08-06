import React, { useState } from 'react';
import { useCaseConfig } from '../context/CaseConfigContext';
import { 
  Settings, Plus, Trash2, Edit2, Check, X, 
  Scale, Briefcase, Gavel, Users, FileText, ChevronRight
} from 'lucide-react';

const ICON_MAP = {
  Scale: <Scale size={18} />,
  Briefcase: <Briefcase size={18} />,
  Gavel: <Gavel size={18} />,
  Users: <Users size={18} />,
  FileText: <FileText size={18} />
};

const COLOR_OPTIONS = [
  { name: 'Blue', value: 'bg-blue-600' },
  { name: 'Indigo', value: 'bg-indigo-600' },
  { name: 'Purple', value: 'bg-purple-600' },
  { name: 'Pink', value: 'bg-pink-600' },
  { name: 'Red', value: 'bg-red-600' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Green', value: 'bg-emerald-600' },
  { name: 'Teal', value: 'bg-teal-600' },
  { name: 'Cyan', value: 'bg-cyan-600' },
  { name: 'Slate', value: 'bg-slate-600' }
];

export const CaseConfigPanel = () => {
  const { config, addCategoryItem, updateCategoryItem, deleteCategoryItem } = useCaseConfig();
  const [activeTab, setActiveTab] = useState('fueros');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const TABS = [
    { id: 'fueros', label: 'Fueros' },
    { id: 'tiposJuicio', label: 'Tipos de Juicio' },
    { id: 'etapasProcesales', label: 'Etapas Procesales' },
    { id: 'tiposDocumento', label: 'Tipos de Documentos' },
    { id: 'tiposHonorarios', label: 'Tipos de Honorarios' }
  ];

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = () => {
    if (editingId) {
      updateCategoryItem(activeTab, editingId, editForm);
    } else {
      addCategoryItem(activeTab, editForm);
    }
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  const handleDelete = (id) => {
    deleteCategoryItem(activeTab, id);
    setDeleteConfirmId(null);
  };

  const currentItems = config[activeTab] || [];

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full text-slate-200">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Configuración de Casos</h2>
            <p className="text-sm text-slate-400 mt-1">Administra los parámetros globales del sistema jurídico</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-64 border-r border-slate-800 p-4 bg-slate-900/30 overflow-y-auto">
          <div className="space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setEditingId(null);
                  setIsAdding(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                  activeTab === tab.id 
                    ? 'bg-indigo-600/10 text-indigo-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <ChevronRight size={16} className="text-indigo-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">
              {TABS.find(t => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setEditForm({ name: '', color: 'bg-blue-600', icon: 'Scale' });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus size={16} />
              Añadir Nuevo
            </button>
          </div>

          <div className="space-y-3">
            {isAdding && (
              <div className="bg-slate-800 rounded-lg p-4 border border-indigo-500/50 shadow-lg mb-4 animate-in fade-in slide-in-from-top-4">
                <ItemForm 
                  form={editForm} 
                  setForm={setEditForm} 
                  onSave={handleSaveEdit} 
                  onCancel={() => setIsAdding(false)} 
                  activeTab={activeTab}
                  config={config}
                />
              </div>
            )}

            {currentItems.map(item => (
              <div 
                key={item.id} 
                className={`bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 transition-all duration-200 ${
                  editingId === item.id ? 'ring-1 ring-indigo-500 bg-slate-800' : 'hover:border-slate-600'
                }`}
              >
                {editingId === item.id ? (
                  <ItemForm 
                    form={editForm} 
                    setForm={setEditForm} 
                    onSave={handleSaveEdit} 
                    onCancel={() => setEditingId(null)} 
                    activeTab={activeTab}
                    config={config}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {item.color && (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${item.color} shadow-lg`}>
                          {ICON_MAP[item.icon] || <FileText size={18} />}
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium text-slate-200">{item.name}</h4>
                        {activeTab === 'tiposJuicio' && item.fueroId && (
                          <span className="text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md mt-1 inline-block">
                            Fuero: {config.fueros.find(f => f.id === item.fueroId)?.name || 'Desconocido'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {deleteConfirmId === item.id ? (
                        <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1 rounded-lg border border-red-500/20">
                          <span className="text-xs font-medium mr-2">¿Seguro?</span>
                          <button onClick={() => handleDelete(item.id)} className="hover:text-red-300">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)} className="hover:text-slate-300 text-slate-400">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {currentItems.length === 0 && !isAdding && (
              <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700/50 border-dashed">
                <Settings className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-medium text-slate-400">No hay elementos configurados</h3>
                <p className="text-xs text-slate-500 mt-1">Añade uno nuevo para comenzar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Subcomponente para el formulario de edición/creación
const ItemForm = ({ form, setForm, onSave, onCancel, activeTab, config }) => {
  const needsColor = ['fueros', 'etapasProcesales'].includes(activeTab);
  const needsIcon = ['fueros'].includes(activeTab);
  const needsFuero = activeTab === 'tiposJuicio';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Nombre</label>
          <input 
            type="text" 
            value={form.name || ''} 
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Ej. Daños y Perjuicios"
            autoFocus
          />
        </div>

        {needsFuero && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Fuero Relacionado</label>
            <select
              value={form.fueroId || ''}
              onChange={e => setForm({...form, fueroId: e.target.value})}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="" disabled>Selecciona un fuero</option>
              {config.fueros.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {needsColor && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2">Color Distintivo</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setForm({...form, color: color.value})}
                  className={`w-8 h-8 rounded-full ${color.value} flex items-center justify-center transition-transform hover:scale-110 ${
                    form.color === color.value ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {needsIcon && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-2">Icono</label>
            <div className="flex gap-2">
              {Object.keys(ICON_MAP).map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setForm({...form, icon: iconName})}
                  className={`p-2 rounded-lg border transition-colors ${
                    form.icon === iconName 
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' 
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {ICON_MAP[iconName]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
        <button 
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button 
          onClick={onSave}
          disabled={!form.name}
          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
        >
          <Check size={16} />
          Guardar
        </button>
      </div>
    </div>
  );
};

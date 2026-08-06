import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultState = {
  fueros: [
    { id: 'f1', name: 'Civil y Comercial', color: 'bg-blue-600', icon: 'Scale' },
    { id: 'f2', name: 'Laboral', color: 'bg-orange-500', icon: 'Briefcase' },
    { id: 'f3', name: 'Penal', color: 'bg-red-600', icon: 'Gavel' },
    { id: 'f4', name: 'Familia', color: 'bg-pink-500', icon: 'Users' }
  ],
  tiposJuicio: [
    { id: 'tj1', fueroId: 'f1', name: 'Daños y Perjuicios' },
    { id: 'tj2', fueroId: 'f1', name: 'Sucesión' },
    { id: 'tj3', fueroId: 'f2', name: 'Despido' },
    { id: 'tj4', fueroId: 'f4', name: 'Divorcio' }
  ],
  etapasProcesales: [
    { id: 'ep1', name: 'Mediación Previa', color: 'bg-yellow-500' },
    { id: 'ep2', name: 'Demanda', color: 'bg-blue-500' },
    { id: 'ep3', name: 'Prueba', color: 'bg-indigo-500' },
    { id: 'ep4', name: 'Alegatos', color: 'bg-purple-500' },
    { id: 'ep5', name: 'Sentencia', color: 'bg-emerald-600' },
    { id: 'ep6', name: 'Apelación', color: 'bg-red-500' }
  ],
  tiposDocumento: [
    { id: 'td1', name: 'Demanda' },
    { id: 'td2', name: 'Contestación' },
    { id: 'td3', name: 'Oficio' },
    { id: 'td4', name: 'Cédula' },
    { id: 'td5', name: 'Escrito de Mero Trámite' }
  ],
  tiposHonorarios: [
    { id: 'th1', name: 'Pacto de Cuota Litis' },
    { id: 'th2', name: 'Abono Mensual' },
    { id: 'th3', name: 'Honorarios Regulados' },
    { id: 'th4', name: 'Monto Fijo' }
  ]
};

const CaseConfigContext = createContext();

export const CaseConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('lyp_case_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved config', e);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('lyp_case_config', JSON.stringify(config));
  }, [config]);

  const addCategoryItem = (category, item) => {
    setConfig(prev => ({
      ...prev,
      [category]: [...prev[category], { ...item, id: `${category}_${Date.now()}` }]
    }));
  };

  const updateCategoryItem = (category, id, updatedData) => {
    setConfig(prev => ({
      ...prev,
      [category]: prev[category].map(item => item.id === id ? { ...item, ...updatedData } : item)
    }));
  };

  const deleteCategoryItem = (category, id) => {
    setConfig(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.id !== id)
    }));
  };

  const resetToDefault = () => setConfig(defaultState);

  return (
    <CaseConfigContext.Provider value={{
      config,
      addCategoryItem,
      updateCategoryItem,
      deleteCategoryItem,
      resetToDefault
    }}>
      {children}
    </CaseConfigContext.Provider>
  );
};

export const useCaseConfig = () => useContext(CaseConfigContext);

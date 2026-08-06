import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { BookOpen, Search, Sparkles, KeyRound } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const JurisprudencePanel = ({ caseId, caseFuero }) => {
    const [query, setQuery] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showKeyInput, setShowKeyInput] = useState(false);

    // Cargar apiKey guardada localmente para no pedirla siempre
    useEffect(() => {
        const savedKey = localStorage.getItem('lyp_openai_key');
        if (savedKey) {
            setApiKey(savedKey);
        } else {
            setShowKeyInput(true);
        }
    }, []);

    const handleSaveKey = () => {
        localStorage.setItem('lyp_openai_key', apiKey);
        setShowKeyInput(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query || query.length < 3) return;
        if (!apiKey) {
            setError('Debes configurar tu API Key de Copilot/OpenAI para usar la IA Legal.');
            setShowKeyInput(true);
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(api.jurisprudence.search, {
                q: query,
                fuero: caseFuero || 'Civil',
                apiKey: apiKey
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (data.success) {
                setResults(data.results);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error fetching jurisprudence', err);
            setError(err.response?.data?.message || 'Fallo de conexión al consultar la IA Legal.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-semibold text-gray-900">Asistente IA Jurisprudencial (SAIJ)</h3>
                </div>
                <button 
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1"
                >
                    <KeyRound className="w-3 h-3" /> Configurar API
                </button>
            </div>
            <div className="p-6">
                {showKeyInput && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                        <label className="block font-medium text-gray-700 mb-2">Tu API Key de Copilot / OpenAI</label>
                        <div className="flex gap-2">
                            <input 
                                type="password" 
                                placeholder="sk-..." 
                                className="flex-1 border-gray-300 rounded-lg text-sm"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button onClick={handleSaveKey} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Guardar Localmente</button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">La llave solo se guarda en tu navegador y se envía directamente al servidor para consultar la IA.</p>
                    </div>
                )}

                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        placeholder="Ej: Daños punitivos por accidente de tránsito en Córdoba..." 
                        className="flex-1 border-gray-300 rounded-lg text-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                        <Search className="w-4 h-4"/> 
                        {loading ? 'Analizando con IA...' : 'Consultar IA'}
                    </button>
                </form>

                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm mb-4">{error}</div>}

                <div className="space-y-4">
                    {results.length === 0 && !loading && !error && (
                        <div className="text-center py-8">
                            <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Ingresá los detalles del caso para obtener una estrategia de búsqueda y fallos relevantes.</p>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="animate-pulse flex space-x-4 p-4 border border-indigo-100 rounded-lg bg-indigo-50/30">
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-indigo-100 rounded"></div>
                                    <div className="h-4 bg-indigo-100 rounded w-5/6"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {results.map((r, i) => (
                        <div key={i} className="p-5 border border-indigo-100 rounded-xl bg-white shadow-sm">
                            <h4 className="font-semibold text-lg text-indigo-900 mb-4 pb-2 border-b border-gray-100">
                                {r.titulo}
                            </h4>
                            <div className="prose prose-sm max-w-none prose-indigo">
                                <ReactMarkdown>{r.resumen_ai}</ReactMarkdown>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
                                <span>Basado en el Fuero {r.tribunal.split('-')[1]}</span>
                                <a href={r.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                                    Abrir SAIJ para consultar manualmente &rarr;
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

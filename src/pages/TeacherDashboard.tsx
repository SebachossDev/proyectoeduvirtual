import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, GraduationCap, FileText, CheckCircle, Activity, Upload, Trash2, Database } from 'lucide-react';

interface DocumentFile {
    id: string;
    title: string;
    course: string;
    size: string;
    date: string;
    status: 'ready' | 'processing';
}

export default function TeacherDashboard() {
    const navigate = useNavigate();
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial mock state matching the images
    const [documents, setDocuments] = useState<DocumentFile[]>([
        {
            id: '1',
            title: 'Teoría de Límites - Capítulo 1.pdf',
            course: 'Cálculo Monovariable',
            size: '2.4 MB',
            date: '28/2/2026',
            status: 'ready'
        },
        {
            id: '2',
            title: 'Funciones Avanzadas Excel.pdf',
            course: 'Excel II',
            size: '5.1 MB',
            date: '1/3/2026',
            status: 'ready'
        },
        {
            id: '3',
            title: 'POO - Introducción.pdf',
            course: 'Desarrollo II',
            size: '3.8 MB',
            date: '2/3/2026',
            status: 'processing'
        }
    ]);

    const handleLogout = () => {
        navigate('/login');
    };

    const handleDelete = (id: string) => {
        setDocuments(docs => docs.filter(d => d.id !== id));
    };

    const handleFileUpload = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newDocs: DocumentFile[] = Array.from(files).map((file, i) => {
            const newId = Date.now().toString() + i;
            return {
                id: newId,
                title: file.name,
                course: 'Curso General', // You can add logic to select course later
                size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                date: new Date().toLocaleDateString('es-ES'),
                status: 'processing'
            };
        });

        // Add to state
        setDocuments(prev => [...newDocs, ...prev]);

        // Simulate processing complete after 3 seconds
        newDocs.forEach(doc => {
            setTimeout(() => {
                setDocuments(prev => prev.map(d =>
                    d.id === doc.id ? { ...d, status: 'ready' } : d
                ));
            }, 3000 + Math.random() * 2000); // 3-5 seconds
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const totalDocumentos = documents.length;
    const listosParaIA = documents.filter(d => d.status === 'ready').length;
    const procesando = documents.filter(d => d.status === 'processing').length;

    return (
        <div className="min-h-screen bg-[#0d0d0f] text-zinc-200 flex font-sans overflow-hidden">
            {/* Minimalist Sidebar */}
            <div className="w-20 bg-[#161618] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg mb-4 text-sm">
                    I
                </div>

                <div className="relative">
                    <button className="w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-teal-500/20 text-teal-400">
                        <Database className="w-6 h-6" />
                    </button>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all font-light"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full">
                <main className="p-8 md:p-12 max-w-6xl mx-auto w-full">
                    {/* Header */}
                    <header className="mb-10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Panel Docente</h1>
                            <p className="text-zinc-400 font-light text-[13px]">Gestiona la documentación técnica que alimenta la IA de cada materia</p>
                        </div>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-6 flex items-center justify-between shadow-lg">
                            <div>
                                <p className="text-[13px] text-zinc-400 mb-1 font-medium">Total Documentos</p>
                                <p className="text-4xl font-bold text-white">{totalDocumentos}</p>
                            </div>
                            <FileText className="w-8 h-8 text-cyan-400" />
                        </div>

                        <div className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-6 flex items-center justify-between shadow-lg">
                            <div>
                                <p className="text-[13px] text-zinc-400 mb-1 font-medium">Listos para IA</p>
                                <p className="text-4xl font-bold text-green-400">{listosParaIA}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>

                        <div className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-6 flex items-center justify-between shadow-lg">
                            <div>
                                <p className="text-[13px] text-zinc-400 mb-1 font-medium">Procesando</p>
                                <p className="text-4xl font-bold text-cyan-400">{procesando}</p>
                            </div>
                            <Activity className="w-8 h-8 text-cyan-400" />
                        </div>
                    </div>

                    {/* Upload Zone */}
                    <div
                        className={`mb-12 border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all bg-[#141416]/50 ${isDragging ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-800/80 hover:border-zinc-700'
                            }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-white mb-6 shadow-xl shadow-purple-500/20">
                            <Upload className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Arrastra archivos aquí</h3>
                        <p className="text-zinc-400 text-sm mb-6">o haz clic para seleccionar documentación técnica</p>

                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={(e) => handleFileUpload(e.target.files)}
                            accept=".pdf,.doc,.docx,.txt"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gradient-to-r from-cyan-400 to-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:from-cyan-500 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25"
                        >
                            Seleccionar Archivos
                        </button>
                        <p className="text-[10px] text-zinc-600 mt-6 tracking-wider font-medium">FORMATOS SOPORTADOS: PDF, DOC, DOCX, TXT</p>
                    </div>

                    {/* Documents List */}
                    <div>
                        <h2 className="text-xl font-bold text-white mb-6">Documentos Cargados</h2>
                        <div className="space-y-4">

                            {documents.length === 0 ? (
                                <p className="text-zinc-500 text-center py-8">No hay documentos cargados aún.</p>
                            ) : documents.map((doc) => (
                                <div key={doc.id} className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center text-cyan-400 shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[15px] font-bold text-white truncate mb-1">{doc.title}</h4>
                                        <p className="text-[11px] text-zinc-500 font-medium">
                                            {doc.course} <span className="mx-1">•</span> {doc.size} <span className="mx-1">•</span> {doc.date}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {doc.status === 'ready' ? (
                                            <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium transition-all">
                                                <CheckCircle className="w-4 h-4" />
                                                Lista para IA
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-cyan-400 text-sm font-medium transition-all">
                                                <Activity className="w-4 h-4 animate-pulse" />
                                                Procesando...
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="w-10 h-10 rounded-xl bg-zinc-800/50 hover:bg-red-500 text-zinc-500 hover:text-white flex items-center justify-center transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {/* Progress Bar showing processing state at bottom border of card */}
                                    {doc.status === 'processing' && (
                                        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-zinc-800">
                                            <div className="h-full w-2/3 bg-gradient-to-r from-cyan-400 to-purple-600 animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            ))}

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

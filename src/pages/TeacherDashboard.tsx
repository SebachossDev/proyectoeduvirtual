import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, GraduationCap, FileText, CheckCircle, Activity, Upload, Trash2, Database, Plus, X, ArrowLeft, Users, ChevronRight } from 'lucide-react';

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
    
    // User Context
    const [user, setUser] = useState<any>(null);
    const [view, setView] = useState<'courses' | 'detail'>('courses');
    
    const [detailTab, setDetailTab] = useState<'database' | 'students'>('database');
    const [courseStudents, setCourseStudents] = useState<any[]>([]);
    
    // Courses State
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    
    // Course Detail State
    const [documents, setDocuments] = useState<DocumentFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    // Modals
    const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [newCourseName, setNewCourseName] = useState('');
    const [studentCode, setStudentCode] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        fetchCourses(parsed.id);
    }, [navigate]);

    const fetchCourses = async (teacherId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/courses?teacherId=${teacherId}`);
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error('Error fetching courses', error);
        }
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newCourseName,
                    description: 'Curso recién creado',
                    teacherId: user.id
                })
            });
            if (res.ok) {
                const createdCourse = await res.json();
                // We need at least one session for resources
                await fetch('http://localhost:3000/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'General',
                        courseId: createdCourse.id,
                        order: 1
                    })
                });

                await fetchCourses(user.id);
                setIsCreateCourseModalOpen(false);
                setNewCourseName('');
            }
        } catch (error) {
            alert('Error al crear curso');
        } finally {
            setLoading(false);
        }
    };

    const loadCourseDetails = async (course: any) => {
        setSelectedCourse(course);
        setView('detail');
        setDetailTab('database');

        fetchCourseStudents(course.id);

        // Extract resources from course sessions
        let loadedDocs: DocumentFile[] = [];
        if (course.sessions) {
            course.sessions.forEach((session: any) => {
                session.resources.forEach((res: any) => {
                    loadedDocs.push({
                        id: res.id,
                        title: res.title,
                        course: course.title,
                        size: 'Desconocido', // Since it's mockup URLs
                        date: new Date(res.createdAt).toLocaleDateString('es-ES'),
                        status: 'ready'
                    });
                });
            });
        }
        setDocuments(loadedDocs);
    };

    const fetchCourseStudents = async (courseId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/courses/${courseId}/participants`);
            if (res.ok) {
                const data = await res.json();
                setCourseStudents(data);
            }
        } catch (error) {
            console.error('Error fetching students', error);
        }
    };

    const handleRemoveStudent = async (enrollmentId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar a este estudiante del curso?')) return;
        try {
            const res = await fetch(`http://localhost:3000/api/enrollments/${enrollmentId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setCourseStudents(prev => prev.filter(e => e.id !== enrollmentId));
            } else {
                alert('No se pudo eliminar al estudiante');
            }
        } catch (error) {
            alert('Error al comunicar con el servidor');
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/api/courses/${selectedCourse.id}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: studentCode })
            });
            
            const data = await res.json();
            if (res.ok) {
                alert('Estudiante matriculado con éxito');
                setIsAddStudentModalOpen(false);
                setStudentCode('');
                fetchCourseStudents(selectedCourse.id);
            } else {
                alert(data.error || 'No se pudo matricular al estudiante');
            }
        } catch (error) {
            alert('Error al comunicar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDocument = async (id: string, isProcessing: boolean) => {
        // Remove locally immediately for snappy UX
        setDocuments(docs => docs.filter(d => d.id !== id));
        
        if (!isProcessing) {
            await fetch(`http://localhost:3000/api/resources/${id}`, { method: 'DELETE' });
            // Optionally reload to sync
            fetchCourses(user.id); 
        }
    };

    const handleFileUploadMockup = async (files: FileList | null) => {
        if (!files || files.length === 0 || !selectedCourse) return;
        
        const fileArr = Array.from(files);
        
        // 1. Create Local Mock "Processing" States
        const newLocalDocs: DocumentFile[] = fileArr.map((file, i) => ({
            id: `temp-${Date.now()}-${i}`,
            title: file.name,
            course: selectedCourse.title,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            date: new Date().toLocaleDateString('es-ES'),
            status: 'processing'
        }));

        setDocuments(prev => [...newLocalDocs, ...prev]);

        // We assume the course has at least one session "General" from creation
        const targetSessionId = selectedCourse.sessions && selectedCourse.sessions.length > 0 
            ? selectedCourse.sessions[0].id 
            : null;

        if (!targetSessionId) {
            alert("El curso no tiene una sesión activa para guardar recursos.");
            return;
        }

        // 2. Process each file (Simulated processing delay, but real DB POST)
        for (let i = 0; i < fileArr.length; i++) {
            const file = fileArr[i];
            const tempId = newLocalDocs[i].id;
            
            // Artificial delay to show the beautiful "Procesando..." UI
            const delay = 2000 + Math.random() * 2000;
            
            setTimeout(async () => {
                try {
                    // REAL BACKEND CALL
                    const res = await fetch('http://localhost:3000/api/resources', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: file.name,
                            description: 'Documento técnico para IA',
                            url: `local://fake-url-${Date.now()}`,
                            type: 'PDF',
                            sessionId: targetSessionId
                        })
                    });
                    
                    if (res.ok) {
                        const createdResource = await res.json();
                        // Update state to Ready and replace temp ID with Real ID
                        setDocuments(prev => prev.map(d => 
                            d.id === tempId ? { 
                                ...d, 
                                id: createdResource.id, 
                                status: 'ready',
                                date: new Date(createdResource.createdAt).toLocaleDateString('es-ES')
                            } : d
                        ));
                    } else {
                        // Fail
                        setDocuments(prev => prev.filter(d => d.id !== tempId));
                        alert(`Error al procesar el archivo ${file.name}`);
                    }
                } catch (e) {
                    setDocuments(prev => prev.filter(d => d.id !== tempId));
                }
            }, delay);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const totalDocumentos = documents.length;
    const listosParaIA = documents.filter(d => d.status === 'ready').length;
    const procesando = documents.filter(d => d.status === 'processing').length;

    // ----- VIEW 1: COURSES GRID -----
    if (view === 'courses') {
        return (
            <div className="min-h-screen bg-[#0d0d0f] text-zinc-200 flex font-sans overflow-hidden">
                <div className="w-20 bg-[#161618] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center font-bold text-white shadow-lg mb-4 text-sm">
                        {user?.name?.charAt(0) || 'D'}
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

                <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full p-10 md:p-14">
                    <header className="mb-12 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Mis Cursos</h1>
                            <p className="text-zinc-400 font-light text-sm">Selecciona un curso para gestionar su material de IA.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateCourseModalOpen(true)}
                            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Crear Curso
                        </button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.length === 0 ? (
                            <div className="col-span-full text-center py-20 text-zinc-500 bg-[#141416] rounded-2xl border border-zinc-800/50 border-dashed">
                                Aún no tienes cursos creados. Crea uno para comenzar.
                            </div>
                        ) : (
                            courses.map(course => (
                                <motion.div
                                    key={course.id}
                                    whileHover={{ y: -4 }}
                                    onClick={() => loadCourseDetails(course)}
                                    className="bg-[#141416] border border-zinc-800/60 hover:border-purple-500/50 rounded-2xl p-6 cursor-pointer transition-colors group flex flex-col h-48 relative overflow-hidden"
                                >
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                                            <GraduationCap className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-1 truncate">{course.title}</h3>
                                        <p className="text-sm text-zinc-500 mt-auto flex items-center gap-2">
                                            Ingresar al panel <ChevronRight className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all text-purple-400" />
                                        </p>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500"></div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Modal Crear Curso */}
                <AnimatePresence>
                    {isCreateCourseModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white">Nuevo Curso</h3>
                                    <button onClick={() => setIsCreateCourseModalOpen(false)} className="text-zinc-500 hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handleCreateCourse}>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre del Curso</label>
                                        <input
                                            type="text"
                                            required
                                            value={newCourseName}
                                            onChange={e => setNewCourseName(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                                            placeholder="Ej. Cálculo Avanzado"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loading || !newCourseName.trim()}
                                        className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20"
                                    >
                                        {loading ? 'Creando...' : 'Crear Curso'}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ----- VIEW 2: COURSE DETAIL / PANEL DOCENTE -----
    return (
        <div className="min-h-screen bg-[#0d0d0f] text-zinc-200 flex font-sans overflow-hidden">
            {/* Minimalist Sidebar */}
            <div className="w-20 bg-[#161618] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center font-bold text-white shadow-lg mb-4 text-sm">
                    {user?.name?.charAt(0) || 'D'}
                </div>

                <div className="relative group">
                    <button 
                        onClick={() => {
                            setView('courses');
                            fetchCourses(user.id);
                        }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        title="Volver a Cursos"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    <button 
                        onClick={() => setDetailTab('database')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${detailTab === 'database' ? 'bg-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        title="Base de Datos"
                    >
                        <Database className="w-6 h-6" />
                    </button>
                    
                    <button 
                        onClick={() => setDetailTab('students')}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${detailTab === 'students' ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        title="Estudiantes"
                    >
                        <Users className="w-6 h-6" />
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
                    <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{selectedCourse?.title || 'Panel Docente'}</h1>
                                <p className="text-zinc-400 font-light text-[13px]">
                                    {detailTab === 'database' 
                                        ? 'Gestiona la documentación técnica que alimenta la IA de esta materia' 
                                        : 'Gestiona los estudiantes matriculados en esta materia'}
                                </p>
                            </div>
                        </div>
                        
                        {detailTab === 'students' && (
                            <button
                                onClick={() => setIsAddStudentModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir Estudiante
                            </button>
                        )}
                    </header>

                    {detailTab === 'database' ? (
                        <>

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
                        className={`mb-12 border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all bg-[#141416]/50 ${
                            isDragging ? 'border-purple-500 bg-purple-500/5' : 'border-zinc-800/80 hover:border-zinc-700'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleFileUploadMockup(e.dataTransfer.files);
                        }}
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
                            onChange={(e) => handleFileUploadMockup(e.target.files)}
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
                                <p className="text-zinc-500 text-center py-8">No hay documentos cargados aún en este curso.</p>
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
                                            onClick={() => handleDeleteDocument(doc.id, doc.status === 'processing')}
                                            className="w-10 h-10 rounded-xl bg-zinc-800/50 hover:bg-red-500 text-zinc-500 hover:text-white flex items-center justify-center transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {doc.status === 'processing' && (
                                        <div className="absolute bottom-0 left-0 h-[3px] w-full bg-zinc-800">
                                            <div className="h-full w-2/3 bg-gradient-to-r from-cyan-400 to-purple-600 animate-pulse"></div>
                                        </div>
                                    )}
                                </div>
                            ))}

                        </div>
                    </div>
                        </>
                    ) : (
                        <div className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-6 shadow-xl overflow-hidden mt-6">
                            <h2 className="text-xl font-bold text-white mb-6">Estudiantes Matriculados ({courseStudents.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800/60 text-zinc-400 text-sm">
                                            <th className="pb-3 px-4 font-medium">Nombre</th>
                                            <th className="pb-3 px-4 font-medium">Código</th>
                                            <th className="pb-3 px-4 font-medium">Último Acceso</th>
                                            <th className="pb-3 px-4 font-medium text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {courseStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="text-center py-12 text-zinc-500 bg-zinc-900/20 rounded-xl">
                                                    No hay estudiantes matriculados en este curso.
                                                </td>
                                            </tr>
                                        ) : (
                                            courseStudents.map((enrollment: any) => (
                                                <tr key={enrollment.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group">
                                                    <td className="py-4 px-4 font-medium text-white flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                                                            {enrollment.student?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        {enrollment.student?.name}
                                                    </td>
                                                    <td className="py-4 px-4 text-zinc-300">
                                                        <span className="bg-zinc-800/80 font-mono text-xs px-2.5 py-1 rounded-md border border-zinc-700/50">{enrollment.student?.code}</span>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-zinc-400">
                                                        {enrollment.lastAccessAt ? new Date(enrollment.lastAccessAt).toLocaleString('es-ES') : 'Nunca'}
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <button 
                                                            onClick={() => handleRemoveStudent(enrollment.id)}
                                                            className="p-2 bg-zinc-800/50 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-all"
                                                            title="Expulsar del curso"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal Añadir Estudiante */}
            <AnimatePresence>
                {isAddStudentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl p-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white">Añadir Estudiante</h3>
                                <button onClick={() => setIsAddStudentModalOpen(false)} className="text-zinc-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleAddStudent}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Código del Estudiante</label>
                                    <input
                                        type="text"
                                        required
                                        value={studentCode}
                                        onChange={e => setStudentCode(e.target.value.toUpperCase())}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-center tracking-widest text-lg transition-colors"
                                        placeholder="E1234"
                                    />
                                    <p className="text-xs text-zinc-500 mt-2 text-center">Asegúrate de que el código sea correcto</p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !studentCode.trim()}
                                    className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-cyan-500/20 flex justify-center items-center gap-2"
                                >
                                    <Users className="w-5 h-5" />
                                    {loading ? 'Matriculando...' : 'Matricular'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

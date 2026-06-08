import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { FilterState } from '@/types'
import LoginPage         from '@/pages/LoginPage'
import Sidebar           from '@/components/layout/Sidebar'
import Toolbar           from '@/components/layout/Toolbar'
import LeftPanel         from '@/components/layout/LeftPanel'
import CentrePanel       from '@/components/layout/CentrePanel'
import RightPanel        from '@/components/layout/RightPanel'
import NewTaskModal      from '@/components/ui/NewTaskModal'
import SetupPage         from '@/components/ui/SetupPage'
import NotesImportModal  from '@/components/ui/NotesImportModal'

const defaultFilters: FilterState = { view: 'kanban', category: 'all' }

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center"
         style={{ background: 'linear-gradient(165deg, #060B14, #0A0F1E, #0D1424)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg"
             style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4)',
                      boxShadow: '0 0 32px rgba(59,130,246,0.5)', color: '#fff' }}>AI</div>
        <div style={{ width: 32, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ height: '100%', borderRadius: 2, width: '60%',
                        background: 'linear-gradient(90deg,#3B82F6,#8B5CF6,#06B6D4)',
                        backgroundSize: '300% 100%', animation: 'auroraShift 1.5s linear infinite' }} />
        </div>
        <style>{`@keyframes auroraShift{0%{background-position:0% 0}100%{background-position:300% 0}}`}</style>
      </div>
    </div>
  )
}

function Dashboard() {
  const [filters, setFilters]           = useState<FilterState>(defaultFilters)
  const [selectedTaskId, setTaskId]     = useState<string | undefined>()
  const [showNewTask, setShowNewTask]   = useState(false)
  const [showSetup, setShowSetup]       = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [activeView, setActiveView]     = useState('tasks')

  const updateFilter = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    setFilters(prev => ({ ...prev, [key]: val }))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'transparent' }}>
      <Sidebar
        onNewTask={() => setShowNewTask(true)}
        onSetup={() => setShowSetup(true)}
        onImport={() => setShowImport(true)}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Toolbar filters={filters}
          onViewChange={v  => updateFilter('view', v)}
          onCategoryChange={c => updateFilter('category', c)} />
        <div className="flex flex-1 overflow-hidden min-h-0">
          <LeftPanel   filters={filters} selectedTaskId={selectedTaskId} onTaskSelect={setTaskId} onNewTask={() => setShowNewTask(true)} />
          <CentrePanel selectedTaskId={selectedTaskId} activeView={activeView} />
          <RightPanel  filters={filters} selectedTaskId={selectedTaskId} onTaskSelect={setTaskId} />
        </div>
      </div>

      {showNewTask  && <NewTaskModal      onClose={() => setShowNewTask(false)} />}
      {showSetup    && <SetupPage         onClose={() => setShowSetup(false)} />}
      {showImport   && <NotesImportModal  onClose={() => setShowImport(false)} />}
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <LoginPage />
  return <Dashboard />
}

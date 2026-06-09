import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { FilterState } from '@/types'
import LoginPage         from '@/pages/LoginPage'
import Toolbar           from '@/components/layout/Toolbar'
import NavRail           from '@/components/layout/NavRail'
import LeftPanel         from '@/components/layout/LeftPanel'
import CentrePanel       from '@/components/layout/CentrePanel'
import RightPanel        from '@/components/layout/RightPanel'
import NewTaskModal      from '@/components/ui/NewTaskModal'
import SetupPage         from '@/components/ui/SetupPage'
import NotesImportModal  from '@/components/ui/NotesImportModal'

const defaultFilters: FilterState = { view: 'kanban', category: 'all' }

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#1E3A8A' }}>
      <div className="flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg"
             style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>
          AI
        </div>
        <div style={{ width: 120, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.15)' }}>
          <div style={{
            height: '100%', borderRadius: 2, width: '60%',
            background: 'linear-gradient(90deg, #60A5FA, #ffffff, #93C5FD)',
            backgroundSize: '300% 100%', animation: 'auroraShift 1.2s linear infinite',
          }} />
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.06em' }}>
          TTD AI
        </span>
        <style>{`@keyframes auroraShift{0%{background-position:0% 0}100%{background-position:300% 0}}`}</style>
      </div>
    </div>
  )
}

function Dashboard() {
  const [filters, setFilters]         = useState<FilterState>(defaultFilters)
  const [selectedTaskId, setTaskId]   = useState<string | undefined>()
  const [showNewTask, setShowNewTask] = useState(false)
  const [showSetup, setShowSetup]     = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [activeNav,  setActiveNav]    = useState('board')

  const updateFilter = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    setFilters(prev => ({ ...prev, [key]: val }))

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      <Toolbar
        filters={filters}
        onViewChange={v  => updateFilter('view', v)}
        onCategoryChange={c => updateFilter('category', c)}
        onNewTask={() => setShowNewTask(true)}
        onSetup={() => setShowSetup(true)}
      />

      {/* 4-panel body: NavRail + Feed + Kanban + Summary */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <NavRail onSetup={() => setShowSetup(true)} activeNav={activeNav} onNavChange={setActiveNav} />
        <CentrePanel selectedTaskId={selectedTaskId} activeView={activeNav} />
        <LeftPanel
          filters={filters}
          selectedTaskId={selectedTaskId}
          onTaskSelect={setTaskId}
          onNewTask={() => setShowNewTask(true)}
          onImport={() => setShowImport(true)}
        />
        <RightPanel filters={filters} selectedTaskId={selectedTaskId} onTaskSelect={setTaskId} />
      </div>

      {showNewTask && <NewTaskModal     onClose={() => setShowNewTask(false)} />}
      {showSetup   && <SetupPage        onClose={() => setShowSetup(false)} />}
      {showImport  && <NotesImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user)   return <LoginPage />
  return <Dashboard />
}

import IntegrationFeed from '@/components/integration/integration_feed'
import ArchivePanel    from '@/components/ui/ArchivePanel'
import ReportsPanel    from '@/components/ui/ReportsPanel'
import ContactsPanel   from '@/components/ui/ContactsPanel'

interface Props { selectedTaskId?: string; activeView?: string }

export default function CentrePanel({ selectedTaskId, activeView }: Props) {
  function renderContent() {
    switch (activeView) {
      case 'archive':  return <ArchivePanel />
      case 'reports':  return <ReportsPanel />
      case 'contacts': return <ContactsPanel />
      default:         return <IntegrationFeed selectedTaskId={selectedTaskId} />
    }
  }

  return (
    <main style={{ background: '#FAFBFD', borderRight: '1px solid #E2E8F0', flex: 25, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {renderContent()}
    </main>
  )
}

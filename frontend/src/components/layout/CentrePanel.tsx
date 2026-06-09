import IntegrationFeed from '@/components/integration/integration_feed'
import ArchivePanel    from '@/components/ui/ArchivePanel'

interface Props { selectedTaskId?: string; activeView?: string }

export default function CentrePanel({ selectedTaskId, activeView }: Props) {
  return (
    <main style={{ background: '#FAFBFD', borderRight: '1px solid #E2E8F0', flex: 25, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {activeView === 'archive'
        ? <ArchivePanel />
        : <IntegrationFeed selectedTaskId={selectedTaskId} />
      }
    </main>
  )
}

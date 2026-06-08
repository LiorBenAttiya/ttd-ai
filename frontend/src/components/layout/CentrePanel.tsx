import IntegrationFeed from '@/components/integration/integration_feed'
import ArchivePanel    from '@/components/ui/ArchivePanel'

interface Props { selectedTaskId?: string; activeView?: string }

export default function CentrePanel({ selectedTaskId, activeView }: Props) {
  return (
    <main className="panel-centre panel-divider flex flex-col flex-1 overflow-hidden">
      {activeView === 'archive'
        ? <ArchivePanel />
        : <IntegrationFeed selectedTaskId={selectedTaskId} />
      }
    </main>
  )
}

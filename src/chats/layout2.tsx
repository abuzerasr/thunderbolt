import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenuButton, SidebarProvider } from '@/components/ui/sidebar'
import { useSideview } from '@/sideview/provider'
import { Sidebar } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ImperativePanelHandle } from 'react-resizable-panels'
import { Outlet } from 'react-router'
import ChatSidebar from './sidebar'
import { Sideview } from './sideview'

export default function Page() {
  const ref = useRef<ImperativePanelHandle>(null)
  const { sideviewId, setSideview } = useSideview()

  useEffect(() => {
    if (sideviewId) {
      ref.current?.expand()
    } else {
      ref.current?.collapse()
    }
  }, [sideviewId])

  return (
    <SidebarProvider>
      <ChatSidebar />
      <ResizablePanelGroup direction="horizontal" autoSaveId="sideview">
        <ResizablePanel>
          <Outlet />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel ref={ref} collapsible defaultSize={20} minSize={15} onCollapse={() => setSideview(null, null)}>
          <SidebarHeader>
            <SidebarGroup>
              <SidebarGroupContent className="flex justify-end w-full flex-1 items-center">
                <SidebarMenuButton onClick={() => ref?.current?.collapse()} className="w-fit pr-0 pl-0 aspect-square items-center justify-center cursor-pointer" tooltip="New Chat">
                  <Sidebar />
                </SidebarMenuButton>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarHeader>
          <SidebarContent className="w-full h-full overflow-scroll">
            <Sideview />
          </SidebarContent>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}

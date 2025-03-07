import { A } from '@solidjs/router'
import { ArrowLeft } from 'lucide-solid'
import { JSXElement } from 'solid-js'
import { Button } from './components/button'
import { Sidebar } from './components/sidebar'

export default function Settings({ children }: { children?: JSXElement }) {
  return (
    <>
      <Sidebar>
        <Button as={A} href="/" variant="outline">
          <ArrowLeft class="size-4" />
          Home
        </Button>
      </Sidebar>
      <div class="flex flex-col gap-4 p-4 w-full">{children}</div>
    </>
  )
}

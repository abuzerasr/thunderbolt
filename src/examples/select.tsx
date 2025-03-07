import { Select } from '@/components/select'
import { createSignal } from 'solid-js'

export default function SelectExample() {
  const [selectedValue, setSelectedValue] = createSignal<string | undefined>(undefined)

  return (
    <>
      <Select
        value={selectedValue()}
        onChange={setSelectedValue}
        variant="default"
        options={[
          { value: 'react', label: 'React' },
          { value: 'solid', label: 'Solid' },
          { value: 'vue', label: 'Vue' },
        ]}
      />
    </>
  )
}

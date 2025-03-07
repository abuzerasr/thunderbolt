import { Field as ArkField } from '@ark-ui/solid'
import { createForm, required } from '@modular-forms/solid'

import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { Input } from '@/components/input'
import { createResource, createSignal, Show, Suspense } from 'solid-js'

type AccountForm = {
  hostname: string
  port: number
  username: string
  password: string
}

export default function AccountsSettings() {
  const [formValues, setFormValues] = createSignal<AccountForm>()

  const [formStore, { Form, Field }] = createForm<AccountForm>({
    initialValues: {
      hostname: '127.0.0.1',
      port: 3000,
      username: 'admin',
      password: 'admin',
    },
  })

  const [data] = createResource(formValues, async (formValues: AccountForm) => {
    // Simulate a network request with a delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log('setting data', formValues)

    return { success: true, message: 'Data loaded after 5 second delay' }
  })

  return (
    <>
      <div class="flex flex-col gap-4 p-4 max-w-[800px]">
        <Card>
          <CardContent>
            <Suspense fallback={<div>Loading...</div>}>
              <Show when={data.loading}>
                <p>Loading...</p>
              </Show>
            </Suspense>
            <Form
              onSubmit={(e) => {
                console.log('eee', e)
                setFormValues(e)
              }}
              class="flex flex-col gap-4"
            >
              <Field name="hostname" validate={[required('Hostname is required.')]}>
                {(field, props) => {
                  console.log(props, field)
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Hostname</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {/* <ArkField.HelperText>Some additional Info</ArkField.HelperText> */}
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>
              <Field type="number" name="port" validate={[required('Port is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Port</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Field name="username" validate={[required('Username is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Username</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Field name="password" validate={[required('Password is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Password</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Button type="submit">Save</Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

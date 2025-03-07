import { Route, Router } from '@solidjs/router'
import { render } from 'solid-js/web'
import Home from './home'
import Layout from './layout'
import NotFound from './not-found'
import Settings from './settings'
import AccountsSettings from './settings/accounts'

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/settings" component={Settings}>
        <Route path="/accounts" component={AccountsSettings} />
      </Route>
      <Route path="*404" component={NotFound} />
    </Router>
  ),
  document.getElementById('root') as HTMLElement
)

import { useState } from 'react'
import { MobilePreview } from './components/MobilePreview'
import type { Platform } from './components/MobilePreview'
import './preview.css'

// The design workspace around the phone. Nothing here is part of the app itself.
function App() {
  const [platform, setPlatform] = useState<Platform>('ios')
  const [dark, setDark] = useState(false)

  return (
    <main className="design-workspace">
      <header className="preview-toolbar">
        <div className="workspace-brand">
          <span className="workspace-logo">A</span>
          <div><h1>My app</h1><p>Design preview</p></div>
        </div>
        <div className="preview-controls">
          <fieldset className="platform-switch">
            <legend className="sr-only">Preview platform</legend>
            <button type="button" aria-pressed={platform === 'ios'} onClick={() => setPlatform('ios')}>iOS</button>
            <button type="button" aria-pressed={platform === 'material'} onClick={() => setPlatform('material')}>Android</button>
          </fieldset>
          <label className="appearance-switch">
            <input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />
            Dark mode
          </label>
        </div>
      </header>
      <div className="preview-layout">
        <section className="preview-stage" aria-label={`${platform === 'ios' ? 'iOS' : 'Android'} app preview`}>
          <MobilePreview platform={platform} dark={dark} />
          <p className="device-caption"><span />INTERACTIVE PROTOTYPE <span className="caption-divider">/</span> {platform === 'ios' ? 'iOS' : 'ANDROID'}</p>
        </section>
      </div>
    </main>
  )
}

export default App

import { App as KonstaApp } from 'konsta/react'
import { StarterScreen } from '../screens/StarterScreen'

export type Platform = 'ios' | 'material'

export function MobilePreview({ platform, dark }: { platform: Platform; dark: boolean }) {
  return (
    <div className={`device-preview${dark ? ' dark' : ''}`}>
      <KonstaApp theme={platform} dark={dark} className="prototype-app">
        <StarterScreen />
      </KonstaApp>
    </div>
  )
}

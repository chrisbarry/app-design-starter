import { useState } from 'react'
import { Block, BlockTitle, Button, List, ListInput, ListItem, Navbar, NavbarBackLink, Page, Toggle } from 'konsta/react'

// Example screens to replace with your own. Konsta components adapt to iOS / Android.
type View = { name: 'home' } | { name: 'detail'; item: Item }
type Item = { id: number; title: string; subtitle: string }

const items: Item[] = [
  { id: 1, title: 'First thing', subtitle: 'Tap to open a detail screen' },
  { id: 2, title: 'Second thing', subtitle: 'Fictional example data' },
  { id: 3, title: 'Third thing', subtitle: 'Swap these for your own' },
]

export function StarterScreen() {
  const [view, setView] = useState<View>({ name: 'home' })
  return view.name === 'home'
    ? <HomeScreen onOpen={(item) => setView({ name: 'detail', item })} />
    : <DetailScreen item={view.item} onBack={() => setView({ name: 'home' })} />
}

function HomeScreen({ onOpen }: { onOpen: (item: Item) => void }) {
  return (
    <Page>
      <Navbar title="Home" large transparent centerTitle />
      <Block strong inset>
        <p>This is a starting point. Edit <code>src/screens/StarterScreen.tsx</code> and the phone updates as you save.</p>
      </Block>
      <BlockTitle>Things</BlockTitle>
      <List strong inset>
        {items.map((item) => (
          <ListItem key={item.id} link title={item.title} subtitle={item.subtitle} onClick={() => onOpen(item)} />
        ))}
      </List>
    </Page>
  )
}

function DetailScreen({ item, onBack }: { item: Item; onBack: () => void }) {
  const [name, setName] = useState('')
  const [notify, setNotify] = useState(true)
  return (
    <Page>
      <Navbar title={item.title} left={<NavbarBackLink onClick={onBack} />} />
      <BlockTitle>Details</BlockTitle>
      <List strong inset>
        <ListInput label="Name" type="text" placeholder="Type something" value={name} onChange={(e) => setName(e.target.value)} />
        <ListItem title="Notify me" after={<Toggle checked={notify} onChange={() => setNotify(!notify)} />} />
      </List>
      <Block>
        <Button large rounded onClick={onBack}>Save</Button>
      </Block>
    </Page>
  )
}

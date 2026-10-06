export function createGameMenu() {
  const dialog = document.querySelector('#game-menu')
  const tabs = [...dialog.querySelectorAll('[data-menu-tab]')]
  const panels = [...dialog.querySelectorAll('[data-menu-panel]')]
  let opener
  function selectTab(id) {
    tabs.forEach(tab => { const selected = tab.dataset.menuTab === id; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1 })
    panels.forEach(panel => { panel.hidden = panel.dataset.menuPanel !== id })
    if (id === 'upgrades') document.querySelector('#skill-panel').open = true
  }
  function open(id = 'settings') {
    selectTab(id)
    if (!dialog.open) { opener = document.activeElement; dialog.showModal(); dialog.dispatchEvent(new Event('menu-open')) }
    tabs.find(tab => tab.dataset.menuTab === id)?.focus()
  }
  function close() { dialog.close(); opener?.focus() }
  tabs.forEach(tab => {
    tab.addEventListener('click', () => selectTab(tab.dataset.menuTab))
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const index = tabs.indexOf(tab), next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
      selectTab(tabs[next].dataset.menuTab); tabs[next].focus()
    })
  })
  document.querySelectorAll('[data-open-menu]').forEach(button => button.addEventListener('click', () => open(button.dataset.openMenu)))
  document.querySelector('#close-menu').addEventListener('click', close)
  dialog.addEventListener('cancel', event => { event.preventDefault(); close() })
  dialog.addEventListener('click', event => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close() } })
  document.addEventListener('keydown', event => {
    if (event.code !== 'Escape' || event.repeat) return
    event.preventDefault(); event.stopImmediatePropagation()
    if (dialog.open) close(); else open()
  })
  selectTab('settings')
  return { dialog, get isOpen() { return dialog.open }, open, close }
}
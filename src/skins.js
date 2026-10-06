export const SKINS = [
  { id: 'classic', name: 'Bò sữa', level: 1, icon: '♧', colors: { fur: '#fff6e2', patch: '#3f4540', muzzle: '#f3b3ac', horn: '#e9c995', blush: '#ec949d', bell: '#e7af42' } },
  { id: 'strawberry', name: 'Bò dâu', level: 3, icon: '🍓', colors: { fur: '#ffe0e5', patch: '#d77a96', muzzle: '#f6a9b7', horn: '#f4cfb4', blush: '#de7899', bell: '#c69743' } },
  { id: 'chocolate', name: 'Bò chocolate', level: 5, icon: '🍫', colors: { fur: '#ebccaa', patch: '#775244', muzzle: '#cc997f', horn: '#edcf9a', blush: '#d4847d', bell: '#ddb854' } },
  { id: 'matcha', name: 'Bò matcha', level: 7, icon: '🍃', colors: { fur: '#e2edbe', patch: '#7b9b56', muzzle: '#d7c896', horn: '#f1dfb0', blush: '#e1a1a0', bell: '#bc963d' } },
  { id: 'sky', name: 'Bò mây', level: 9, icon: '☁', colors: { fur: '#e5f3ff', patch: '#83afcb', muzzle: '#c6dbe7', horn: '#fff0c6', blush: '#e5aec8', bell: '#e4c05c' } },
  { id: 'lavender', name: 'Bò oải hương', level: 11, icon: '✿', colors: { fur: '#f0e5ff', patch: '#a393cb', muzzle: '#d8bbe4', horn: '#eee0b8', blush: '#d997bd', bell: '#d7b25d' } },
  { id: 'golden', name: 'Bò hoàng gia', level: 13, icon: '♛', colors: { fur: '#fff0ba', patch: '#c39d48', muzzle: '#edc68a', horn: '#f4d573', blush: '#eab08f', bell: '#e0ac37' } },
]

export const getSkin = id => SKINS.find(skin => skin.id === id) || SKINS[0]
export const skinForLevel = level => SKINS.find(skin => skin.level === level && skin.id !== 'classic') || null
export const skinsAtLevel = level => SKINS.filter(skin => skin.level <= level).map(skin => skin.id)

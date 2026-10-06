export const TEAMS = [
  { id: 'blue', name: 'Xanh', color: '#438be0' },
  { id: 'red', name: 'Đỏ', color: '#e26060' },
]
export const getTeam = id => TEAMS.find(team => team.id === id)
export const EMOTES = [
  { id: 'heart', label: 'Thả tim', glyph: '♥', color: '#dd7599', key: 'Digit1', number: '1' },
  { id: 'happy', label: 'Vui vẻ', glyph: '☺', color: '#ba933b', key: 'Digit2', number: '2' },
  { id: 'moo', label: 'Kêu Moo', glyph: 'Moo!', color: '#669e73', key: 'Digit3', number: '3' },
]

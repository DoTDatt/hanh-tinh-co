import { TEAMS, getTeam } from './social-data.js'
const compareScore = (a, b) => b.knockouts - a.knockouts || b.damageDealt - a.damageDealt

export function createRoundUI() {
  const scoreList = document.querySelector('#score-list')
  const resultPanel = document.querySelector('#round-result')
  const resultList = document.querySelector('#result-list')
  const resultButton = document.querySelector('#show-result')
  let leaderboardKey = ''
  let scoreKey = '', lastResult = null, ownId = null, resultKey = '', hideTimer
  function renderRows(container, rows, selfId) {
    container.replaceChildren(...rows.map((player, index) => {
      const row = document.createElement('li')
      const label = document.createElement('span')
      const score = document.createElement('b')
      label.textContent = `${player.rank || index + 1}. ${player.name}${player.id === selfId ? ' (bạn)' : ''}${player.connected === false ? ' · mất mạng' : ''}`
      if (player.color) row.style.borderLeft = `3px solid ${player.color}`
      score.textContent = `${player.knockouts} / ${player.damageDealt}`
      row.classList.toggle('own-score', player.id === selfId)
      row.append(label, score)
      return row
    }))
  }
  function openResult() {
    if (!lastResult) return
    const winners = lastResult.rows.filter(player => lastResult.winners.includes(player.id))
    document.querySelector('#result-title').textContent = `Kết quả vòng ${lastResult.round}`
    const teamResult = document.querySelector('#result-teams')
    teamResult.hidden = lastResult.mode !== 'teams'
    if (lastResult.mode === 'teams') {
      const teamWinners = (lastResult.winningTeams || []).map(id => getTeam(id)?.name).filter(Boolean)
      document.querySelector('#result-winner').textContent = teamWinners.length > 1 ? 'Hai đội hòa nhau! Cùng thử sức ở vòng sau nhé!' : teamWinners.length ? `Đội ${teamWinners[0]} thắng! Chúc mừng cả đội!` : 'Chưa có sát thương trong vòng này. Cùng thử sức ở vòng sau nhé!'
      teamResult.replaceChildren(...lastResult.teamScores.map(team => {
        const item = document.createElement('p'); item.style.color = team.color
        item.textContent = `${team.name}: ${team.knockouts} hạ · ${team.damageDealt} sát thương`; return item
      }))
    } else document.querySelector('#result-winner').textContent = winners.length ? `${winners.some(player => player.id === ownId) ? 'Chúc mừng bạn! ' : ''}${winners.map(player => player.name).join(', ')} ${winners.length > 1 ? 'đồng hạng nhất' : 'thắng vòng này'}!` : 'Chưa có sát thương trong vòng này. Cùng thử húc ở vòng sau nhé!'
    renderRows(resultList, lastResult.rows, ownId)
    resultPanel.hidden = false
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => { resultPanel.hidden = true }, 20000)
  }
  document.querySelector('#close-result').addEventListener('click', () => { resultPanel.hidden = true; clearTimeout(hideTimer) })
  resultButton.addEventListener('click', openResult)
  return {
    update(players, selfId, mode = 'free') {
      document.querySelector('#team-score').hidden = mode !== 'teams'
      for (const team of TEAMS) {
        const members = players.filter(player => player.team === team.id)
        document.querySelector(`#${team.id}-score`).textContent = `${team.name} · ${members.reduce((sum, player) => sum + player.knockouts, 0)} hạ`
      }
      const sorted = [...players].sort(compareScore)
      const nextKey = JSON.stringify(sorted.map(player => [player.id, player.name, player.knockouts, player.damageDealt, player.connected, player.color])) + selfId
      if (nextKey === scoreKey) return
      scoreKey = nextKey
      let rank = 1
      const rows = sorted.map((player, index) => {
        if (index > 0 && compareScore(player, sorted[index - 1]) !== 0) rank = index + 1
        return { ...player, rank }
      })
      renderRows(scoreList, rows, selfId)
    },
    updateLeaderboard(rows, selfId) {
      const nextKey = JSON.stringify(rows) + selfId
      if (nextKey === leaderboardKey) return
      leaderboardKey = nextKey
      document.querySelector('#leaderboard-empty').hidden = rows.some(player => player.kills > 0 || player.damage > 0)
      document.querySelector('#leaderboard-list').replaceChildren(...rows.map(player => {
        const row = document.createElement('li')
        const name = document.createElement('span')
        const stats = document.createElement('div')
        const score = document.createElement('b')
        const damage = document.createElement('small')
        name.textContent = `${player.rank}. ${player.name}${player.id === selfId ? ' (bạn)' : ''}${player.connected === false ? ' · đã rời' : ''}`
        score.textContent = `${player.kills} hạ · ${player.deaths} chết`
        damage.textContent = `${player.damage} sát thương`
        row.classList.toggle('own-score', player.id === selfId)
        row.classList.toggle('top-player', player.rank === 1 && player.kills > 0)
        if (player.color) row.style.borderLeftColor = player.color
        stats.append(score, damage)
        row.append(name, stats)
        return row
      }))
    },
    updateAccountTop(rows, userId) {
      const list = document.querySelector('#account-top-list')
      document.querySelector('#account-top-empty').hidden = rows.length > 0
      list.replaceChildren(...rows.map((player, index) => {
        const item = document.createElement('li'), label = document.createElement('span'), stats = document.createElement('div'), score = document.createElement('b'), damage = document.createElement('small')
        label.textContent = `${index + 1}. ${player.display_name}${player.user_id === userId ? ' (bạn)' : ''}`
        score.textContent = `${player.kills} hạ · ${player.deaths} chết`
        damage.textContent = `${player.damage} sát thương`
        stats.append(score, damage); item.append(label, stats)
        item.classList.toggle('own-score', player.user_id === userId)
        return item
      }))
    },
    showResult(result, selfId) {
      const key = `${result.sessionId}:${result.round}`
      if (key === resultKey) return
      resultKey = key; lastResult = result; ownId = selfId
      resultButton.disabled = false
      openResult()
    },
  }
}

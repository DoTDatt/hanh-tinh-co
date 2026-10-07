const randomUUID = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => { const value = Math.floor(Math.random() * 16); return (char === 'x' ? value : (value & 3) | 8).toString(16) })
const WebSocket = { OPEN: 1 }
import { createGrassData, PLANET_RADIUS, GRASS_COUNT } from './world-data.js'
import { MAX_LEVEL } from './progression.js'
import { getSkin } from './skins.js'
import { TEAMS, getTeam, EMOTES } from './social-data.js'
import { GRAZING_SECONDS, COMBAT_SECONDS, STUN_MS, JUMP_MS, jumpHeightAt } from './game-rules.js'

const COLORS = ['#cfec91', '#f4c17a', '#94ceef', '#eeb3d1', '#c9b9ed', '#83dbc5']
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0)
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const normalize = value => {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) return null
  const length = Math.hypot(...value)
  if (length < .001 || length > 2) return null
  return value.map(component => component / length)
}
const rotate = (vector, axis, angle) => {
  const cos = Math.cos(angle), sin = Math.sin(angle), tangent = cross(axis, vector), projection = dot(axis, vector)
  return vector.map((value, index) => value*cos+tangent[index]*sin+axis[index]*projection*(1-cos))
}
const cleanName = value => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f]/g, '').slice(0, 24) : ''
const rank = value => Number.isInteger(value) ? Math.max(0, Math.min(5, value)) : 0
export function healingFromGrass(health, maxHealth, count) {
  return count > 0 ? Math.min(maxHealth - health, Math.max(1, Math.round(count * .4))) : 0
}

const reconnectLifetime = 5 * 60 * 1000
const compareScore = (a, b) => b.knockouts - a.knockouts || b.damageDealt - a.damageDealt
function resultsForRound(phase, participants) {
  const sorted = [...participants.values()].sort(compareScore)
  const rows = sorted.map((player, index) => ({
    id: player.id, name: player.name, team: player.team, color: player.color, knockouts: player.knockouts, damageDealt: player.damageDealt,
    rank: index > 0 && compareScore(player, sorted[index - 1]) === 0 ? 0 : index + 1,
  }))
  for (let i = 1; i < rows.length; i++) if (rows[i].rank === 0) rows[i].rank = rows[i - 1].rank
  const winners = sorted[0]?.damageDealt > 0 ? rows.filter(player => player.rank === 1).map(player => player.id) : []
  const teamScores = TEAMS.map(team => ({ ...team, knockouts: rows.filter(player => player.team === team.id).reduce((sum, player) => sum + player.knockouts, 0), damageDealt: rows.filter(player => player.team === team.id).reduce((sum, player) => sum + player.damageDealt, 0) })).sort(compareScore)
  const winningTeams = phase.mode === 'teams' && teamScores[0].damageDealt > 0 ? teamScores.filter(team => compareScore(team, teamScores[0]) === 0).map(team => team.id) : []
  return { sessionId: phase.sessionId, round: phase.round, mode: phase.mode, rows, winners, teamScores, winningTeams }
}

export function createRoomSimulation(wss, { grazingSeconds = GRAZING_SECONDS, combatSeconds = COMBAT_SECONDS } = {}) {
  const players = new Map(), sessions = new Map(), eatenGrass = new Map(), grass = createGrassData()
  let participants = new Map(), lastResult = null
  const records = new Map()
  const allPlayers = () => [...sessions.values()].map(session => session.player)
  let spawnCount = 0, lastTick = Date.now()
  let phase = { sessionId: randomUUID(), mode: 'teams', hostId: null, stage: 'grazing', round: 1, endsAt: 0, duration: grazingSeconds * 1000 }
  const send = (socket, message) => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)) }
  const leaderboardRows = () => {
    const rows = [...records.values()].map(player => ({ id: player.id, name: player.name, team: player.team, color: player.color, kills: player.totalKnockouts, deaths: player.deaths, damage: player.totalDamage, connected: player.connected }))
      .sort((a,b) => b.kills-a.kills || b.damage-a.damage)
    let rank = 1
    return rows.slice(0,10).map((player,index) => {
      if(index && (player.kills!==rows[index-1].kills || player.damage!==rows[index-1].damage))rank=index+1
      return {...player,rank}
    })
  }
  const broadcast = message => {
    if(message.type==='players')message={...message,leaderboard:leaderboardRows()}
    const encoded = JSON.stringify(message)
    for (const socket of players.keys()) if (socket.readyState === WebSocket.OPEN) socket.send(encoded)
  }
  const playerList = () => allPlayers().map(({lastBite,lastAttack,lastJump,lastEmote,lastTeamChange,baseColor,spawnNormal,powerRank,armorRank,enduranceRank,flight,buildLocked,...player})=>player)
  const activeTeamCounts = (exceptId = null) => {
    const count = { blue: 0, red: 0 }
    for (const member of players.values()) if (member.id !== exceptId && getTeam(member.team)) count[member.team]++
    return count
  }
  const balancedTeam = count => count.blue === count.red ? (Math.random() < .5 ? 'blue' : 'red') : count.blue < count.red ? 'blue' : 'red'
  const syncHost = () => {
    const online = [...players.values()]
    if (!online.some(player => player.id === phase.hostId)) phase.hostId = online[0]?.id || null
  }
  function placeTeam(player, index) {
    player.color = phase.mode === 'teams' ? getTeam(player.team).color : player.baseColor
    if (phase.mode !== 'teams') return
    const x = player.team === 'blue' ? -.42 : .42, z = Math.sin(index * 2.4) * .16
    player.spawnNormal = [x, Math.sqrt(1-x*x-z*z), z]
  }
  function refreshTeamSpawns() {
    const count = { blue: 0, red: 0 }
    // Giữ đội người chơi đã chọn qua các vòng, không tự đổi đội.
    for (const player of allPlayers()) {
      if (!getTeam(player.team)) player.team = balancedTeam(count)
      placeTeam(player, count[player.team]++)
    }
  }
  function updateMotion(player, now) {
    if (!player.flight) { player.jumpHeight = jumpHeightAt(now, player.jumpUntil); return }
    const flight = player.flight, t = Math.max(0, Math.min(1, (now - flight.startedAt) / flight.duration))
    const angle = flight.speed * (flight.duration / 1000) * (t - t * t / 2) / PLANET_RADIUS
    player.normal = rotate(flight.origin, flight.axis, angle)
    player.heading = rotate(flight.heading, flight.axis, angle)
    player.jumpHeight = Math.sin(t * Math.PI) * 1.2
    if (t >= 1) {
      player.flight = null; player.knockedUntil = 0; player.jumpHeight = 0
      broadcast({type:'reposition',reason:'landed',playerId:player.id,normal:player.normal,heading:player.heading,serverNow:now})
    }
  }
  const pruneGrass = now => { for (const [index, patch] of eatenGrass) if (patch.regrowsAt <= now) eatenGrass.delete(index) }
  const pruneSessions = now => {
    for(const [token,session] of sessions)if(!session.socket&&session.expiresAt<=now)sessions.delete(token)
  }

  wss.on('connection', (socket, request) => {
    socket.alive = true
    socket.on('pong',()=>{socket.alive=true})
    const now = Date.now()
    pruneSessions(now)
    if (sessions.size === 0) {
      phase = {sessionId:randomUUID(),mode:'teams',hostId:null,stage:'grazing',round:1,endsAt:now+grazingSeconds*1000,duration:grazingSeconds*1000}
      eatenGrass.clear()
      participants.clear();lastResult=null;records.clear()
    }
    const requestedToken = new URL(request.url, 'http://localhost').searchParams.get('resume')
    const savedSession = sessions.get(requestedToken)
    const resumed = Boolean(savedSession && (savedSession.socket || savedSession.expiresAt > now))
    const angle = spawnCount * Math.PI * (3-Math.sqrt(5)), spread = sessions.size === 0 ? 0 : .24
    const normal = [Math.sin(angle)*spread,Math.sqrt(1-spread*spread),Math.cos(angle)*spread]
    const player = resumed ? savedSession.player : {
      id:randomUUID(),name:`Bò ${spawnCount+1}`,color:COLORS[spawnCount%COLORS.length],normal,spawnNormal:[...normal],heading:[0,0,-1],
      eating:false,level:1,skin:'classic',buildLocked:false,lastBite:0,lastAttack:0,lastJump:0,health:100,maxHealth:100,stamina:100,maxStamina:100,
      jumpHeight:0,jumpUntil:0,attackUntil:0,knockedUntil:0,powerRank:0,armorRank:0,enduranceRank:0,flight:null,
      knockouts:0,damageDealt:0,totalKnockouts:0,totalDamage:0,deaths:0,connected:true,spectating:phase.stage==='combat',baseColor:COLORS[spawnCount%COLORS.length],team:null,lastEmote:0,lastTeamChange:0,emote:null,
    }
    const activeCount = activeTeamCounts(player.id)
    const joiningTeam = getTeam(player.team) && Math.abs(activeCount.blue + Number(player.team === 'blue') - activeCount.red - Number(player.team === 'red')) <= 1
      ? player.team : balancedTeam(activeCount)
    if (!resumed || joiningTeam !== player.team) {
      player.team = joiningTeam
      placeTeam(player, allPlayers().filter(member=>member.id!==player.id&&member.team===player.team).length)
      player.normal=[...player.spawnNormal]
    }
    const resumeToken = resumed ? requestedToken : randomUUID()
    const session = resumed ? savedSession : { player, socket: null, expiresAt: 0 }
    if (session.socket) {
      players.delete(session.socket)
      session.socket.close(4000, 'Đã kết nối lại ở trang mới')
    }
    session.socket=socket;session.expiresAt=0;player.connected=true
    sessions.set(resumeToken, session)
    records.set(player.id,player)
    if(!player.spectating)participants.set(player.id, player)
    if (!resumed) spawnCount++
    players.set(socket, player)
    syncHost()
    pruneGrass(now)
    send(socket,{type:'welcome',self:player,players:playerList(),grass:[...eatenGrass.values()],phase,resumeToken,resumed,lastResult,leaderboard:leaderboardRows(),serverNow:now})
    broadcast({type:'players',players:playerList(),phase,serverNow:now})
    socket.on('message',bytes=>{
      if (session.socket !== socket) return
      let message
      try{message=JSON.parse(bytes.toString())}catch{return}
      if(!message||typeof message!=='object')return
      if(message.type==='mode'){
        if(player.id!==phase.hostId||phase.stage!=='grazing'||!['teams','free'].includes(message.mode)){
          send(socket,{type:'action-denied',message:'Chủ phòng chọn chế độ trong thời gian ăn cỏ nhé!'});return
        }
        if(message.mode===phase.mode)return
        phase.mode=message.mode;refreshTeamSpawns()
        for(const member of allPlayers()){
          member.normal=[...member.spawnNormal];member.heading=[0,0,-1];member.jumpHeight=0;member.jumpUntil=0
          broadcast({type:'reposition',reason:'mode',playerId:member.id,normal:member.normal,heading:member.heading,serverNow:Date.now()})
        }
        broadcast({type:'phase',phase,serverNow:Date.now()})
        broadcast({type:'players',players:playerList(),phase,serverNow:Date.now()})
      }
      if(message.type==='team'){
        if(phase.mode!=='teams'||phase.stage!=='grazing'||!getTeam(message.team)){
          send(socket,{type:'action-denied',message:'Chỉ chuyển đội trong thời gian ăn cỏ của chế độ 2 đội nhé!'});return
        }
        if(message.team===player.team)return
        const now=Date.now()
        if(now-player.lastTeamChange<1000){send(socket,{type:'action-denied',message:'Chờ 1 giây trước khi chuyển đội tiếp nhé!'});return}
        const count=activeTeamCounts()
        count[player.team]--;count[message.team]++
        if(Math.abs(count.blue-count.red)>1){send(socket,{type:'action-denied',message:'Chuyển đội lúc này sẽ làm hai đội lệch quá 1 người.'});return}
        player.lastTeamChange=now;player.team=message.team
        placeTeam(player,allPlayers().filter(member=>member.id!==player.id&&member.team===player.team).length)
        player.normal=[...player.spawnNormal];player.heading=[0,0,-1];player.eating=false;player.jumpHeight=0;player.jumpUntil=0
        broadcast({type:'reposition',reason:'team',playerId:player.id,normal:player.normal,heading:player.heading,serverNow:now})
        broadcast({type:'players',players:playerList(),phase,serverNow:now})
      }
      if(message.type==='emote'){
        const now=Date.now()
        if(player.spectating||player.health===0||!EMOTES.some(emote=>emote.id===message.emote))return
        if(now-player.lastEmote<2500){send(socket,{type:'action-denied',message:'Chờ 2,5 giây rồi gửi biểu cảm tiếp nhé!'});return}
        player.lastEmote=now;player.emote={id:message.emote,startedAt:now,until:now+2500}
        broadcast({type:'emote',playerId:player.id,emote:player.emote,serverNow:now})
      }
      if(message.type==='name'){
        const name=cleanName(message.name)
        if(name)player.name=name
        broadcast({type:'players',players:playerList(),phase,serverNow:Date.now()})
      }
      if(message.type==='pose'){
        if(message.sessionId!==phase.sessionId||message.round!==phase.round)return
        player.skin=getSkin(message.skin).id
        if(player.spectating||player.health===0)return
        if(phase.stage==='grazing'||!player.buildLocked){
          player.level=Number.isInteger(message.level)?Math.max(1,Math.min(MAX_LEVEL,message.level)):player.level
          let budget=player.level-1
          for(const key of ['powerRank','armorRank','enduranceRank']){
            player[key]=Math.min(rank(message[key]),budget);budget-=player[key]
          }
          player.buildLocked=phase.stage==='combat'
        }
        const capacity=100+20*player.enduranceRank
        if(capacity>player.maxStamina)player.stamina+=capacity-player.maxStamina
        player.maxStamina=capacity
        player.stamina=Math.min(player.stamina,capacity)
        const wasFlying=Boolean(player.flight)
        updateMotion(player,Date.now())
        if(wasFlying||player.health===0||player.knockedUntil>Date.now())return
        const normal=normalize(message.normal),heading=normalize(message.heading)
        if(!normal||!heading)return
        player.normal=normal;player.heading=heading;player.eating=message.eating===true&&player.jumpUntil<=Date.now()
        player.jumpHeight=jumpHeightAt(Date.now(),player.jumpUntil)
      }
      if(message.type==='jump'){
        const now=Date.now()
        updateMotion(player,now)
        if(player.spectating||player.health===0||player.knockedUntil>now||player.flight||player.jumpUntil>now||now-player.lastJump<JUMP_MS)return
        if(player.stamina<10){send(socket,{type:'action-denied',message:'Nhảy cần 10 stamina. Chờ hồi sức nhé!'});return}
        player.stamina-=10;player.lastJump=now;player.jumpUntil=now+JUMP_MS;player.eating=false
        send(socket,{type:'jump-result',accepted:true,jumpUntil:player.jumpUntil,serverNow:now})
      }
      if(message.type==='attack'){
        const now=Date.now()
        const deny=reason=>send(socket,{type:'action-denied',message:reason})
        if(player.spectating){deny('Bạn đang xem. Chờ vòng ăn cỏ tiếp theo để tham gia nhé!');return}
        if(phase.stage!=='combat'){deny('Đang ăn cỏ. Chờ hết 30 giây để vào combat!');return}
        updateMotion(player,now)
        if(player.health===0||player.knockedUntil>now||player.flight||now-player.lastAttack<650)return
        if(player.stamina<25){deny('Chưa đủ stamina. Nghỉ một chút rồi húc tiếp!');return}
        const forward=normalize(player.heading.map((v,i)=>v-dot(player.heading,player.normal)*player.normal[i]))
        if(!forward)return
        player.stamina-=25;player.lastAttack=now;player.attackUntil=now+300;player.eating=false
        const victims=[]
        for(const victim of allPlayers()){
          updateMotion(victim,now)
          if(victim.spectating||victim.id===player.id||victim.health===0||victim.flight||victim.jumpUntil>now||(phase.mode==='teams'&&victim.team===player.team))continue
          const cosine=Math.max(-1,Math.min(1,dot(player.normal,victim.normal)))
          const distance=Math.acos(cosine)*PLANET_RADIUS
          if(distance>1.9||Math.abs(player.jumpHeight-victim.jumpHeight)>.85)continue
          const toward=normalize(victim.normal.map((v,i)=>v-cosine*player.normal[i]))
          if(distance>.3&&(!toward||dot(forward,toward)<.15))continue
          const direction=normalize(victim.normal.map((v,i)=>v*cosine-player.normal[i]))||forward
          const force=8*(1+.15*player.powerRank)*(1-.08*victim.armorRank)
          const damage=Math.max(1,Math.round(12*(1+.15*player.powerRank)*(1-.08*victim.armorRank)))
          const actualDamage=Math.min(victim.health,damage)
          victim.health-=actualDamage
          player.damageDealt+=actualDamage;player.totalDamage+=actualDamage
          if(victim.health===0){
            player.knockouts++;player.totalKnockouts++;victim.deaths++
            victim.level=1;victim.powerRank=0;victim.armorRank=0;victim.enduranceRank=0;victim.buildLocked=true
            victim.maxStamina=100;victim.stamina=Math.min(victim.stamina,100)
          }
          victim.flight={axis:normalize(cross(victim.normal,direction))||[1,0,0],speed:force,origin:[...victim.normal],heading:[...victim.heading],startedAt:now,duration:STUN_MS}
          victim.knockedUntil=now+STUN_MS;victim.jumpUntil=0;victim.eating=false
          victims.push({id:victim.id,force,damage:actualDamage,health:victim.health,knockedUntil:victim.knockedUntil})
        }
        broadcast({type:'attack',attackerId:player.id,victims,serverNow:now})
        broadcast({type:'players',players:playerList(),phase,serverNow:now})
      }
      if(message.type==='bite'){
        const now=Date.now(),mouth=normalize(message.mouth)
        updateMotion(player,now)
        if(!Number.isSafeInteger(message.requestId)||!Array.isArray(message.indices)||message.indices.length>300)return
        const reply=(count,healed=0)=>send(socket,{type:'bite-result',requestId:message.requestId,count,healed})
        if(player.spectating||player.health===0||player.knockedUntil>now||player.flight||player.jumpUntil>now||player.jumpHeight>.15||!mouth||dot(mouth,player.normal)<.95||now-player.lastBite<300){reply(0);return}
        const radius=Number.isFinite(message.radius)?Math.max(.48,Math.min(.84,message.radius)):.48
        const seconds=Number.isFinite(message.regrowthSeconds)?Math.max(7,Math.min(20,message.regrowthSeconds)):20
        const reach=Math.cos(radius/PLANET_RADIUS),changes=[]
        for(const index of new Set(message.indices)){
          if(!Number.isInteger(index)||index<0||index>=GRASS_COUNT||dot(grass[index].normal,mouth)<=reach)continue
          if(eatenGrass.get(index)?.regrowsAt>now)continue
          const change={index,regrowsAt:now+seconds*1000,duration:seconds*1000}
          eatenGrass.set(index,change);changes.push(change)
        }
        player.lastBite=now
        const healed=healingFromGrass(player.health,player.maxHealth,changes.length)
        player.health+=healed
        if(changes.length)broadcast({type:'grass',changes,serverNow:now})
        reply(changes.length,healed)
      }
    })
    socket.on('error',()=>{})
    socket.on('close',()=>{
      players.delete(socket)
      if(session.socket!==socket)return
      session.socket=null;session.expiresAt=Date.now()+reconnectLifetime
      player.connected=false;player.eating=false
      syncHost()
      if(!player.flight)player.jumpHeight=0
      broadcast({type:'players',players:playerList(),phase,serverNow:Date.now()})
    })
  })
  const tick=setInterval(()=>{
    const now=Date.now(),delta=Math.min((now-lastTick)/1000,.2)
    lastTick=now;pruneGrass(now)
    pruneSessions(now)
    if(!sessions.size)phase.endsAt=0
    if(sessions.size&&phase.endsAt&&now>=phase.endsAt){
      if(phase.stage==='grazing'){
        phase={...phase,stage:'combat',endsAt:now+combatSeconds*1000,duration:combatSeconds*1000}
        for(const player of allPlayers())player.buildLocked=true
      }
      else{
        lastResult=resultsForRound(phase,participants)
        broadcast({type:'round-result',result:lastResult,serverNow:now})
        phase={...phase,stage:'grazing',round:phase.round+1,endsAt:now+grazingSeconds*1000,duration:grazingSeconds*1000}
        eatenGrass.clear();broadcast({type:'grass',changes:[],reset:true,serverNow:now})
        refreshTeamSpawns()
        participants=new Map()
        for(const player of allPlayers()){
          player.normal=[...player.spawnNormal];player.heading=[0,0,-1];player.jumpHeight=0;player.jumpUntil=0;player.flight=null;player.knockedUntil=0
          player.buildLocked=false
          player.maxStamina=100+20*player.enduranceRank;player.health=player.maxHealth;player.stamina=player.maxStamina
          player.eating=false;player.attackUntil=0;player.lastBite=0;player.lastAttack=0;player.lastJump=0
          player.knockouts=0;player.damageDealt=0;participants.set(player.id,player)
          player.spectating=false
          player.lastEmote=0;player.emote=null
          broadcast({type:'reposition',playerId:player.id,normal:player.normal,heading:player.heading,serverNow:now})
        }
      }
      broadcast({type:'phase',phase,serverNow:now})
    }
    for(const player of allPlayers()){
      if(now-Math.max(player.lastAttack,player.lastJump)>1000)player.stamina=Math.min(player.maxStamina,player.stamina+10*delta)
      updateMotion(player,now)
    }
    if(players.size)broadcast({type:'players',players:playerList(),phase,serverNow:now})
  },100)
  const heartbeat=setInterval(()=>{for(const socket of players.keys()){if(!socket.alive){socket.terminate();continue}socket.alive=false;socket.ping()}},10000)
  tick.unref?.();heartbeat.unref?.()
  return()=>{clearInterval(tick);clearInterval(heartbeat);for(const socket of players.keys())socket.close();wss.close()}
}

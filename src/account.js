const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const baseUrl = new URL(import.meta.env.BASE_URL, location.origin).href
const emptyProfile = () => ({ revision: 0, display_name: 'Bò nhỏ', progression: { version: 5, totalXp: 0, lifetimeXp: 0, meals: 0, skills: {}, bestLevel: 1, ownedSkins: ['classic'], selectedSkin: 'classic' }, kills: 0, deaths: 0, damage: 0, last_room: null })

export function createAccount() {
  let client, session, profile = emptyProfile(), authenticated = false
  let generation = 0, savedGeneration = 0, flushing = null, timer, failed = false, conflict = false
  const status = document.querySelector('#account-status')
  const saveStatus = document.querySelector('#account-save-status')
  const signIn = document.querySelector('#account-sign-in')
  const signOut = document.querySelector('#account-sign-out')
  const showSaveStatus = text => { saveStatus.textContent = text }
  function render() {
    authenticated = Boolean(session?.user && !session.user.is_anonymous)
    status.textContent = authenticated ? `Đã đăng nhập · ${session.user.email || 'Tài khoản Google'}` : 'Đang chơi khách'
    signIn.hidden = authenticated
    signIn.disabled = !configured
    signOut.hidden = !authenticated
    document.querySelector('#account-note').textContent = authenticated ? 'Tên, cấp, kỹ năng và skin được lưu theo tài khoản.' : configured ? 'Đăng nhập để giữ dữ liệu khi đổi máy. Dữ liệu chơi khách được lưu riêng trên trình duyệt.' : 'Đăng nhập chưa được bật. Bạn vẫn có thể chơi khách.'
    if (!authenticated) showSaveStatus('Chơi khách · lưu trên máy này')
  }
  async function flush() {
    clearTimeout(timer); timer = null
    if (!authenticated || conflict || generation === savedGeneration) return
    if (flushing) { await flushing; if (!failed) return flush(); return }
    const currentGeneration = generation
    const payload = JSON.parse(JSON.stringify(profile))
    showSaveStatus('Đang lưu dữ liệu…')
    flushing = (async () => {
      try {
        const { data, error } = await client.rpc('save_game_profile', { p_profile: payload, p_expected_revision: profile.revision }).abortSignal(AbortSignal.timeout(10000))
        if (error) {
          conflict = error.code === '40001'
          throw error
        }
        profile.revision = data.revision
        savedGeneration = currentGeneration
        failed = false
        showSaveStatus('Đã lưu tài khoản')
      } catch {
        failed = true
        showSaveStatus(conflict ? 'Tài khoản đã thay đổi ở tab khác. Tải lại trang để tiếp tục lưu.' : 'Chưa lưu được. Đang thử lại…')
      } finally { flushing = null }
    })()
    await flushing
    if (!conflict && generation !== savedGeneration) timer = setTimeout(flush, failed ? 5000 : 500)
  }
  function dirty() {
    if (!authenticated || conflict) return
    generation++
    showSaveStatus('Có thay đổi đang chờ lưu…')
    if (!timer) timer = setTimeout(flush, 1200)
  }
  const ready = (async () => {
    render()
    if (!configured) return
    try {
      const { createClient } = await import('@supabase/supabase-js')
      client = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true } })
      const result = await client.auth.getSession()
      if (result.error) throw result.error
      session = result.data.session
      render()
      if (authenticated) {
        const { data, error } = await client.from('game_profiles').select('*').eq('user_id', session.user.id).maybeSingle().abortSignal(AbortSignal.timeout(10000))
        if (error) throw error
        if (data) profile = data
        showSaveStatus(data ? 'Đã tải dữ liệu tài khoản' : 'Tài khoản mới · sẵn sàng chơi')
      }
      const initialUser = authenticated ? session.user.id : null
      client.auth.onAuthStateChange((event, nextSession) => {
        session = nextSession
        if (['SIGNED_IN', 'SIGNED_OUT'].includes(event) && (nextSession?.user && !nextSession.user.is_anonymous ? nextSession.user.id : null) !== initialUser) queueMicrotask(() => location.reload())
      })
    } catch {
      // Không dùng dữ liệu khách thay cho dữ liệu tài khoản khi mạng/DB lỗi.
      if (authenticated) throw new Error('Chưa tải được dữ liệu tài khoản. Kiểm tra mạng hoặc tải lại trang.')
      signIn.disabled = true
      document.querySelector('#account-note').textContent = 'Chưa kết nối được đăng nhập. Bạn có thể chơi khách trên máy này.'
    }
  })()
  signIn.addEventListener('click', async () => {
    if (!client) return
    signIn.disabled = true
    await flush()
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: baseUrl } })
    if (error) { document.querySelector('#account-note').textContent = 'Chưa đăng nhập được Google. Thử lại nhé.'; signIn.disabled = false }
  })
  signOut.addEventListener('click', async () => {
    signOut.disabled = true
    await flush()
    if (failed || conflict) { showSaveStatus('Dữ liệu chưa lưu xong. Thử lại trước khi đăng xuất.'); signOut.disabled = false; return }
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error) { showSaveStatus('Chưa đăng xuất được. Thử lại nhé.'); signOut.disabled = false }
    else location.reload()
  })
  document.querySelector('#account-guest').addEventListener('click', () => document.dispatchEvent(new Event('play-guest')))
  document.addEventListener('visibilitychange', () => { if (document.hidden) void flush() })
  window.addEventListener('pagehide', () => { void flush() })
  return {
    ready, configured, flush,
    get authenticated() { return authenticated },
    get canLeave() { return !authenticated || (!failed && !conflict && generation === savedGeneration) },
    get userId() { return authenticated ? session.user.id : null },
    get initialData() { return authenticated ? profile.progression : undefined },
    get playerName() { return authenticated ? profile.display_name : null },
    saveProgress(data) { if (authenticated) { profile.progression = data; dirty() } },
    saveName(name) { if (authenticated && name !== profile.display_name) { profile.display_name = name; dirty() } },
    recordRoomStats(phaseId, player) {
      if (!authenticated || !phaseId || !player) return
      const current = { sessionId: phaseId, kills: player.totalKnockouts || 0, deaths: player.deaths || 0, damage: player.totalDamage || 0 }
      const previous = profile.last_room?.sessionId === phaseId ? profile.last_room : { kills: 0, deaths: 0, damage: 0 }
      const kills = Math.max(0, current.kills - previous.kills), deaths = Math.max(0, current.deaths - previous.deaths), damage = Math.max(0, current.damage - previous.damage)
      if (kills || deaths || damage) {
        profile.kills += kills; profile.deaths += deaths; profile.damage += damage
        profile.last_room = current
        dirty()
      }
    },
    async getRealtimeClient() {
      await ready
      if (!client) throw new Error('Chưa cấu hình Supabase')
      if (!session) {
        const { data, error } = await client.auth.signInAnonymously()
        if (error) throw new Error('Chưa bật chơi khách online trên Supabase')
        session = data.session
      }
      await client.realtime.setAuth()
      return client
    },
    async getTop() {
      await ready
      if (!client) return []
      const { data, error } = await client.rpc('get_game_top').abortSignal(AbortSignal.timeout(10000))
      if (error) throw error
      return data || []
    },
  }
}

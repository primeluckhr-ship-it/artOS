import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Clan { id: string; name: string; description: string; color: string; icon: string; is_open: boolean; member_count: number; i_am_member?: boolean }
interface Post { id: string; clan_id: string; caption: string; mission_title: string; image_url: string; created_at: string; author_name: string; reactions: Record<string, number>; my_reaction?: string }
interface Challenge { id: string; clan_id: string; title: string; description: string; domain: string; ends_at: string; xp_reward: number; submission_count: number; created_at: string; i_submitted?: boolean }

const REACTIONS = [{ key:'fire',label:'🔥'},{ key:'love',label:'❤️'},{ key:'wow',label:'😮'},{ key:'clap',label:'👏'},{ key:'mind_blown',label:'🤯'}]

const DOM_COLOR: Record<string, string> = {
  elements_of_art:'#1ECBE1', principles_of_design:'#4ade80', drawing:'#f9a8d4',
  painting:'#FF6B35', colour_theory:'#FFE135', mixed_media:'#a78bfa', art_history:'#fb923c',
}
const DOM_LABEL: Record<string, string> = {
  elements_of_art:'Elements', principles_of_design:'Design', drawing:'Drawing',
  painting:'Painting', colour_theory:'Colour', mixed_media:'Mixed Media', art_history:'History',
}

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  if (d > 0) return `${d}d left`
  return `${h}h left`
}

export default function ClansView({ profile }: { profile: Profile }) {
  const [clans, setClans]           = useState<Clan[]>([])
  const [posts, setPosts]           = useState<Post[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeClan, setActiveClan] = useState<Clan | null>(null)
  const [showCreateClan, setShowClan]   = useState(false)
  const [showPost, setShowPost]         = useState(false)
  const [showChallenge, setShowChallenge] = useState(false)
  const [showSubmit, setShowSubmit]     = useState<Challenge | null>(null)
  const [newClan, setNewClan]           = useState({ name:'', description:'', color:'#FF6B35' })
  const [newPost, setNewPost]           = useState({ caption:'', mission_title:'', image_url:'' })
  const [newChall, setNewChall]         = useState({ title:'', description:'', domain:'drawing', xp_reward:75, days:7 })
  const [submitNote, setSubmitNote]     = useState('')
  const [submitImg, setSubmitImg]       = useState('')
  const [loading, setLoading]           = useState(true)

  const isTeacher = profile.role !== 'student'

  useEffect(() => { load() }, [profile])

  async function load() {
    setLoading(true)
    const [{ data: cData }, { data: mData }, { data: pData }, { data: chData }, { data: subData }] = await Promise.all([
      supabase.from('clans').select('*').eq('school_id', profile.school_id).order('created_at'),
      supabase.from('clan_members').select('clan_id').eq('profile_id', profile.id),
      supabase.from('clan_posts').select('*, profiles(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('clan_challenges').select('*').gte('ends_at', new Date(Date.now() - 86400000).toISOString()).order('created_at', { ascending: false }),
      supabase.from('clan_challenge_submissions').select('challenge_id').eq('student_id', profile.id),
    ])

    const myClans = new Set((mData||[]).map((m:any) => m.clan_id))
    const mySubs  = new Set((subData||[]).map((s:any) => s.challenge_id))

    setClans((cData||[]).map((c:any) => ({ ...c, i_am_member: myClans.has(c.id) })))
    setChallenges((chData||[]).map((c:any) => ({ ...c, i_submitted: mySubs.has(c.id) })))

    const { data: rx } = await supabase.from('clan_reactions').select('post_id, reaction, profile_id')
    const rxMap: Record<string,Record<string,number>> = {}
    const myRx: Record<string,string> = {}
    for (const r of rx||[]) {
      if (!rxMap[r.post_id]) rxMap[r.post_id] = {}
      rxMap[r.post_id][r.reaction] = (rxMap[r.post_id][r.reaction]||0)+1
      if (r.profile_id === profile.id) myRx[r.post_id] = r.reaction
    }
    setPosts((pData||[]).map((p:any) => ({ ...p, author_name: p.profiles?.name||'Artist', reactions: rxMap[p.id]||{}, my_reaction: myRx[p.id] })))
    setLoading(false)
  }

  async function join(clan: Clan) {
    await supabase.from('clan_members').insert({ clan_id: clan.id, profile_id: profile.id })
    await supabase.from('clans').update({ member_count: (clan.member_count||1)+1 }).eq('id', clan.id)
    load()
  }
  async function leave(clan: Clan) {
    await supabase.from('clan_members').delete().eq('clan_id', clan.id).eq('profile_id', profile.id)
    load()
  }

  async function createClan() {
    if (!newClan.name.trim()) return
    const { data } = await supabase.from('clans').insert({ ...newClan, school_id: profile.school_id, created_by: profile.id }).select().single()
    if (data) await supabase.from('clan_members').insert({ clan_id: data.id, profile_id: profile.id, role: 'leader' })
    setShowClan(false); setNewClan({ name:'', description:'', color:'#FF6B35' }); load()
  }

  async function sharePost() {
    if (!activeClan || !newPost.caption.trim()) return
    await supabase.from('clan_posts').insert({ clan_id: activeClan.id, author_id: profile.id, ...newPost })
    setShowPost(false); setNewPost({ caption:'', mission_title:'', image_url:'' }); load()
  }

  async function createChallenge() {
    if (!activeClan || !newChall.title.trim()) return
    const endsAt = new Date(Date.now() + newChall.days * 86400000).toISOString()
    await supabase.from('clan_challenges').insert({ clan_id: activeClan.id, created_by: profile.id, title: newChall.title, description: newChall.description, domain: newChall.domain, ends_at: endsAt, xp_reward: newChall.xp_reward })
    setShowChallenge(false); setNewChall({ title:'', description:'', domain:'drawing', xp_reward:75, days:7 }); load()
  }

  async function submitChallenge(challenge: Challenge) {
    // Create a clan post for the submission, then record submission
    const myClan = clans.find(c => c.id === challenge.clan_id)
    let postId: string | null = null
    if (submitImg || submitNote) {
      const { data: post } = await supabase.from('clan_posts').insert({
        clan_id: challenge.clan_id, author_id: profile.id,
        caption: submitNote || `Submitting to: ${challenge.title}`,
        mission_title: `Challenge: ${challenge.title}`,
        image_url: submitImg,
      }).select().single()
      postId = post?.id || null
    }
    await supabase.from('clan_challenge_submissions').upsert({ challenge_id: challenge.id, student_id: profile.id, post_id: postId, note: submitNote })
    await supabase.from('clan_challenges').update({ submission_count: (challenge.submission_count||0)+1 }).eq('id', challenge.id)
    setShowSubmit(null); setSubmitNote(''); setSubmitImg(''); load()
  }

  async function react(post: Post, reaction: string) {
    if (post.my_reaction === reaction) {
      await supabase.from('clan_reactions').delete().eq('post_id', post.id).eq('profile_id', profile.id)
    } else {
      await supabase.from('clan_reactions').upsert({ post_id: post.id, profile_id: profile.id, reaction })
    }
    load()
  }

  const feedPosts       = activeClan ? posts.filter(p => p.clan_id === activeClan.id) : posts
  const feedChallenges  = activeClan ? challenges.filter(c => c.clan_id === activeClan.id) : challenges
  const myClan          = clans.find(c => c.i_am_member)
  const clanColor       = activeClan?.color || myClan?.color || '#FF6B35'

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 20px', position:'relative', zIndex:1 }}>
      <style>{`
        .clan-card:hover { transform:translateY(-3px); }
        .post-card:hover .rx-bar { opacity:1!important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ position:'relative', display:'inline-block' }}>
            <svg style={{ position:'absolute', bottom:-4, left:0, width:'100%' }} height="8" viewBox="0 0 120 8" preserveAspectRatio="none">
              <path d="M0 6 Q30 2 60 5 Q90 8 120 4" stroke="#f472b6" strokeWidth="3" fill="none" strokeLinecap="round"/>
            </svg>
            <h1 style={{ fontFamily:"'Fredoka One',sans-serif", fontSize:32, color:'#fff', margin:0, position:'relative' }}>Art Clans</h1>
          </div>
          <p style={{ color:'rgba(255,255,255,0.4)', margin:'10px 0 0', fontSize:14 }}>
            Join a creative tribe · Share work · Challenge each other
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {myClan && isTeacher && (
            <button onClick={() => { setActiveClan(myClan); setShowChallenge(true) }} style={cta('#FFE135')}>
              ⚡ New Challenge
            </button>
          )}
          {myClan && (
            <button onClick={() => { setActiveClan(myClan); setShowPost(true) }} style={cta('#FF6B35')}>
              + Share Work
            </button>
          )}
          <button onClick={() => setShowClan(true)} style={cta('#8B5CF6')}>+ Create Clan</button>
        </div>
      </div>

      {/* Clan filter strip */}
      <div style={{ display:'flex', gap:8, marginBottom:24, overflowX:'auto', paddingBottom:4 }}>
        <button onClick={() => setActiveClan(null)} style={{
          flexShrink:0, background:!activeClan?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.04)',
          border:`1px solid ${!activeClan?'rgba(255,255,255,0.3)':'rgba(255,255,255,0.08)'}`,
          color:'#fff', borderRadius:20, padding:'6px 16px', cursor:'pointer', fontSize:13, fontWeight:700,
        }}>All Clans</button>
        {clans.map(clan => (
          <button key={clan.id} onClick={() => setActiveClan(activeClan?.id===clan.id ? null : clan)} style={{
            flexShrink:0, background: activeClan?.id===clan.id ? clan.color+'25' : 'rgba(255,255,255,0.04)',
            border:`1px solid ${activeClan?.id===clan.id ? clan.color : 'rgba(255,255,255,0.08)'}`,
            color: activeClan?.id===clan.id ? clan.color : 'rgba(255,255,255,0.55)',
            borderRadius:20, padding:'6px 16px', cursor:'pointer', fontSize:13, fontWeight:700,
            display:'flex', alignItems:'center', gap:6,
          }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:clan.color, display:'inline-block' }}/>
            {clan.name}
            {clan.i_am_member && <span style={{ fontSize:10, opacity:0.5 }}>· member</span>}
          </button>
        ))}
      </div>

      {/* Clan cards (all view) */}
      {!activeClan && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:14, marginBottom:32 }}>
          {clans.map(clan => (
            <div key={clan.id} className="clan-card" style={{ background:`linear-gradient(135deg,${clan.color}15,rgba(0,0,0,0))`, border:`1px solid ${clan.color}35`, borderRadius:20, padding:20, transition:'all 0.2s', position:'relative', overflow:'hidden' }}>
              {/* BG blob */}
              <svg style={{ position:'absolute', right:-20, top:-20, opacity:0.06 }} width="140" height="140" viewBox="0 0 140 140">
                <path d="M70 10 Q110 20 130 60 Q150 100 110 120 Q70 140 40 120 Q10 100 10 60 Q10 20 70 10Z" fill={clan.color}/>
              </svg>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, position:'relative' }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:clan.color+'25', border:`2px solid ${clan.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🎨</div>
                <div>
                  <div style={{ fontWeight:700, color:'#fff', fontSize:15 }}>{clan.name}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{clan.member_count||1} member{(clan.member_count||1)!==1?'s':''}</div>
                </div>
              </div>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, lineHeight:1.5, margin:'0 0 14px', position:'relative' }}>{clan.description}</p>
              <div style={{ display:'flex', gap:8, position:'relative' }}>
                <button onClick={() => clan.i_am_member ? leave(clan) : join(clan)} style={{ background: clan.i_am_member?'rgba(255,255,255,0.06)':clan.color+'25', border:`1px solid ${clan.i_am_member?'rgba(255,255,255,0.1)':clan.color}`, color: clan.i_am_member?'rgba(255,255,255,0.4)':clan.color, borderRadius:10, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  {clan.i_am_member ? 'Leave' : 'Join Clan'}
                </button>
                <button onClick={() => setActiveClan(clan)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:10, padding:'7px 14px', cursor:'pointer', fontSize:13 }}>
                  View Feed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active challenges — prominent at top */}
      {feedChallenges.length > 0 && (
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5, color:'#FFE135', marginBottom:12 }}>
            ⚡ Active Challenges
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:12 }}>
            {feedChallenges.map(ch => {
              const clan = clans.find(c => c.id === ch.clan_id)
              const dc = DOM_COLOR[ch.domain] || '#fff'
              const dl = daysLeft(ch.ends_at)
              const ended = dl === 'Ended'
              return (
                <div key={ch.id} style={{ background:'rgba(255,215,0,0.06)', border:`1.5px solid ${ch.i_submitted?'rgba(74,222,128,0.4)':'rgba(255,215,0,0.2)'}`, borderRadius:16, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
                  {/* Domain streak */}
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:4, background:dc }}/>
                  {ch.i_submitted && (
                    <div style={{ position:'absolute', top:10, right:10, background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.4)', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#4ade80' }}>✓ Submitted</div>
                  )}
                  <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:dc, marginBottom:4 }}>
                    {DOM_LABEL[ch.domain]||ch.domain} · {clan?.name}
                  </div>
                  <div style={{ fontWeight:700, fontSize:15, color:'#fff', marginBottom:6, lineHeight:1.3 }}>{ch.title}</div>
                  {ch.description && <p style={{ color:'rgba(255,255,255,0.55)', fontSize:12, lineHeight:1.5, margin:'0 0 12px' }}>{ch.description}</p>}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:12, color: ended?'rgba(255,255,255,0.3)':'#FFE135', fontWeight:700 }}>{dl}</span>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>{ch.submission_count} submissions</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'#FFE135', fontWeight:700 }}>+{ch.xp_reward} XP</span>
                      {!ch.i_submitted && !ended && (
                        <button onClick={() => setShowSubmit(ch)} style={{ background:'rgba(255,215,0,0.15)', border:'1px solid rgba(255,215,0,0.3)', color:'#FFE135', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Feed header when clan selected */}
      {activeClan && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:activeClan.color }}/>
            <span style={{ color:activeClan.color, fontWeight:700, fontSize:16 }}>{activeClan.name}</span>
            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>· {feedPosts.length} posts</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {isTeacher && (
              <button onClick={() => setShowChallenge(true)} style={cta('#FFE135')}>⚡ Challenge</button>
            )}
            {activeClan.i_am_member
              ? <button onClick={() => setShowPost(true)} style={cta(activeClan.color)}>+ Share</button>
              : <button onClick={() => join(activeClan)} style={cta(activeClan.color)}>Join to Post</button>
            }
          </div>
        </div>
      )}

      {/* Post feed */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.3)', fontFamily:"'Fredoka One',sans-serif", fontSize:18 }}>Loading feed...</div>
      ) : feedPosts.length === 0 ? (
        <div style={{ textAlign:'center', padding:60 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🎨</div>
          <p style={{ color:'rgba(255,255,255,0.3)', fontFamily:"'Fredoka One',sans-serif", fontSize:18, margin:'0 0 8px' }}>No work shared yet</p>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:13 }}>Be the first to share something in this clan</p>
        </div>
      ) : (
        <div style={{ columns:'3 260px', gap:14 }}>
          {feedPosts.map(post => {
            const clan = clans.find(c => c.id === post.clan_id)
            const isChallenge = post.mission_title?.startsWith('Challenge:')
            return (
              <div key={post.id} className="post-card" style={{ breakInside:'avoid', marginBottom:14, background:'rgba(255,255,255,0.04)', borderRadius:16, overflow:'hidden', border:`1px solid ${isChallenge?'rgba(255,215,0,0.2)':'rgba(255,255,255,0.07)'}`, position:'relative' }}>
                {isChallenge && <div style={{ position:'absolute', top:8, left:8, background:'rgba(255,215,0,0.2)', border:'1px solid rgba(255,215,0,0.4)', borderRadius:20, padding:'2px 8px', fontSize:9, fontWeight:800, color:'#FFE135', textTransform:'uppercase', letterSpacing:1, zIndex:2 }}>Challenge</div>}
                {post.image_url && (
                  <img src={post.image_url} alt="" style={{ width:'100%', display:'block', objectFit:'cover', maxHeight:280 }}
                    onError={e=>(e.currentTarget.style.display='none')}/>
                )}
                <div style={{ padding:'12px 14px' }}>
                  {post.mission_title && <div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:clan?.color||'#FF6B35', marginBottom:4 }}>{post.mission_title}</div>}
                  <p style={{ color:'rgba(255,255,255,0.8)', fontSize:13, lineHeight:1.5, margin:'0 0 8px' }}>{post.caption}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{post.author_name}</span>
                    <span style={{ fontSize:10, color:clan?.color, fontWeight:600 }}>{clan?.name}</span>
                  </div>
                </div>
                {/* Reactions */}
                <div className="rx-bar" style={{ display:'flex', gap:4, padding:'8px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap', opacity:0, transition:'opacity 0.2s' }}>
                  {REACTIONS.map(r => {
                    const count = post.reactions[r.key]||0
                    const isMe  = post.my_reaction===r.key
                    return (
                      <button key={r.key} onClick={() => react(post, r.key)} style={{ background: isMe?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.04)', border:`1px solid ${isMe?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.07)'}`, borderRadius:20, padding:'3px 8px', cursor:'pointer', fontSize:12, color: count>0?'#fff':'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', gap:3 }}>
                        {r.label}{count>0&&<span style={{ fontSize:11 }}>{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────────────────────── */}

      {showCreateClan && (
        <Modal title="Create a Clan" onClose={() => setShowClan(false)}>
          <F label="Clan Name"><input value={newClan.name} onChange={e=>setNewClan(p=>({...p,name:e.target.value}))} placeholder="The Ink Collective" style={inp}/></F>
          <F label="Description"><textarea value={newClan.description} onChange={e=>setNewClan(p=>({...p,description:e.target.value}))} rows={3} style={{...inp,resize:'vertical'}}/></F>
          <F label="Colour">
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['#FF6B35','#1ECBE1','#8B5CF6','#FFE135','#4ade80','#f472b6','#fb923c'].map(c=>(
                <button key={c} onClick={()=>setNewClan(p=>({...p,color:c}))} style={{ width:32, height:32, borderRadius:'50%', background:c, border:`3px solid ${newClan.color===c?'#fff':'transparent'}`, cursor:'pointer' }}/>
              ))}
            </div>
          </F>
          <PrimaryBtn color={newClan.color} onClick={createClan}>Create Clan</PrimaryBtn>
        </Modal>
      )}

      {showPost && activeClan && (
        <Modal title={`Share to ${activeClan.name}`} onClose={() => setShowPost(false)}>
          <F label="Mission / Project"><input value={newPost.mission_title} onChange={e=>setNewPost(p=>({...p,mission_title:e.target.value}))} placeholder="e.g. Light Study — Wet on Wet" style={inp}/></F>
          <F label="What did you make? What did you learn?"><textarea value={newPost.caption} onChange={e=>setNewPost(p=>({...p,caption:e.target.value}))} rows={4} style={{...inp,resize:'vertical'}}/></F>
          <F label="Image URL (optional)">
            <input value={newPost.image_url} onChange={e=>setNewPost(p=>({...p,image_url:e.target.value}))} placeholder="https://..." style={inp}/>
            {newPost.image_url&&<img src={newPost.image_url} style={{ width:'100%', borderRadius:10, marginTop:8, maxHeight:160, objectFit:'cover' }} onError={e=>(e.currentTarget.style.display='none')}/>}
          </F>
          <PrimaryBtn color={activeClan.color} onClick={sharePost}>Share to Clan</PrimaryBtn>
        </Modal>
      )}

      {showChallenge && activeClan && (
        <Modal title={`Create Challenge — ${activeClan.name}`} onClose={() => setShowChallenge(false)}>
          <F label="Challenge Title"><input value={newChall.title} onChange={e=>setNewChall(p=>({...p,title:e.target.value}))} placeholder="e.g. Blind Contour Portraits" style={inp}/></F>
          <F label="Description"><textarea value={newChall.description} onChange={e=>setNewChall(p=>({...p,description:e.target.value}))} placeholder="What must students create? Any constraints?" rows={3} style={{...inp,resize:'vertical'}}/></F>
          <F label="Domain">
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {Object.entries(DOM_LABEL).map(([k,v])=>(
                <button key={k} onClick={()=>setNewChall(p=>({...p,domain:k}))} style={{ background:newChall.domain===k?DOM_COLOR[k]+'25':'rgba(255,255,255,0.04)', border:`1px solid ${newChall.domain===k?DOM_COLOR[k]:'rgba(255,255,255,0.08)'}`, color:newChall.domain===k?DOM_COLOR[k]:'rgba(255,255,255,0.4)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontSize:11, fontWeight:700 }}>{v}</button>
              ))}
            </div>
          </F>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <F label="Duration (days)">
              <input type="number" value={newChall.days} min={1} max={30} onChange={e=>setNewChall(p=>({...p,days:+e.target.value}))} style={inp}/>
            </F>
            <F label="XP Reward">
              <input type="number" value={newChall.xp_reward} min={25} max={500} step={25} onChange={e=>setNewChall(p=>({...p,xp_reward:+e.target.value}))} style={inp}/>
            </F>
          </div>
          <div style={{ background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'rgba(255,215,0,0.7)' }}>
            Challenge ends: {new Date(Date.now()+newChall.days*86400000).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · {newChall.xp_reward} XP reward
          </div>
          <PrimaryBtn color="#FFE135" onClick={createChallenge}>Launch Challenge</PrimaryBtn>
        </Modal>
      )}

      {showSubmit && (
        <Modal title={`Submit to: ${showSubmit.title}`} onClose={() => setShowSubmit(null)}>
          <div style={{ background:'rgba(255,215,0,0.06)', border:'1px solid rgba(255,215,0,0.15)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>{showSubmit.description}</div>
            <div style={{ fontSize:11, color:'#FFE135', fontWeight:700, marginTop:6 }}>+{showSubmit.xp_reward} XP on submission</div>
          </div>
          <F label="Image URL (your artwork)">
            <input value={submitImg} onChange={e=>setSubmitImg(e.target.value)} placeholder="https://..." style={inp}/>
            {submitImg&&<img src={submitImg} style={{ width:'100%', borderRadius:10, marginTop:8, maxHeight:180, objectFit:'cover' }} onError={e=>(e.currentTarget.style.display='none')}/>}
          </F>
          <F label="Artist note (optional)"><textarea value={submitNote} onChange={e=>setSubmitNote(e.target.value)} placeholder="What approach did you take? What did you discover?" rows={3} style={{...inp,resize:'vertical'}}/></F>
          <PrimaryBtn color="#FFE135" onClick={() => submitChallenge(showSubmit)}>Submit Work</PrimaryBtn>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(6px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'linear-gradient(145deg,#1a1040,#0d1020)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.5)', borderRadius:8, width:30, height:30, cursor:'pointer', fontSize:16 }}>×</button>
        {title&&<h3 style={{ fontFamily:"'Fredoka One',sans-serif", color:'#fff', margin:'0 0 20px', fontSize:18 }}>{title}</h3>}
        {children}
      </div>
    </div>
  )
}
function F({ label, children }: { label:string; children:React.ReactNode }) {
  return <div style={{ marginBottom:14 }}><div style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'rgba(255,255,255,0.35)', marginBottom:6 }}>{label}</div>{children}</div>
}
function PrimaryBtn({ color, onClick, children }: { color:string; onClick:()=>void; children:React.ReactNode }) {
  return <button onClick={onClick} style={{ width:'100%', padding:'13px 0', background:`linear-gradient(135deg,${color},${color}bb)`, border:'none', borderRadius:12, color:'#000', fontSize:15, fontFamily:"'Fredoka One',sans-serif", cursor:'pointer', boxShadow:`0 8px 24px ${color}40` }}>{children}</button>
}
const cta = (color: string): React.CSSProperties => ({ background:`${color}20`, border:`1px solid ${color}55`, color, borderRadius:10, padding:'8px 14px', cursor:'pointer', fontSize:12, fontWeight:700 })
const inp: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', borderRadius:10, padding:'9px 14px', fontSize:14, outline:'none', boxSizing:'border-box' }

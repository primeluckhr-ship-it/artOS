import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../App'

interface Clan {
  id: string; name: string; description: string; color: string; icon: string
  is_open: boolean; member_count: number; created_at: string
  i_am_member?: boolean
}
interface Post {
  id: string; clan_id: string; caption: string; mission_title: string
  image_url: string; created_at: string; author_name: string
  reactions: Record<string, number>; my_reaction?: string
}

const REACTIONS = [
  { key: 'fire', label: '🔥' },
  { key: 'love', label: '❤️' },
  { key: 'wow', label: '😮' },
  { key: 'clap', label: '👏' },
  { key: 'mind_blown', label: '🤯' },
]

const DOMAIN_IMAGES: Record<string, string> = {
  drawing: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=800&q=80',
  painting: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80',
  colour_theory: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=800&q=80',
  mixed_media: 'https://images.unsplash.com/photo-1582034986517-30d163aa1da9?w=800&q=80',
  art_history: 'https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?w=800&q=80',
  elements_of_art: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
  principles_of_design: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
}

export default function ClansView({ profile }: { profile: Profile }) {
  const [clans, setClans] = useState<Clan[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState<'feed' | 'clans'>('feed')
  const [selectedClan, setSelectedClan] = useState<Clan | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showPost, setShowPost] = useState(false)
  const [newPost, setNewPost] = useState({ caption: '', mission_title: '', image_url: '' })
  const [newClan, setNewClan] = useState({ name: '', description: '', color: '#FF6B35' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [profile])

  async function loadAll() {
    setLoading(true)
    const [{ data: clanData }, { data: memberData }, { data: postData }] = await Promise.all([
      supabase.from('clans').select('*').eq('school_id', profile.school_id).order('created_at'),
      supabase.from('clan_members').select('clan_id').eq('profile_id', profile.id),
      supabase.from('clan_posts').select('*, profiles(name)').order('created_at', { ascending: false }).limit(40),
    ])
    const myClans = new Set((memberData || []).map((m: any) => m.clan_id))
    setClans((clanData || []).map((c: any) => ({ ...c, i_am_member: myClans.has(c.id) })))

    const { data: reactions } = await supabase.from('clan_reactions').select('post_id, reaction, profile_id')
    const reactionMap: Record<string, Record<string, number>> = {}
    const myReactionMap: Record<string, string> = {}
    for (const r of reactions || []) {
      if (!reactionMap[r.post_id]) reactionMap[r.post_id] = {}
      reactionMap[r.post_id][r.reaction] = (reactionMap[r.post_id][r.reaction] || 0) + 1
      if (r.profile_id === profile.id) myReactionMap[r.post_id] = r.reaction
    }
    setPosts((postData || []).map((p: any) => ({
      ...p, author_name: p.profiles?.name || 'Artist',
      reactions: reactionMap[p.id] || {}, my_reaction: myReactionMap[p.id],
    })))
    setLoading(false)
  }

  async function joinClan(clan: Clan) {
    await supabase.from('clan_members').insert({ clan_id: clan.id, profile_id: profile.id })
    await supabase.from('clans').update({ member_count: (clan.member_count || 1) + 1 }).eq('id', clan.id)
    loadAll()
  }

  async function leaveClan(clan: Clan) {
    await supabase.from('clan_members').delete().eq('clan_id', clan.id).eq('profile_id', profile.id)
    loadAll()
  }

  async function createClan() {
    if (!newClan.name.trim()) return
    const { data } = await supabase.from('clans').insert({
      ...newClan, school_id: profile.school_id, created_by: profile.id
    }).select().single()
    if (data) {
      await supabase.from('clan_members').insert({ clan_id: data.id, profile_id: profile.id, role: 'leader' })
    }
    setShowCreate(false); setNewClan({ name: '', description: '', color: '#FF6B35' }); loadAll()
  }

  async function submitPost() {
    if (!selectedClan || !newPost.caption.trim()) return
    await supabase.from('clan_posts').insert({
      clan_id: selectedClan.id, author_id: profile.id,
      caption: newPost.caption, mission_title: newPost.mission_title,
      image_url: newPost.image_url || DOMAIN_IMAGES.painting,
    })
    setShowPost(false); setNewPost({ caption: '', mission_title: '', image_url: '' }); loadAll()
  }

  async function toggleReaction(post: Post, reaction: string) {
    if (post.my_reaction === reaction) {
      await supabase.from('clan_reactions').delete().eq('post_id', post.id).eq('profile_id', profile.id)
    } else {
      await supabase.from('clan_reactions').upsert({ post_id: post.id, profile_id: profile.id, reaction })
    }
    loadAll()
  }

  const feedPosts = selectedClan ? posts.filter(p => p.clan_id === selectedClan.id) : posts
  const myClan = clans.find(c => c.i_am_member)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px' }}>
      <style>{`
        .clan-card:hover { transform: translateY(-2px); }
        .post-card:hover .reaction-bar { opacity: 1; }
        .reaction-bar { opacity: 0; transition: opacity 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Fredoka One',sans-serif", fontSize: 28, color: '#fff', margin: 0 }}>Art Clans</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontSize: 14 }}>
            Join a creative tribe. Share work. Challenge each other.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {myClan && (
            <button onClick={() => { setSelectedClan(myClan); setShowPost(true) }} style={cta('#FF6B35')}>
              + Share Work
            </button>
          )}
          <button onClick={() => setShowCreate(true)} style={cta('#8B5CF6')}>+ Create Clan</button>
        </div>
      </div>

      {/* Clan strips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, overflowX: 'auto', paddingBottom: 8 }}>
        <button onClick={() => setSelectedClan(null)} style={{
          flexShrink: 0, background: !selectedClan ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${!selectedClan ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
          color: '#fff', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 13,
        }}>All Clans</button>
        {clans.map(clan => (
          <button key={clan.id} onClick={() => setSelectedClan(selectedClan?.id === clan.id ? null : clan)} style={{
            flexShrink: 0,
            background: selectedClan?.id === clan.id ? clan.color + '30' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selectedClan?.id === clan.id ? clan.color : 'rgba(255,255,255,0.08)'}`,
            color: selectedClan?.id === clan.id ? clan.color : 'rgba(255,255,255,0.6)',
            borderRadius: 20, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: clan.color, display: 'inline-block' }} />
            {clan.name}
            {clan.i_am_member && <span style={{ fontSize: 10, opacity: 0.6 }}>· member</span>}
          </button>
        ))}
      </div>

      {/* Clan cards row (when viewing all) */}
      {!selectedClan && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 32 }}>
          {clans.map(clan => (
            <div key={clan.id} className="clan-card" style={{
              background: `linear-gradient(135deg, ${clan.color}18, rgba(0,0,0,0))`,
              border: `1px solid ${clan.color}40`,
              borderRadius: 20, padding: 20, transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
            }}>
              {/* Paint splash bg */}
              <svg style={{ position: 'absolute', right: -20, top: -20, opacity: 0.07 }} width="140" height="140" viewBox="0 0 140 140">
                <path d="M70 10 Q110 20 130 60 Q150 100 110 120 Q70 140 40 120 Q10 100 10 60 Q10 20 70 10Z" fill={clan.color} />
              </svg>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: clan.color + '30', border: `2px solid ${clan.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  🎨
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 15 }}>{clan.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{clan.member_count || 1} member{clan.member_count !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px', position: 'relative' }}>
                {clan.description}
              </p>
              <button onClick={() => clan.i_am_member ? leaveClan(clan) : joinClan(clan)} style={{
                background: clan.i_am_member ? 'rgba(255,255,255,0.06)' : clan.color + '30',
                border: `1px solid ${clan.i_am_member ? 'rgba(255,255,255,0.1)' : clan.color}`,
                color: clan.i_am_member ? 'rgba(255,255,255,0.4)' : clan.color,
                borderRadius: 10, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                position: 'relative',
              }}>
                {clan.i_am_member ? 'Leave Clan' : 'Join Clan'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Post header when clan selected */}
      {selectedClan && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedClan.color }} />
            <span style={{ color: selectedClan.color, fontWeight: 700, fontSize: 16 }}>{selectedClan.name}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>· {feedPosts.length} works shared</span>
          </div>
          {selectedClan.i_am_member && (
            <button onClick={() => setShowPost(true)} style={cta(selectedClan.color)}>+ Share Work</button>
          )}
          {!selectedClan.i_am_member && (
            <button onClick={() => joinClan(selectedClan)} style={cta(selectedClan.color)}>Join to Post</button>
          )}
        </div>
      )}

      {/* Pinterest-style post grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 60 }}>Loading clan feed...</div>
      ) : feedPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Fredoka One',sans-serif", fontSize: 18 }}>No works shared yet</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>Be the first to share something</p>
        </div>
      ) : (
        <div style={{ columns: '3 280px', gap: 14 }}>
          {feedPosts.map(post => {
            const clan = clans.find(c => c.id === post.clan_id)
            return (
              <div key={post.id} className="post-card" style={{
                breakInside: 'avoid', marginBottom: 14, position: 'relative',
                background: 'rgba(255,255,255,0.04)', borderRadius: 16, overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                {/* Artwork image */}
                {post.image_url && (
                  <img src={post.image_url} alt={post.caption}
                    style={{ width: '100%', display: 'block', objectFit: 'cover', maxHeight: 300 }} />
                )}
                {/* Content */}
                <div style={{ padding: '12px 14px' }}>
                  {post.mission_title && (
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: clan?.color || '#FF6B35', marginBottom: 4 }}>
                      {post.mission_title}
                    </div>
                  )}
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 1.5, margin: '0 0 10px' }}>
                    {post.caption}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{post.author_name}</span>
                    {clan && (
                      <span style={{ fontSize: 10, color: clan.color, fontWeight: 600 }}>
                        {clan.name}
                      </span>
                    )}
                  </div>
                </div>
                {/* Reaction bar */}
                <div className="reaction-bar" style={{ display: 'flex', gap: 4, padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                  {REACTIONS.map(r => {
                    const count = post.reactions[r.key] || 0
                    const isMe = post.my_reaction === r.key
                    return (
                      <button key={r.key} onClick={() => toggleReaction(post, r.key)} style={{
                        background: isMe ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 20, padding: '3px 8px', cursor: 'pointer', fontSize: 12,
                        color: count > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        {r.label} {count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create clan modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Create a Clan">
          <label style={labelStyle}>Clan Name</label>
          <input value={newClan.name} onChange={e => setNewClan(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. The Ink Collective" style={inputStyle} />
          <label style={labelStyle}>Description</label>
          <textarea value={newClan.description} onChange={e => setNewClan(p => ({ ...p, description: e.target.value }))}
            placeholder="What is this clan about?" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          <label style={labelStyle}>Clan Colour</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {['#FF6B35','#1ECBE1','#8B5CF6','#FFE135','#4ade80','#f472b6','#fb923c'].map(c => (
              <button key={c} onClick={() => setNewClan(p => ({ ...p, color: c }))} style={{
                width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${newClan.color === c ? '#fff' : 'transparent'}`, cursor: 'pointer',
              }} />
            ))}
          </div>
          <button onClick={createClan} style={{ ...cta(newClan.color), width: '100%', justifyContent: 'center' }}>
            Create Clan
          </button>
        </Modal>
      )}

      {/* Share work modal */}
      {showPost && selectedClan && (
        <Modal onClose={() => setShowPost(false)} title={`Share to ${selectedClan.name}`}>
          <label style={labelStyle}>Mission / Project Title</label>
          <input value={newPost.mission_title} onChange={e => setNewPost(p => ({ ...p, mission_title: e.target.value }))}
            placeholder="e.g. Light Study — Wet on Wet" style={inputStyle} />
          <label style={labelStyle}>What did you make? What did you learn?</label>
          <textarea value={newPost.caption} onChange={e => setNewPost(p => ({ ...p, caption: e.target.value }))}
            placeholder="Share your process, what worked, what surprised you..." rows={4}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <label style={labelStyle}>Image URL (optional — paste a link to your artwork)</label>
          <input value={newPost.image_url} onChange={e => setNewPost(p => ({ ...p, image_url: e.target.value }))}
            placeholder="https://..." style={inputStyle} />
          {newPost.image_url && (
            <img src={newPost.image_url} alt="preview" style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 180, marginBottom: 12 }} onError={e => (e.currentTarget.style.display = 'none')} />
          )}
          <button onClick={submitPost} style={{ ...cta(selectedClan.color), width: '100%', justifyContent: 'center' }}>
            Share to Clan
          </button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(145deg,#1a1040,#0d1020)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.5)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16 }}>×</button>
        <h3 style={{ fontFamily: "'Fredoka One',sans-serif", color: '#fff', margin: '0 0 20px', fontSize: 18 }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

const cta = (color: string): React.CSSProperties => ({
  background: color + '25', border: `1px solid ${color}60`, color,
  borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
  fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
})
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }

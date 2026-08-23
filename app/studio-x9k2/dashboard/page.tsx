'use client';

import { useState, useEffect, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Painting {
  id: string;
  title: string;
  series: string;
  dimensions: string;
  medium: string;
  price: string;
  status: string;
  year: string;
  images: string;
  description: string;
  additionalInfo: string;
}

const EMPTY_PAINTING: Painting = {
  id: '', title: '', series: '', dimensions: '',
  medium: '', price: '', status: 'available',
  year: new Date().getFullYear().toString(),
  images: '', description: '', additionalInfo: '',
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: '#0d0d0d',
    color: '#e8e8e8',
    fontFamily: "'Jost', 'Inter', sans-serif",
  } as React.CSSProperties,

  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 2rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
    position: 'sticky', top: 0, zIndex: 100,
  } as React.CSSProperties,

  brandMark: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    color: '#c9a84c', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '0.15em',
  } as React.CSSProperties,

  content: { padding: '2rem', maxWidth: '1300px', margin: '0 auto' } as React.CSSProperties,

  tabRow: {
    display: 'flex', gap: '0.5rem', marginBottom: '2rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0',
  } as React.CSSProperties,

  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '1.5rem',
  } as React.CSSProperties,

  input: {
    width: '100%', padding: '0.7rem 0.9rem',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', color: '#fff',
    fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  label: {
    display: 'block', color: '#999',
    fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '0.4rem',
  } as React.CSSProperties,

  btnGold: {
    padding: '0.65rem 1.4rem',
    background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
    border: 'none', borderRadius: '8px',
    color: '#fff', fontWeight: 500, fontSize: '0.88rem',
    cursor: 'pointer', letterSpacing: '0.05em',
  } as React.CSSProperties,

  btnGhost: {
    padding: '0.6rem 1.2rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#ccc', fontSize: '0.88rem', cursor: 'pointer',
  } as React.CSSProperties,

  btnDanger: {
    padding: '0.4rem 0.8rem',
    background: 'rgba(220,38,38,0.15)',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: '6px',
    color: '#fca5a5', fontSize: '0.78rem', cursor: 'pointer',
  } as React.CSSProperties,

  btnEdit: {
    padding: '0.4rem 0.8rem',
    background: 'rgba(201,168,76,0.15)',
    border: '1px solid rgba(201,168,76,0.3)',
    borderRadius: '6px',
    color: '#e8c96a', fontSize: '0.78rem', cursor: 'pointer',
  } as React.CSSProperties,

  toast: (type: 'success' | 'error') => ({
    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
    background: type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)',
    border: `1px solid ${type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'}`,
    borderRadius: '10px', padding: '0.9rem 1.4rem',
    color: type === 'success' ? '#86efac' : '#fca5a5',
    fontSize: '0.9rem', maxWidth: '320px',
    backdropFilter: 'blur(12px)',
    animation: 'fadeIn 0.3s ease',
  } as React.CSSProperties),
};

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={S.toast(type)} onClick={onClose}>
      {type === 'success' ? '✓ ' : '✗ '}{msg}
    </div>
  );
}

// ─── Image Dropzone ───────────────────────────────────────────────────────────

function ImageDropzone({ onUploaded }: { onUploaded: (filename: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File): Promise<boolean> {
    try {
      const fd = new FormData();
      fd.append('file', file);
      const savedToken = localStorage.getItem('ra_gh_token') || '';
      const headers: Record<string, string> = {};
      if (savedToken) headers['x-github-token'] = savedToken;

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd, headers });
      const data = await res.json();
      if (data.success) {
        setUploadedFiles(prev => [...prev, data.filename]);
        onUploaded(data.filename);
        return true;
      } else {
        alert(`${file.name}: ${data.error || 'Upload failed'}`);
        return false;
      }
    } catch (err) {
      alert(`${file.name}: Failed to upload file`);
      return false;
    }
  }

  // Uploaded one at a time (not in parallel) — concurrent writes to the
  // GitHub repo from several uploads at once can race each other and silently
  // drop one, which previously produced a broken image reference.
  async function uploadFiles(files: File[]) {
    setUploading(true);
    try {
      for (const file of files) {
        await uploadFile(file);
      }
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      uploadFiles(Array.from(e.target.files));
    }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#c9a84c' : 'rgba(201,168,76,0.3)'}`,
          borderRadius: '10px',
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: dragging ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.02)',
          color: '#aaa',
          fontSize: '0.9rem',
        }}
      >
        {uploading ? (
          <span style={{ color: '#c9a84c' }}>Uploading & converting image...</span>
        ) : (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
            <div>Drop images here or <span style={{ color: '#c9a84c', fontWeight: 600 }}>click to browse</span></div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.4rem', color: '#666' }}>Supports JPG, PNG, HEIC</div>
          </>
        )}
      </div>
      <input 
        ref={fileRef} 
        type="file" 
        accept="image/*,.heic,.heif" 
        multiple 
        style={{ display: 'none' }} 
        onChange={onFileChange} 
      />
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {uploadedFiles.map(f => (
            <span key={f} style={{
              background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: '#e8c96a',
              display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              ✓ {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Painting Form ────────────────────────────────────────────────────────────

function PaintingForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: Painting;
  onSave: (p: Painting) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Painting>(initial);

  function set(field: keyof Painting, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  function addImageToForm(filename: string) {
    setForm(prev => ({
      ...prev,
      images: prev.images
        ? prev.images + ', ' + filename
        : filename,
    }));
  }

  function getImageList(): string[] {
    return form.images.split(',').map(s => s.trim()).filter(Boolean);
  }

  function setImageList(list: string[]) {
    set('images', list.join(', '));
  }

  function removeImageAt(idx: number) {
    const list = getImageList();
    list.splice(idx, 1);
    setImageList(list);
  }

  function moveImage(idx: number, dir: -1 | 1) {
    const list = getImageList();
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target], list[idx]];
    setImageList(list);
  }

  const grid2: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={grid2}>
        <div>
          <label style={S.label}>PAINTING ID (slug)</label>
          <input style={S.input} value={form.id} onChange={e => set('id', e.target.value)} placeholder="my-painting-slug" />
        </div>
        <div>
          <label style={S.label}>TITLE</label>
          <input style={S.input} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Painting Title" />
        </div>
      </div>
      <div style={grid2}>
        <div>
          <label style={S.label}>SERIES</label>
          <input style={S.input} value={form.series} onChange={e => set('series', e.target.value)} placeholder="Attachment / Rage / Ink on paper…" />
        </div>
        <div>
          <label style={S.label}>YEAR</label>
          <input style={S.input} value={form.year} onChange={e => set('year', e.target.value)} placeholder="2026" />
        </div>
      </div>
      <div style={grid2}>
        <div>
          <label style={S.label}>DIMENSIONS</label>
          <input style={S.input} value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder='24" x 36"' />
        </div>
        <div>
          <label style={S.label}>MEDIUM</label>
          <input style={S.input} value={form.medium} onChange={e => set('medium', e.target.value)} placeholder="Oil on canvas" />
        </div>
      </div>
      <div style={grid2}>
        <div>
          <label style={S.label}>PRICE (USD)</label>
          <input style={S.input} value={form.price} onChange={e => set('price', e.target.value)} placeholder="1200" />
        </div>
        <div>
          <label style={S.label}>STATUS</label>
          <select
            style={{ ...S.input, appearance: 'none' }}
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
      </div>
      <div>
        <label style={S.label}>DESCRIPTION</label>
        <textarea
          style={{ ...S.input, minHeight: '100px', resize: 'vertical' }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Deep description of the artwork..."
        />
      </div>
      <div>
        <label style={S.label}>ADDITIONAL INFO (framing, edition, etc.)</label>
        <textarea
          style={{ ...S.input, minHeight: '80px', resize: 'vertical' }}
          value={form.additionalInfo}
          onChange={e => set('additionalInfo', e.target.value)}
          placeholder="Edition: Original (1/1)&#10;Framing: Unframed..."
        />
      </div>
      <div>
        <label style={S.label}>IMAGES (filenames or URLs, comma-separated)</label>
        <input
          style={S.input}
          value={form.images}
          onChange={e => set('images', e.target.value)}
          placeholder="painting1.jpg, painting2.jpg"
        />
        {/* Thumbnail preview list, with reorder / remove controls */}
        {form.images && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
            {getImageList().map((img, idx, arr) => {
              const src = img.startsWith('http') ? img : `/images/${img}`;
              return (
                <div key={idx} style={{ position: 'relative', width: '84px' }}>
                  <div style={{ position: 'relative', width: '84px', height: '84px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {idx === 0 && (
                      <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(201,168,76,0.9)', color: '#000', fontSize: '0.6rem', textAlign: 'center', fontWeight: 'bold', padding: '1px 0' }}>MAIN</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImageAt(idx)}
                      title="Remove image"
                      style={{
                        position: 'absolute', top: '3px', right: '3px', width: '20px', height: '20px',
                        borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fca5a5',
                        fontSize: '0.75rem', lineHeight: '20px', textAlign: 'center', cursor: 'pointer', padding: 0,
                      }}
                    >×</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                    <button
                      type="button"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      title="Move earlier"
                      style={{ ...S.btnGhost, padding: '0.15rem 0.5rem', fontSize: '0.7rem', opacity: idx === 0 ? 0.3 : 1 }}
                    >◀</button>
                    <button
                      type="button"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === arr.length - 1}
                      title="Move later"
                      style={{ ...S.btnGhost, padding: '0.15rem 0.5rem', fontSize: '0.7rem', opacity: idx === arr.length - 1 ? 0.3 : 1 }}
                    >▶</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: '0.75rem' }}>
          <label style={S.label}>UPLOAD IMAGES</label>
          <ImageDropzone onUploaded={addImageToForm} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
        <button style={S.btnGhost} onClick={onCancel}>Cancel</button>
        <button style={S.btnGold} onClick={() => onSave(form)} disabled={saving}>
          {saving ? 'Saving…' : 'Save Painting'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type Tab = 'paintings' | 'add' | 'settings';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('paintings');
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPainting, setEditPainting] = useState<Painting | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [validating, setValidating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
  }, []);

  async function loadPaintings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/paintings');
      const data = await res.json();
      setPaintings(data.paintings || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPaintings();
    const savedToken = localStorage.getItem('ra_gh_token');
    if (savedToken) setGithubToken(savedToken);
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/studio-x9k2');
  }

  async function handleSaveEdit(updated: Painting) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    try {
      const token = localStorage.getItem('ra_gh_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-github-token'] = token;

      const res = await fetch(`/api/admin/paintings/${editPainting!.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success && data.pushedToGitHub) {
        showToast('Painting updated!', 'success');
        setEditPainting(null);
        loadPaintings();
      } else if (data.success) {
        showToast('Not saved: no GitHub token configured (see GitHub Settings tab)', 'error');
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } finally {
      setSaving(false);
      inFlightRef.current = false;
    }
  }

  async function handleAddNew(p: Painting) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    try {
      const token = localStorage.getItem('ra_gh_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-github-token'] = token;

      const res = await fetch('/api/admin/paintings', {
        method: 'POST',
        headers,
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (data.success && data.pushedToGitHub) {
        showToast('Painting added!', 'success');
        setTab('paintings');
        loadPaintings();
      } else if (data.success) {
        showToast('Not saved: no GitHub token configured (see GitHub Settings tab)', 'error');
      } else {
        showToast(data.error || 'Failed to add', 'error');
      }
    } finally {
      setSaving(false);
      inFlightRef.current = false;
    }
  }

  async function handleDelete(id: string) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    try {
      const token = localStorage.getItem('ra_gh_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['x-github-token'] = token;

      const res = await fetch(`/api/admin/paintings/${id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success && data.pushedToGitHub) {
        showToast('Painting deleted', 'success');
        loadPaintings();
      } else if (data.success) {
        showToast('Not deleted: no GitHub token configured (see GitHub Settings tab)', 'error');
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
      setConfirmDelete(null);
    } finally {
      setSaving(false);
      inFlightRef.current = false;
    }
  }

  async function handleValidateToken() {
    setValidating(true);
    setTokenStatus(null);
    try {
      const res = await fetch('/api/admin/github/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken }),
      });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem('ra_gh_token', githubToken);
        setTokenStatus({ msg: `✓ Connected as ${data.username} — ${data.message}`, ok: true });
      } else {
        setTokenStatus({ msg: data.error || data.message || 'Token invalid', ok: false });
      }
    } finally {
      setValidating(false);
    }
  }

  async function handlePushToGitHub() {
    setPushing(true);
    try {
      const res = await fetch('/api/admin/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Pushed to GitHub: ${data.pushed.join(', ')}`, 'success');
      } else {
        showToast(data.error || 'Push failed', 'error');
      }
    } finally {
      setPushing(false);
    }
  }

  const filteredPaintings = paintings.filter(p =>
    [p.title, p.series, p.status, p.id].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  function tabStyle(t: Tab): React.CSSProperties {
    const active = tab === t;
    return {
      padding: '0.6rem 1.2rem',
      background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #c9a84c' : '2px solid transparent',
      color: active ? '#c9a84c' : '#777',
      fontSize: '0.88rem', letterSpacing: '0.08em',
      cursor: 'pointer', transition: 'all 0.2s',
      fontFamily: 'inherit',
    };
  }

  return (
    <div style={S.page}>
      {/* Global animation style */}
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder, textarea::placeholder { color: #555; }
        input:focus, textarea:focus, select:focus { border-color: rgba(201,168,76,0.6) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Bar */}
      <div style={S.topBar}>
        <div style={S.brandMark}>
          <span style={{ fontSize: '1.3rem' }}>🎨</span>
          <span>ReenArt Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#555', fontSize: '0.8rem' }}>Admin Portal</span>
          <button
            style={{ ...S.btnGhost, fontSize: '0.8rem', padding: '0.4rem 1rem' }}
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={S.content}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ color: '#fff', fontWeight: 300, fontSize: '1.8rem', margin: 0 }}>
            Painting Manager
          </h1>
          <p style={{ color: '#666', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
            {paintings.length} paintings in the database
          </p>
        </div>

        {/* Tabs */}
        <div style={S.tabRow}>
          <button style={tabStyle('paintings')} onClick={() => setTab('paintings')}>
            ALL PAINTINGS
          </button>
          <button style={tabStyle('add')} onClick={() => setTab('add')}>
            + ADD NEW
          </button>
          <button style={tabStyle('settings')} onClick={() => setTab('settings')}>
            ⚙ GITHUB SETTINGS
          </button>
        </div>

        {/* ─── Tab: Paintings ─── */}
        {tab === 'paintings' && (
          <div>
            {/* Search */}
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                style={{ ...S.input, maxWidth: '360px' }}
                placeholder="Search by title, series, status…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <p style={{ color: '#666' }}>Loading…</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Title', 'Series', 'Dimensions', 'Price', 'Status', 'Year', 'Actions'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '0.75rem 1rem',
                          color: '#777', fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.08em',
                          whiteSpace: 'nowrap',
                        }}>{h.toUpperCase()}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaintings.map(p => (
                      <tr key={p.id} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '0.9rem 1rem', color: '#e8e8e8', fontWeight: 400 }}>
                          {p.title}
                          <div style={{ color: '#555', fontSize: '0.72rem', marginTop: '2px' }}>{p.id}</div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: '#aaa' }}>{p.series}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#aaa' }}>{p.dimensions}</td>
                        <td style={{ padding: '0.9rem 1rem', color: '#c9a84c' }}>${p.price}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem',
                            background: p.status === 'available' ? 'rgba(34,197,94,0.15)' : p.status === 'sold' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                            color: p.status === 'available' ? '#86efac' : p.status === 'sold' ? '#fca5a5' : '#fde68a',
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: '#aaa' }}>{p.year}</td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button style={S.btnEdit} onClick={() => { setEditPainting(p); setTab('paintings'); }}>
                              Edit
                            </button>
                            <button style={S.btnDanger} onClick={() => setConfirmDelete(p.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPaintings.length === 0 && (
                  <p style={{ color: '#666', textAlign: 'center', padding: '3rem' }}>
                    No paintings found
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Add New ─── */}
        {tab === 'add' && (
          <div style={S.card}>
            <h2 style={{ color: '#fff', fontWeight: 300, marginTop: 0, marginBottom: '1.5rem' }}>
              Add New Painting
            </h2>
            <PaintingForm
              initial={EMPTY_PAINTING}
              onSave={handleAddNew}
              onCancel={() => setTab('paintings')}
              saving={saving}
            />
          </div>
        )}

        {/* ─── Tab: Settings ─── */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={S.card}>
              <h2 style={{ color: '#fff', fontWeight: 300, marginTop: 0, marginBottom: '0.5rem' }}>
                GitHub Integration
              </h2>
              <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Enter your GitHub Personal Access Token (PAT) with <code>repo</code> scope write access to{' '}
                <a href="https://github.com/dn3305/ReenArt.github.io" target="_blank" rel="noreferrer"
                  style={{ color: '#c9a84c' }}>
                  dn3305/ReenArt.github.io
                </a>. The token is saved in your browser only — never in code.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>PERSONAL ACCESS TOKEN</label>
                  <input
                    type="password"
                    style={S.input}
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <button
                  style={{ ...S.btnGhost, whiteSpace: 'nowrap', height: '40px' }}
                  onClick={handleValidateToken}
                  disabled={validating || !githubToken}
                >
                  {validating ? 'Checking…' : 'Validate Token'}
                </button>
              </div>

              {tokenStatus && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: tokenStatus.ok ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
                  border: `1px solid ${tokenStatus.ok ? 'rgba(34,197,94,0.3)' : 'rgba(220,38,38,0.3)'}`,
                  color: tokenStatus.ok ? '#86efac' : '#fca5a5',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}>
                  {tokenStatus.msg}
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <h3 style={{ color: '#ccc', fontWeight: 400, fontSize: '1rem', marginTop: 0, marginBottom: '0.5rem' }}>
                  Push to GitHub
                </h3>
                <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Every Save/Add/Delete already syncs to GitHub automatically once a token is set above &mdash; you shouldn&apos;t normally need this. It only matters if you&apos;re editing <code>paintings.csv</code> locally on this machine and want to push that copy up.
                </p>
                <button
                  style={{ ...S.btnGold, opacity: (!githubToken || pushing) ? 0.5 : 1 }}
                  onClick={handlePushToGitHub}
                  disabled={!githubToken || pushing}
                >
                  {pushing ? '⏳ Pushing…' : '⬆ Push paintings.csv to GitHub'}
                </button>
              </div>
            </div>

            <div style={S.card}>
              <h3 style={{ color: '#fff', fontWeight: 300, marginTop: 0, marginBottom: '0.75rem' }}>
                How to Create a GitHub Token
              </h3>
              <ol style={{ color: '#888', fontSize: '0.88rem', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
                <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" style={{ color: '#c9a84c' }}>github.com/settings/tokens/new</a></li>
                <li>Give it a name like <strong style={{ color: '#ccc' }}>ReenArt Admin</strong></li>
                <li>Set expiration to your preference</li>
                <li>Under <strong style={{ color: '#ccc' }}>Scopes</strong>, check <strong style={{ color: '#ccc' }}>repo</strong> (full control)</li>
                <li>Click <strong style={{ color: '#ccc' }}>Generate token</strong> and copy it here</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* ─── Edit Modal ─── */}
      {editPainting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '2rem 1rem',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            width: '100%', maxWidth: '700px',
            padding: '2rem',
            marginTop: '2rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#fff', fontWeight: 300, margin: 0 }}>Edit Painting</h2>
              <button
                style={{ background: 'none', border: 'none', color: '#777', fontSize: '1.4rem', cursor: 'pointer' }}
                onClick={() => setEditPainting(null)}
              >×</button>
            </div>
            <PaintingForm
              initial={editPainting}
              onSave={handleSaveEdit}
              onCancel={() => setEditPainting(null)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* ─── Confirm Delete Modal ─── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#141414',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '14px',
            padding: '2rem',
            maxWidth: '380px', width: '90%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗑️</div>
            <h3 style={{ color: '#fff', fontWeight: 300, margin: '0 0 0.5rem' }}>Delete Painting?</h3>
            <p style={{ color: '#777', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              This will permanently remove <strong style={{ color: '#ccc' }}>{confirmDelete}</strong> from your database.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button style={S.btnGhost} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                style={{ ...S.btnDanger, padding: '0.65rem 1.4rem', fontSize: '0.88rem', opacity: saving ? 0.5 : 1 }}
                onClick={() => handleDelete(confirmDelete)}
                disabled={saving}
              >
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

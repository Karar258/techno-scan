import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import QRCode from 'qrcode'
import {
  ArrowDownLeft, ArrowLeft, BadgeCheck, Check, ChevronDown, ChevronLeft, CircleHelp,
  Download, ExternalLink, Eye, FileText, Filter, Heart, ImagePlus, LayoutDashboard,
  LogOut, Menu, Package, Plus, QrCode, Search, Settings, ShieldCheck, ShoppingBag,
  Sparkles, Tag, Trash2, TrendingUp, X,
} from 'lucide-react'

type Product = {
  id: string
  name: string
  category: string
  price: number
  sizes: string[]
  colors: string[]
  available: boolean
  image: string
  sku: string
}

type Screen = 'dashboard' | 'products' | 'settings'
type ProductDraft = Omit<Product, 'id' | 'sku'>

const seedProducts: Product[] = [
  { id: 'linen-shirt', name: 'قميص لينين كلاسيك', category: 'ملابس', price: 249, sizes: ['S', 'M', 'L', 'XL'], colors: ['كريمي', 'أبيض'], available: true, image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=85', sku: 'TS-001' },
  { id: 'daily-bag', name: 'حقيبة يومية جلد', category: 'إكسسوارات', price: 380, sizes: ['مقاس واحد'], colors: ['بني', 'أسود'], available: true, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=85', sku: 'TS-002' },
  { id: 'soft-sneakers', name: 'سنيكرز سوفت', category: 'أحذية', price: 425, sizes: ['38', '39', '40', '41'], colors: ['أبيض', 'بيج'], available: false, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=85', sku: 'TS-003' },
  { id: 'summer-dress', name: 'فستان صيفي ميدي', category: 'ملابس', price: 315, sizes: ['S', 'M', 'L'], colors: ['مرجاني', 'أزرق'], available: true, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=85', sku: 'TS-004' },
  { id: 'gold-earrings', name: 'أقراط سول الذهبية', category: 'إكسسوارات', price: 165, sizes: ['مقاس واحد'], colors: ['ذهبي'], available: true, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=85', sku: 'TS-005' },
  { id: 'cozy-knit', name: 'كنزة تريكو ناعمة', category: 'ملابس', price: 290, sizes: ['S', 'M', 'L', 'XL'], colors: ['بنفسجي', 'كريمي'], available: true, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=85', sku: 'TS-006' },
]

const fallbackImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
const productKey = 'techno-scan-products'
const ownerKey = 'techno-scan-owner'
const storeNameKey = 'techno-scan-store-name'
type SharedProduct = { product: Product; storeName: string }

function createProductUrl(product: Product, storeName: string) {
  const shareableImage = /^https?:\/\//i.test(product.image) ? product.image : ''
  const payload = { ...product, image: shareableImage, storeName }
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${window.location.origin}/p/${encodeURIComponent(product.id)}?data=${encoded}`
}

function readSharedProduct(id: string): SharedProduct | null {
  const encoded = new URLSearchParams(window.location.search).get('data')
  if (!encoded) return null
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!value || typeof value !== 'object') return null
    const candidate = value as Partial<Product & { storeName: string }>
    const isStringArray = (items: unknown): items is string[] => Array.isArray(items) && items.every((item) => typeof item === 'string')
    if (
      candidate.id !== id ||
      typeof candidate.name !== 'string' ||
      typeof candidate.category !== 'string' ||
      typeof candidate.price !== 'number' ||
      !Number.isFinite(candidate.price) ||
      typeof candidate.available !== 'boolean' ||
      typeof candidate.sku !== 'string' ||
      !isStringArray(candidate.sizes) ||
      !isStringArray(candidate.colors) ||
      typeof candidate.storeName !== 'string' ||
      (typeof candidate.image !== 'string')
    ) return null
    const image = /^https?:\/\//i.test(candidate.image) ? candidate.image : ''
    return {
      product: { id, name: candidate.name, category: candidate.category, price: candidate.price, sizes: candidate.sizes, colors: candidate.colors, available: candidate.available, sku: candidate.sku, image },
      storeName: candidate.storeName,
    }
  } catch {
    return null
  }
}

const getProducts = (): Product[] => {
  try {
    const stored = localStorage.getItem(productKey)
    return stored ? JSON.parse(stored) as Product[] : seedProducts
  } catch (error) {
    console.error('تعذّر تحميل المنتجات المحفوظة.', error)
    return seedProducts
  }
}

function App() {
  const publicId = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)?.[1]
  const [products, setProducts] = useState<Product[]>(getProducts)
  const [owner, setOwner] = useState(() => localStorage.getItem(ownerKey) || '')
  const [storeName, setStoreName] = useState(() => localStorage.getItem(storeNameKey) || 'متجر نُورا')
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'الكل' | 'متوفر' | 'غير متوفر'>('الكل')
  const [editor, setEditor] = useState<Product | 'new' | null>(null)
  const [qrProduct, setQrProduct] = useState<Product | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(productKey, JSON.stringify(products))
    } catch (error) {
      console.error('تعذّر حفظ المنتجات في مساحة التخزين المحلية.', error)
      setNotice('تعذّر حفظ التغييرات. مساحة التخزين في هذا المتصفح ممتلئة.')
    }
  }, [products])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.category} ${product.sku}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = filter === 'الكل' || (filter === 'متوفر' ? product.available : !product.available)
    return matchesQuery && matchesStatus
  }), [products, query, filter])

  const saveProduct = (draft: ProductDraft, existing: Product | null) => {
    if (existing) {
      setProducts((current) => current.map((product) => product.id === existing.id ? { ...existing, ...draft } : product))
      setNotice('تم تحديث المنتج بنجاح')
    } else {
      const slug = `${Date.now().toString(36)}`
      setProducts((current) => [{ ...draft, id: slug, sku: `TS-${String(current.length + 1).padStart(3, '0')}` }, ...current])
      setNotice('أُضيف المنتج إلى متجرك')
    }
    setEditor(null)
  }

  const deleteProduct = (product: Product) => {
    if (!window.confirm(`هل تريد حذف «${product.name}»؟`)) return
    setProducts((current) => current.filter((item) => item.id !== product.id))
    setNotice('تم حذف المنتج')
  }

  const signIn = (name: string) => {
    localStorage.setItem(ownerKey, name)
    setOwner(name)
  }

  if (publicId) {
    const shared = readSharedProduct(publicId)
    const product = shared?.product || products.find((item) => item.id === publicId)
    return product ? <PublicProduct product={product} storeName={shared?.storeName || storeName} /> : <NotFound />
  }
  if (!owner) return <Login onLogin={signIn} />

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><QrCode size={23} strokeWidth={2.4} /></div>
          <div><strong>TECHNO<span>SCAN</span></strong><small>مساحة متجرك</small></div>
          <button className="icon-button sidebar-close" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)}><X size={19} /></button>
        </div>
        <div className="store-switcher">
          <div className="store-avatar">ن</div>
          <div className="store-name"><strong>{storeName}</strong><span>الخطة المجانية</span></div>
          <ChevronDown size={17} />
        </div>
        <span className="nav-caption">القائمة الرئيسية</span>
        <nav className="side-nav">
          <NavItem icon={<LayoutDashboard size={19} />} label="الرئيسية" active={screen === 'dashboard'} onClick={() => { setScreen('dashboard'); setMobileNav(false) }} />
          <NavItem icon={<Package size={19} />} label="المنتجات" count={products.length} active={screen === 'products'} onClick={() => { setScreen('products'); setMobileNav(false) }} />
          <NavItem icon={<QrCode size={19} />} label="رموز QR" onClick={() => { setScreen('products'); setMobileNav(false) }} />
        </nav>
        <span className="nav-caption nav-caption-lower">إدارة المتجر</span>
        <nav className="side-nav">
          <NavItem icon={<Settings size={19} />} label="إعدادات المتجر" active={screen === 'settings'} onClick={() => { setScreen('settings'); setMobileNav(false) }} />
          <NavItem icon={<CircleHelp size={19} />} label="المساعدة والدعم" onClick={() => setNotice('نحن هنا لمساعدتك — تواصل معنا عبر hello@technoscan.app')} />
        </nav>
        <div className="sidebar-spacer" />
        <div className="upgrade-card">
          <div className="upgrade-spark"><Sparkles size={17} /></div>
          <strong>متجرك يستحق المزيد</strong>
          <p>اكتشف أدوات تساعدك على تنمية متجرك.</p>
          <button onClick={() => setNotice('قريباً — ترقبوا إطلاق الخطط الجديدة')}>اكتشف المزايا <ArrowLeft size={14} /></button>
        </div>
        <button className="profile-row" onClick={() => { localStorage.removeItem(ownerKey); setOwner('') }}>
          <div className="profile-avatar">{owner.trim().charAt(0) || 'ن'}</div>
          <div><strong>{owner}</strong><span>صاحبة المتجر</span></div>
          <LogOut size={17} className="profile-logout" />
        </button>
      </aside>
      {mobileNav && <button className="nav-backdrop" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="فتح القائمة" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
          <div className="breadcrumb"><span>{storeName}</span><ChevronLeft size={15} /><strong>{screen === 'dashboard' ? 'الرئيسية' : screen === 'products' ? 'المنتجات' : 'إعدادات المتجر'}</strong></div>
          <div className="topbar-actions">
            <span className="store-status"><span /> متجرك نشط</span>
            <button className="topbar-avatar" aria-label="تسجيل الخروج" onClick={() => { localStorage.removeItem(ownerKey); setOwner('') }}>{owner.trim().charAt(0) || 'ن'}</button>
          </div>
        </header>
        {screen === 'dashboard' && <Dashboard products={products} setScreen={setScreen} onAdd={() => setEditor('new')} onQr={setQrProduct} />}
        {screen === 'products' && <ProductsPage products={filteredProducts} allCount={products.length} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onAdd={() => setEditor('new')} onEdit={setEditor} onDelete={deleteProduct} onQr={setQrProduct} />}
        {screen === 'settings' && <SettingsPage owner={owner} storeName={storeName} onSave={(name, nextStoreName) => { signIn(name); localStorage.setItem(storeNameKey, nextStoreName); setStoreName(nextStoreName); setNotice('تم حفظ إعدادات المتجر') }} />}
        <footer className="footer"><span>© 2025 TECHNO SCAN</span><span>صُنع بكل عناية لأصحاب المتاجر <Heart size={13} fill="currentColor" /></span></footer>
      </main>

      {editor && <ProductEditor product={editor === 'new' ? null : editor} onClose={() => setEditor(null)} onSave={saveProduct} />}
      {qrProduct && <QrModal product={qrProduct} onClose={() => setQrProduct(null)} />}
      {notice && <div role="status" className="toast"><Check size={17} />{notice}<button aria-label="إغلاق التنبيه" onClick={() => setNotice('')}><X size={15} /></button></div>}
    </div>
  )
}

function NavItem({ icon, label, count, active = false, onClick }: { icon: React.ReactNode; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button>
}

function Dashboard({ products, setScreen, onAdd, onQr }: { products: Product[]; setScreen: (screen: Screen) => void; onAdd: () => void; onQr: (product: Product) => void }) {
  const available = products.filter((product) => product.available).length
  return (
    <div className="page-content">
      <section className="welcome-row">
        <div><div className="eyebrow"><Sparkles size={14} /> مساحة جميلة لمتجرك</div><h1>صباح الخير، نُورا <span>✦</span></h1><p>كل شيء على ما يرام. إليك نظرة سريعة على متجرك اليوم.</p></div>
        <button className="button button-primary" onClick={onAdd}><Plus size={18} /> أضيفي منتجاً</button>
      </section>
      <section className="stats-grid">
        <StatCard icon={<Package size={19} />} label="إجمالي المنتجات" value={String(products.length)} change="في متجرك الآن" tone="purple" />
        <StatCard icon={<BadgeCheck size={19} />} label="منتجات متوفرة" value={String(available)} change={`${products.length - available} منتجات غير متوفرة`} tone="yellow" />
        <StatCard icon={<QrCode size={19} />} label="رموز QR جاهزة" value={String(products.length)} change="رمز خاص لكل منتج" tone="coral" />
        <StatCard icon={<Eye size={19} />} label="زيارات صفحات المنتجات" value="١,٢٨٤" change={<><TrendingUp size={14} /> +١٢٪ هذا الشهر</>} tone="mint" />
      </section>
      <section className="welcome-banner">
        <div className="banner-copy"><span className="banner-label"><Sparkles size={13} /> بداية موفقة</span><h2>منتجاتك، بطريقتك.</h2><p>أضيفي تفاصيل منتجاتك وشاركيها بسهولة عبر رمز QR مستقل لكل منتج.</p><button className="banner-button" onClick={onAdd}>ابدئي بإضافة منتج <ArrowLeft size={16} /></button></div>
        <div className="banner-art" aria-hidden="true"><div className="art-sun" /><div className="art-card art-back"><Tag size={21} /></div><div className="art-card art-front"><QrCode size={56} /><span>امسح واكتشف</span></div><div className="art-dot">✳</div></div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><h2>منتجاتك</h2><p>آخر المنتجات التي أضفتها إلى متجرك</p></div><button className="text-button" onClick={() => setScreen('products')}>عرض كل المنتجات <ArrowLeft size={16} /></button></div>
        {products.length ? <div className="recent-grid">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} onQr={onQr} />)}</div> : <EmptyState onAdd={onAdd} />}
      </section>
    </div>
  )
}

function StatCard({ icon, label, value, change, tone }: { icon: React.ReactNode; label: string; value: string; change: React.ReactNode; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-change">{change}</span></article>
}

function ProductCard({ product, onQr }: { product: Product; onQr: (product: Product) => void }) {
  return <article className="product-card"><div className="product-image-wrap"><img src={product.image || fallbackImage} alt={product.name} /><span className={`availability ${product.available ? 'is-available' : 'is-unavailable'}`}><i />{product.available ? 'متوفر' : 'غير متوفر'}</span><button className="card-qr" onClick={() => onQr(product)} aria-label={`رمز QR للمنتج ${product.name}`}><QrCode size={17} /></button></div><div className="product-card-info"><div><h3>{product.name}</h3><span>{product.category} · {product.sku}</span></div><strong>{product.price} <small>ر.س</small></strong></div></article>
}

function ProductsPage({ products, allCount, query, setQuery, filter, setFilter, onAdd, onEdit, onDelete, onQr }: { products: Product[]; allCount: number; query: string; setQuery: (query: string) => void; filter: 'الكل' | 'متوفر' | 'غير متوفر'; setFilter: (filter: 'الكل' | 'متوفر' | 'غير متوفر') => void; onAdd: () => void; onEdit: (product: Product) => void; onDelete: (product: Product) => void; onQr: (product: Product) => void }) {
  return <div className="page-content">
    <section className="page-title-row"><div><div className="eyebrow">إدارة الكتالوج</div><h1>المنتجات <span className="title-count">{allCount}</span></h1><p>كل تفاصيل منتجات متجرك في مكان واحد.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={18} /> أضيفي منتجاً</button></section>
    <section className="catalog-panel">
      <div className="catalog-toolbar"><div className="search-field"><Search size={18} /><input aria-label="ابحثي عن منتج" placeholder="ابحثي عن منتج..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button onClick={() => setQuery('')} aria-label="مسح البحث"><X size={15} /></button>}</div><div className="filter-wrap"><Filter size={16} /><select aria-label="فلترة حسب التوفر" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option>الكل</option><option>متوفر</option><option>غير متوفر</option></select><ChevronDown size={14} /></div><span className="results-count">{products.length} منتجات</span></div>
      {products.length ? <div className="catalog-grid">{products.map((product) => <article className="catalog-card" key={product.id}><ProductCard product={product} onQr={onQr} /><div className="catalog-details"><div className="detail-chips">{product.sizes.slice(0, 4).map((size) => <span key={size}>{size}</span>)}<b>·</b>{product.colors.slice(0, 2).map((color) => <span className="color-chip" key={color}>{color}</span>)}</div><div className="catalog-actions"><button onClick={() => onQr(product)}><QrCode size={16} /> رمز QR</button><button onClick={() => onEdit(product)}>تعديل</button><button className="delete-action" aria-label={`حذف ${product.name}`} onClick={() => onDelete(product)}><Trash2 size={16} /></button></div></div></article>)}</div> : <div className="empty-state"><div className="empty-icon"><Package size={23} /></div><h3>{allCount ? 'لا توجد نتائج مطابقة' : 'كتالوجك بانتظار أول منتج'}</h3><p>{allCount ? 'جرّبي تغيير كلمة البحث أو فلتر التوفر.' : 'أضيفي منتجاً جديداً وابدئي بمشاركة صفحته.'}</p>{!allCount && <button className="button button-primary" onClick={onAdd}><Plus size={17} /> أضيفي أول منتج</button>}</div>}
    </section>
  </div>
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Package size={23} /></div><h3>كتالوجك بانتظار أول منتج</h3><p>أضيفي منتجاً جديداً وابدئي بمشاركة صفحته.</p><button className="button button-primary" onClick={onAdd}><Plus size={17} /> أضيفي أول منتج</button></div>
}

function ProductEditor({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (draft: ProductDraft, existing: Product | null) => void }) {
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState(product?.category || 'ملابس')
  const [price, setPrice] = useState(String(product?.price ?? ''))
  const [sizes, setSizes] = useState(product?.sizes.join(', ') || '')
  const [colors, setColors] = useState(product?.colors.join(', ') || '')
  const [available, setAvailable] = useState(product?.available ?? true)
  const [image, setImage] = useState(product?.image || '')
  const [error, setError] = useState('')

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('اختاري ملف صورة صالحاً.'); return }
    if (file.size > 2_500_000) { setError('حجم الصورة يجب ألا يتجاوز ٢٫٥ ميغابايت.'); return }
    const reader = new FileReader()
    reader.onload = () => setImage(String(reader.result))
    reader.onerror = () => setError('تعذّرت قراءة الصورة، حاولي مرة أخرى.')
    reader.readAsDataURL(file)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !price || Number(price) <= 0) { setError('أدخلي اسم المنتج وسعراً صحيحاً.'); return }
    onSave({ name: name.trim(), category, price: Number(price), sizes: sizes.split(',').map((value) => value.trim()).filter(Boolean), colors: colors.split(',').map((value) => value.trim()).filter(Boolean), available, image }, product)
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="modal-heading"><div><span className="eyebrow">{product ? 'تحديث الكتالوج' : 'وسّعي كتالوجك'}</span><h2 id="editor-title">{product ? 'تعديل المنتج' : 'أضيفي منتجاً جديداً'}</h2></div><button className="icon-button" aria-label="إغلاق" onClick={onClose}><X size={20} /></button></div>
    <form onSubmit={submit}><label className="image-upload">{image ? <img src={image} alt="معاينة المنتج" /> : <><ImagePlus size={25} /><strong>أضيفي صورة المنتج</strong><span>PNG أو JPG — حتى ٢٫٥ ميغابايت</span></>}<input type="file" accept="image/*" onChange={uploadImage} />{image && <span className="change-image">غيّري الصورة</span>}</label>
      <label className="form-label">اسم المنتج<input autoFocus placeholder="مثال: قميص لينين كلاسيك" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <div className="form-row"><label className="form-label">السعر (ر.س)<input type="number" min="0.01" step="0.01" placeholder="0.00" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="form-label">التصنيف<select value={category} onChange={(event) => setCategory(event.target.value)}><option>ملابس</option><option>أحذية</option><option>إكسسوارات</option><option>منزل</option><option>أخرى</option></select></label></div>
      <label className="form-label">المقاسات <small>افصلي بينها بفاصلة</small><input placeholder="S, M, L, XL" value={sizes} onChange={(event) => setSizes(event.target.value)} /></label><label className="form-label">الألوان <small>افصلي بينها بفاصلة</small><input placeholder="كريمي، أسود" value={colors} onChange={(event) => setColors(event.target.value)} /></label>
      <label className="availability-toggle"><span><strong>المنتج متوفر</strong><small>يظهر المنتج كمتوفر في صفحته العامة</small></span><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /><i /></label>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>إلغاء</button><button className="button button-primary"><Check size={17} />{product ? 'حفظ التعديلات' : 'إضافة المنتج'}</button></div>
    </form></section></div>
}

function QrModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const url = createProductUrl(product, localStorage.getItem(storeNameKey) || 'متجر نُورا')
  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#31264b', light: '#ffffff' }, errorCorrectionLevel: 'H' })
      .then((data) => { if (active) setQr(data) })
      .catch((reason: unknown) => { console.error('تعذّر إنشاء رمز QR.', reason); if (active) setError('تعذّر إنشاء رمز QR. حاولي مرة أخرى.') })
    return () => { active = false }
  }, [url])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title"><div className="modal-heading"><div><span className="eyebrow">صفحة المنتج العامة</span><h2 id="qr-title">رمز QR الخاص بمنتجك</h2></div><button className="icon-button" aria-label="إغلاق" onClick={onClose}><X size={20} /></button></div><div className="qr-product-line"><img src={product.image || fallbackImage} alt="" /><div><strong>{product.name}</strong><span>{product.price} ر.س · {product.category}</span></div></div><div className="qr-display">{error ? <p className="form-error">{error}</p> : qr ? <img src={qr} alt={`رمز QR لصفحة ${product.name}`} /> : <div className="qr-loading"><QrCode size={36} /><span>جارٍ تجهيز الرمز...</span></div>}</div><p className="qr-hint">امسحي الرمز لفتح صفحة المنتج ومشاركة تفاصيله مع عملائك. بيانات المنتج الأساسية مضمّنة في الرابط.</p><a className={`button button-primary qr-download ${!qr ? 'disabled' : ''}`} href={qr || undefined} download={`${product.id}-qr.png`}><Download size={17} /> تنزيل رمز QR</a><a className="public-link" href={url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> معاينة صفحة المنتج</a></section></div>
}

function Login({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !email.includes('@') || password.length < 6) { setError('أدخلي الاسم وبريداً إلكترونياً صحيحاً وكلمة مرور من ٦ أحرف على الأقل.'); return }
    onLogin(name.trim())
  }
  return <main className="login-page"><div className="login-decoration"><div className="login-orb orb-one" /><div className="login-orb orb-two" /><div className="login-brand"><div className="brand-mark"><QrCode size={23} /></div><div><strong>TECHNO<span>SCAN</span></strong><small>منتجاتك، بطريقتك.</small></div></div><div className="login-illustration"><span className="float-star star-a">✳</span><div className="login-product"><span className="mini-brand">N.</span><div className="product-drawing"><div /><i /></div><span className="product-label">THE EVERYDAY EDIT</span></div><div className="login-qr"><QrCode size={66} /></div><span className="float-star star-b">✦</span></div><div className="login-note"><ShieldCheck size={18} /><span>تجربة تسوّق أوضح، تبدأ من كل منتج.</span></div></div><section className="login-panel"><div className="login-form-wrap"><div className="login-welcome"><span className="eyebrow">أهلاً بك في مساحتك</span><h1>كل متجرك، <em>في مكان واحد.</em></h1><p>سجّلي الدخول وخلّي منتجاتك تحكي قصتها.</p></div><form onSubmit={submit}><label className="form-label">اسمك<input autoComplete="name" placeholder="مثال: نُورا أحمد" value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-label">البريد الإلكتروني<input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="form-label">كلمة المرور<input type="password" autoComplete="current-password" placeholder="٦ أحرف على الأقل" value={password} onChange={(event) => setPassword(event.target.value)} /></label><div className="login-options"><label><input type="checkbox" defaultChecked /> تذكّريني</label><a href="mailto:hello@technoscan.app">نسيتِ كلمة المرور؟</a></div>{error && <p role="alert" className="form-error">{error}</p>}<button className="button button-primary login-submit">دخول إلى متجري <ArrowLeft size={17} /></button></form><div className="login-divider"><span>جديدتنا</span></div><button className="signup-button" onClick={() => setError('التسجيل متاح الآن — أدخلي بياناتك أعلاه للبدء.')}>أنشئي حساب متجرك مجاناً <ArrowDownLeft size={16} /></button><p className="login-disclaimer"><ShieldCheck size={14} /> تسجيل تجريبي — بياناتك محفوظة على هذا الجهاز فقط.</p></div></section></main>
}

function PublicProduct({ product, storeName }: { product: Product; storeName: string }) {
  const [copied, setCopied] = useState(false)
  return <main className="public-page"><header className="public-header"><a href="/" className="public-brand"><div className="brand-mark"><QrCode size={20} /></div><strong>TECHNO<span>SCAN</span></strong></a><span>منتج من {storeName}</span></header><section className="public-product"><div className="public-image"><img src={product.image || fallbackImage} alt={product.name} /><span className={`availability public-availability ${product.available ? 'is-available' : 'is-unavailable'}`}><i />{product.available ? 'متوفر الآن' : 'غير متوفر حالياً'}</span></div><div className="public-info"><span className="public-category">{product.category} <span>·</span> {product.sku}</span><h1>{product.name}</h1><strong className="public-price">{product.price} <small>ر.س</small></strong><div className="public-divider" /><div className="public-option"><span>المقاسات</span><div className="option-pills">{product.sizes.map((size) => <span key={size}>{size}</span>)}</div></div><div className="public-option"><span>الألوان</span><div className="option-pills">{product.colors.map((color) => <span key={color}>{color}</span>)}</div></div><button className="button button-primary public-contact" onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true)).catch((error: unknown) => console.error('تعذّر نسخ رابط المنتج.', error)) }}>{copied ? <Check size={17} /> : <ShoppingBag size={17} />}{copied ? 'تم نسخ رابط المنتج' : 'شاركي المنتج'}</button><p className="public-note"><ShieldCheck size={15} /> تفاصيل المنتج مقدّمة من المتجر مباشرة.</p></div></section><footer className="public-footer">© 2025 TECHNO SCAN <span>منتجاتك، بطريقتك.</span></footer></main>
}

function NotFound() {
  return <main className="not-found"><div className="brand-mark"><QrCode size={23} /></div><span className="eyebrow">TECHNO SCAN</span><h1>هذا المنتج غير موجود</h1><p>قد يكون الرابط غير صحيح أو أن المنتج لم يعد متاحاً.</p><a href="/">العودة إلى بداية الصفحة <ArrowLeft size={16} /></a></main>
}

function SettingsPage({ owner, storeName, onSave }: { owner: string; storeName: string; onSave: (name: string, storeName: string) => void }) {
  const [name, setName] = useState(storeName)
  const [contact, setContact] = useState(owner)
  const [saved, setSaved] = useState(false)
  return <div className="page-content"><section className="page-title-row"><div><div className="eyebrow">مساحتك، على ذوقك</div><h1>إعدادات المتجر</h1><p>حدّثي بيانات متجرك وتفضيلات حسابك.</p></div></section><section className="settings-card"><div className="settings-card-heading"><div className="settings-icon"><Settings size={19} /></div><div><h2>معلومات المتجر</h2><p>هذه التفاصيل تساعد عملاءك على التعرّف على متجرك.</p></div></div><label className="form-label">اسم المتجر<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-label">اسم صاحبة المتجر<input value={contact} onChange={(event) => setContact(event.target.value)} /></label><div className="settings-info"><ShieldCheck size={17} /><span>ملاحظة: تُحفظ هذه الإعدادات محلياً على هذا الجهاز في النسخة التجريبية.</span></div><button className="button button-primary" onClick={() => { onSave(contact.trim() || owner, name.trim() || storeName); setSaved(true) }}>{saved ? <Check size={17} /> : <FileText size={17} />}{saved ? 'تم الحفظ' : 'حفظ التغييرات'}</button></section></div>
}

export default App

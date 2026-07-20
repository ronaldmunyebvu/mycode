/* ===================================================
   eShop — App Logic (Amazon-Style)
   Handles: Visitor Counter, Toast,
            Supabase Auth, Products Fetching & Grid
   =================================================== */

import { supabase } from './supabase.js'

// =============================================
//  VISITOR COUNTER
// =============================================
const VISIT_KEY   = 'mycode_visit_count'
const SESSION_KEY = 'mycode_session_started'

function initVisitorCounter() {
  if (!sessionStorage.getItem(SESSION_KEY)) {
    const current = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10)
    localStorage.setItem(VISIT_KEY, current + 1)
    sessionStorage.setItem(SESSION_KEY, 'true')
  }
  updateVisitorDisplays()
}

function updateVisitorDisplays() {
  const count     = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10)
  const formatted = count.toLocaleString()
  const el1 = document.getElementById('visitor-count-display')
  const el2 = document.getElementById('visitor-count-display2')
  if (el1) el1.textContent = formatted
  if (el2) el2.textContent = formatted
}

// =============================================
//  SESSION CHECK
// =============================================
async function checkSessionAndShow() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession()
  const authBtn = document.getElementById('header-auth-btn')
  const userMenu = document.getElementById('header-user-menu')
  const usernameEl = document.getElementById('header-username')

  if (session) {
    if (authBtn) authBtn.classList.add('hidden')
    if (userMenu) {
      userMenu.classList.remove('hidden')
      userMenu.style.display = 'flex'
    }
    if (usernameEl) usernameEl.textContent = session.user.user_metadata?.username || session.user.email
  } else {
    if (authBtn) authBtn.classList.remove('hidden')
    if (userMenu) {
      userMenu.classList.add('hidden')
      userMenu.style.display = 'none'
    }
  }
}

// =============================================
//  AUTH MODALS & NAVIGATION
// =============================================
window.showAuthModal = function() {
  const overlay = document.getElementById('auth-overlay')
  if (overlay) {
    overlay.classList.remove('hidden')
    overlay.style.display = 'flex'
  }
}

window.closeAuthModal = function() {
  const overlay = document.getElementById('auth-overlay')
  if (overlay) {
    overlay.classList.add('hidden')
    overlay.style.display = 'none'
  }
}

window.handleAdvertiseClick = async function() {
  if (!supabase) {
    window.showAuthModal()
    return
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    window.location.href = 'welcome.html'
  } else {
    showToast('Please Login or Sign Up to advertise your products.')
    window.showAuthModal()
  }
}

// =============================================
//  AUTH FORMS TOGGLE
// =============================================
window.showForm = function (type) {
  const loginForm  = document.getElementById('login-form')
  const signupForm = document.getElementById('signup-form')
  const tabLogin   = document.getElementById('tab-login')
  const tabSignup  = document.getElementById('tab-signup')

  if (type === 'login') {
    loginForm.classList.remove('hidden')
    signupForm.classList.add('hidden')
    tabLogin.classList.add('active')
    tabSignup.classList.remove('active')
  } else {
    signupForm.classList.remove('hidden')
    loginForm.classList.add('hidden')
    tabSignup.classList.add('active')
    tabLogin.classList.remove('active')
  }
}

// =============================================
//  RESEND EMAIL API HELPER
// =============================================
async function callAuthEmailApi(type, email) {
  try {
    const res = await fetch('/api/auth-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, email }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      console.error('Auth email API error:', data.error || res.statusText)
      return { error: data.error || 'Failed to send email' }
    }
    return { error: null }
  } catch (err) {
    console.error('Auth email API request failed:', err.message)
    return { error: 'Could not reach email server' }
  }
}

// =============================================
//  LOGIN
// =============================================
window.handleLogin = async function (e) {
  e.preventDefault()
  if (!supabase) {
    showToast('Server connection unavailable. Please try again later.')
    return
  }
  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  if (!email || !password) {
    showToast('Please fill in all fields.')
    return
  }

  const btn = document.getElementById('btn-login')
  btn.disabled = true
  btn.textContent = 'Signing in...'

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  btn.disabled = false
  btn.textContent = 'Sign In'

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('email not confirmed')) {
      showToast('Please verify your email first. Sending a new verification email...')
      const emailResult = await callAuthEmailApi('signup', email)
      if (emailResult.error) {
        showToast('Failed to send email: ' + emailResult.error)
      } else {
        showToast('New verification email sent! Check your inbox.')
      }
    } else if (msg.includes('invalid')) {
      showToast('Incorrect email or password.')
    } else {
      showToast(error.message)
    }
    return
  }

  const name = data.user.user_metadata?.username || data.user.email
  showToast('Welcome back, ' + name + '!')
  window.closeAuthModal()
  setTimeout(() => window.location.href = 'welcome.html', 800)
}

// =============================================
//  SIGN UP
// =============================================
window.handleSignup = async function (e) {
  e.preventDefault()
  if (!supabase) {
    showToast('Server connection unavailable. Please try again later.')
    return
  }
  const username = document.getElementById('signup-name').value.trim()
  const email    = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value
  const confirm  = document.getElementById('signup-confirm').value

  if (!username || !email || !password || !confirm) {
    showToast('Please fill in all fields.')
    return
  }
  if (password !== confirm) {
    showToast('Passwords do not match.')
    return
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.')
    return
  }

  const btn = document.getElementById('btn-signup')
  btn.disabled = true
  btn.textContent = 'Creating account...'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })

  btn.disabled = false
  btn.textContent = 'Create your eShop account'

  if (error) {
    showToast(error.message)
    return
  }

  if (data.user && data.session) {
    showToast('Account created! Welcome, ' + username + '!')
    window.closeAuthModal()
    setTimeout(() => window.location.href = 'welcome.html', 800)
  } else {
    showToast('Sending verification email...')
    const emailResult = await callAuthEmailApi('signup', email)
    if (emailResult.error) {
      showToast('Failed to send email: ' + emailResult.error)
    } else {
      showToast('Check your email to verify your account!')
    }
  }
}

// =============================================
//  LOGOUT
// =============================================
window.handleLogout = async function () {
  if (supabase) await supabase.auth.signOut()
  showToast('You have been logged out.')
  checkSessionAndShow()
  fetchProducts()
}

// =============================================
//  FORGOT PASSWORD
// =============================================
window.showForgotPassword = function () {
  const authOverlay = document.getElementById('auth-overlay')
  const forgotOverlay = document.getElementById('forgot-overlay')
  if (authOverlay) {
    authOverlay.classList.add('hidden')
    authOverlay.style.display = 'none'
  }
  if (forgotOverlay) {
    forgotOverlay.classList.remove('hidden')
    forgotOverlay.style.display = 'flex'
    document.getElementById('forgot-email').value = ''
    document.getElementById('forgot-desc').textContent = "Enter the email address you used to sign up and we'll send you a link to reset your password."
    document.getElementById('forgot-form').style.display = 'block'
    document.getElementById('forgot-email').focus()
  }
}

window.closeForgotPassword = function () {
  const forgotOverlay = document.getElementById('forgot-overlay')
  if (forgotOverlay) {
    forgotOverlay.classList.add('hidden')
    forgotOverlay.style.display = 'none'
  }
}

window.handleForgotPassword = async function (e) {
  e.preventDefault()
  if (!supabase) {
    showToast('Server connection unavailable. Please try again later.')
    return
  }
  const email = document.getElementById('forgot-email').value.trim()
  if (!email) {
    showToast('Please enter your email address.')
    return
  }

  const btn = document.getElementById('btn-forgot')
  btn.disabled = true
  btn.textContent = 'Sending...'

  const emailResult = await callAuthEmailApi('reset', email)

  btn.disabled = false
  btn.textContent = 'Send Reset Link'

  if (emailResult.error) {
    showToast('Failed to send email: ' + emailResult.error)
    return
  }

  document.getElementById('forgot-desc').textContent = 'Reset link sent! Check your email inbox and follow the instructions to set a new password.'
  document.getElementById('forgot-form').style.display = 'none'
}

// =============================================
//  RESET PASSWORD (after clicking email link)
// =============================================
window.closeResetPassword = function () {
  const overlay = document.getElementById('reset-overlay')
  if (overlay) {
    overlay.classList.add('hidden')
    overlay.style.display = 'none'
  }
}

window.handleResetPassword = async function (e) {
  e.preventDefault()
  if (!supabase) {
    showToast('Server connection unavailable. Please try again later.')
    return
  }
  const password = document.getElementById('reset-password').value
  const confirm  = document.getElementById('reset-confirm').value

  if (!password || !confirm) {
    showToast('Please fill in all fields.')
    return
  }
  if (password !== confirm) {
    showToast('Passwords do not match.')
    return
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.')
    return
  }

  const btn = document.getElementById('btn-reset')
  btn.disabled = true
  btn.textContent = 'Updating...'

  const { error } = await supabase.auth.updateUser({ password })

  btn.disabled = false
  btn.textContent = 'Update Password'

  if (error) {
    showToast(error.message)
    return
  }

  document.getElementById('reset-desc').textContent = 'Password updated successfully! You can now login with your new password.'
  document.getElementById('reset-form').style.display = 'none'
  showToast('Password updated!')
}

function checkForResetToken() {
  const hash = window.location.hash
  if (hash && hash.includes('type=recovery')) {
    const overlay = document.getElementById('reset-overlay')
    if (overlay) {
      overlay.classList.remove('hidden')
      overlay.style.display = 'flex'
      document.getElementById('reset-password').value = ''
      document.getElementById('reset-confirm').value = ''
      document.getElementById('reset-desc').textContent = 'Enter your new password below.'
      document.getElementById('reset-form').style.display = 'block'
      document.getElementById('reset-password').focus()
    }
    window.history.replaceState(null, '', window.location.pathname)
  }
}

// =============================================
//  STAR RATING HELPER
// =============================================
function renderStars(rating) {
  const r = Math.round((rating || 0) * 2) / 2
  let html = ''
  for (let i = 1; i <= 5; i++) {
    if (r >= i) {
      html += '&#9733;'
    } else if (r >= i - 0.5) {
      html += '&#9733;'
    } else {
      html += '&#9734;'
    }
  }
  return html
}

// =============================================
//  CATEGORY BAR
// =============================================
let allCategories = []

function buildCategoryBar(categories) {
  const bar = document.getElementById('category-bar')
  const select = document.getElementById('category-select')
  if (!bar || !select) return

  bar.innerHTML = '<button class="amz-category-item active" data-category="all" onclick="filterByCategory(\'all\')">All</button>'
  select.innerHTML = '<option value="all">All Categories</option>'

  categories.forEach(cat => {
    if (!cat) return
    const btn = document.createElement('button')
    btn.className = 'amz-category-item'
    btn.dataset.category = cat
    btn.textContent = cat
    btn.onclick = () => filterByCategory(cat)
    bar.appendChild(btn)

    const opt = document.createElement('option')
    opt.value = cat
    opt.textContent = cat
    select.appendChild(opt)
  })
}

window.filterByCategory = function(cat) {
  const bar = document.getElementById('category-bar')
  if (bar) {
    bar.querySelectorAll('.amz-category-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === cat)
    })
  }
  const select = document.getElementById('category-select')
  if (select) select.value = cat
  fetchProducts()
}

// =============================================
//  FETCH PRODUCTS
// =============================================
let currentCategoryFilter = 'all'

async function fetchProducts() {
  const container = document.getElementById('products-container')
  if (!container) return

  container.innerHTML = '<div class="amz-loading">Loading products...</div>'

  const nameSearch = (document.getElementById('search-input')?.value || '').trim()
  const categorySearch = document.getElementById('category-select')?.value || 'all'
  const sortBy = document.getElementById('sort-select')?.value || 'newest'

  currentCategoryFilter = categorySearch

  let query = supabase.from('hookups').select(`
    *,
    hookup_likes ( user_id )
  `)

  if (nameSearch !== '') {
    // First try exact ilike match
    query = query.ilike('name', `%${nameSearch}%`)
  }

  if (categorySearch !== 'all') {
    query = query.eq('category', categorySearch)
  }

  let { data, error } = await query

  // If searching by name and got zero results, try fuzzy matching
  if (nameSearch !== '' && data && data.length === 0 && !error) {
    const fuzzyQuery = supabase.from('hookups').select(`
      *,
      hookup_likes ( user_id )
    `)
    if (categorySearch !== 'all') {
      fuzzyQuery.eq('category', categorySearch)
    }
    const { data: allData } = await fuzzyQuery
    if (allData && allData.length > 0) {
      const q = nameSearch.toLowerCase()
      data = allData.filter(p => {
        const name = (p.name || '').toLowerCase()
        // Check if any word in the product name is close to any word in the query
        const nameWords = name.split(/\s+/)
        const queryWords = q.split(/\s+/)
        return queryWords.some(qw => nameWords.some(nw =>
          nw.includes(qw) || qw.includes(nw) || levenshtein(qw, nw.slice(0, qw.length + 2)) <= 2
        )) || levenshtein(q, name.slice(0, q.length + 3)) <= 2
      })
    }
  }
  if (error) {
    container.innerHTML = `<div class="amz-empty" style="color:#dc2626;">Error loading products: ${error.message}</div>`
    return
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="amz-empty">No products available at the moment.</div>'
    document.getElementById('results-count').textContent = ''
    return
  }

  // Extract unique categories and build category bar
  const cats = [...new Set(data.map(p => p.category).filter(Boolean))].sort()
  if (cats.length > allCategories.length || JSON.stringify(cats) !== JSON.stringify(allCategories)) {
    allCategories = cats
    buildCategoryBar(allCategories)
    // Re-apply current filter
    const bar = document.getElementById('category-bar')
    if (bar) {
      bar.querySelectorAll('.amz-category-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === currentCategoryFilter)
      })
    }
  }

  // Sort
  let sorted = [...data]
  switch (sortBy) {
    case 'price-low':
      sorted.sort((a, b) => (a.price || 0) - (b.price || 0))
      break
    case 'price-high':
      sorted.sort((a, b) => (b.price || 0) - (a.price || 0))
      break
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
      break
    case 'newest':
    default:
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      break
  }

  // Update results count
  const resultsEl = document.getElementById('results-count')
  if (resultsEl) {
    const catLabel = categorySearch !== 'all' ? ` in ${categorySearch}` : ''
    resultsEl.textContent = `${sorted.length} result${sorted.length !== 1 ? 's' : ''}${catLabel}`
  }

  // Render cards
  const { data: { session } } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  const anonLikes = getAnonLikes()

  container.innerHTML = ''

  sorted.forEach(p => {
    const card = document.createElement('div')
    card.className = 'amz-card'
    card.onclick = () => window.openGallery(p.pictures)

    const firstImage = (p.pictures && p.pictures.length > 0) ? p.pictures[0] : ''

    const likes = p.hookup_likes || []
    const likeCount = likes.length
    const userLiked = session
      ? likes.some(l => l.user_id === session.user.id)
      : anonLikes.includes(p.id)
    const heartColor = userLiked ? '#dc2626' : '#999'

    const price = p.price
    const originalPrice = p.original_price
    const rating = p.rating || 0
    const category = p.category || ''
    const location = p.location || ''

    const isNearby = false

    let priceHtml = ''
    if (price !== null && price !== undefined && price !== '') {
      priceHtml = `
        <div class="amz-card-price">
          <span class="amz-price-current"><span class="amz-price-symbol">$</span>${parseFloat(price).toFixed(2)}</span>
          ${originalPrice ? `<span class="amz-price-original">$${parseFloat(originalPrice).toFixed(2)}</span>` : ''}
        </div>
      `
    }

    let ratingHtml = ''
    if (rating > 0) {
      const likeCountDisplay = likeCount > 0 ? `(${likeCount})` : ''
      ratingHtml = `
        <div class="amz-card-rating">
          <span class="amz-stars">${renderStars(rating)}</span>
          <span class="amz-rating-count">${rating.toFixed(1)} ${likeCountDisplay}</span>
        </div>
      `
    } else if (likeCount > 0) {
      ratingHtml = `
        <div class="amz-card-rating">
          <span class="amz-rating-count">${likeCount} like${likeCount !== 1 ? 's' : ''}</span>
        </div>
      `
    }

    const description = p.description || ''
    const phone = p.phone || ''

    let descHtml = ''
    if (description) {
      descHtml = `<div class="amz-card-desc">${description}</div>`
    }

    let contactHtml = ''
    if (phone) {
      contactHtml = `<div class="amz-card-contact">&#128222; ${phone}</div>`
    }

    card.innerHTML = `
      <div class="amz-like-badge">
        <span class="heart" style="color:${heartColor};" onclick="event.stopPropagation(); window.toggleLike('${p.id}', ${userLiked})">&#10084;</span>
        <span>${likeCount}</span>
      </div>
      <div class="amz-card-image-wrap">
        ${firstImage ? `<img src="${firstImage}" alt="${p.name}" loading="lazy" />` : '<span style="color:#ccc; font-size:2rem;">&#128247;</span>'}
      </div>
      ${category ? `<span class="amz-card-category">${category}</span>` : ''}
      <div class="amz-card-title">${p.name}</div>
      ${ratingHtml}
      ${priceHtml}
      ${descHtml}
      ${location ? `<div class="amz-card-location">&#128205; ${location}</div>` : ''}
      ${contactHtml}
    `
    container.appendChild(card)
  })
}
window.fetchProducts = fetchProducts

// =============================================
//  LIKE TOGGLE
// =============================================
const ANON_LIKES_KEY = 'eshop_anon_likes'

function getAnonLikes() {
  try { return JSON.parse(localStorage.getItem(ANON_LIKES_KEY) || '[]') }
  catch { return [] }
}

function setAnonLikes(likes) {
  localStorage.setItem(ANON_LIKES_KEY, JSON.stringify(likes))
}

window.toggleLike = async function(hookupId, currentlyLiked) {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    if (currentlyLiked) {
      await supabase.from('hookup_likes').delete().match({ hookup_id: hookupId, user_id: session.user.id })
    } else {
      await supabase.from('hookup_likes').insert([{ hookup_id: hookupId, user_id: session.user.id }])
    }
  } else {
    const likes = getAnonLikes()
    if (currentlyLiked) {
      setAnonLikes(likes.filter(id => id !== hookupId))
    } else {
      likes.push(hookupId)
      setAnonLikes(likes)
    }
  }
  fetchProducts()
}

// =============================================
//  GALLERY OVERLAYS
// =============================================
window.openGallery = function(pictures) {
  const overlay = document.getElementById('gallery-overlay')
  const galleryImages = document.getElementById('gallery-images')
  if (!overlay || !galleryImages) return

  galleryImages.innerHTML = (pictures || []).map(url =>
    `<img src="${url}" />`
  ).join('')

  overlay.classList.remove('hidden')
  overlay.style.display = 'flex'
}

window.closeGallery = function() {
  const overlay = document.getElementById('gallery-overlay')
  if (overlay) {
    overlay.classList.add('hidden')
    overlay.style.display = 'none'
  }
}

// =============================================
//  TOAST NOTIFICATIONS
// =============================================
let toastTimer = null
function showToast(message) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.remove('hidden')
  toast.classList.add('show')

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.classList.add('hidden'), 400)
  }, 3500)
}
window.showToast = showToast

// =============================================
//  CLOSE OVERLAYS ON BACKDROP CLICK
// =============================================
document.addEventListener('click', function (e) {
  const authOverlay = document.getElementById('auth-overlay')
  const galleryOverlay = document.getElementById('gallery-overlay')
  const managerOverlay = document.getElementById('manager-overlay')
  const predictionsEl = document.getElementById('search-predictions')
  const searchInput = document.getElementById('search-input')
  if (e.target === authOverlay) window.closeAuthModal()
  if (e.target === galleryOverlay) window.closeGallery()
  if (e.target === managerOverlay) hideManagerPrompt()
  if (predictionsEl && searchInput && !predictionsEl.contains(e.target) && e.target !== searchInput) {
    hidePredictions()
  }
})

// =============================================
//  LEVENSHTEIN DISTANCE (for fuzzy matching)
// =============================================
function levenshtein(a, b) {
  const al = a.length, bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al
  const matrix = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0))
  for (let i = 0; i <= al; i++) matrix[i][0] = i
  for (let j = 0; j <= bl; j++) matrix[0][j] = j
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[al][bl]
}

// =============================================
//  PRODUCT NAME CACHE (for predictions)
// =============================================
let cachedProducts = []

async function loadProductCache() {
  if (!supabase) return
  const { data } = await supabase.from('hookups').select('id, name, price, pictures, location, category')
  if (data) cachedProducts = data
}

// =============================================
//  SEARCH PREDICTIONS
// =============================================
let predictionDebounce = null

window.handleSearchInput = function(value) {
  clearTimeout(predictionDebounce)
  predictionDebounce = setTimeout(() => {
    showPredictions(value.trim())
  }, 200)
}

window.showCachedPredictions = function() {
  const input = document.getElementById('search-input')
  if (input && input.value.trim()) {
    showPredictions(input.value.trim())
  }
}

window.hidePredictions = function() {
  const el = document.getElementById('search-predictions')
  if (el) {
    el.classList.add('hidden')
    el.innerHTML = ''
  }
}

function showPredictions(query) {
  const el = document.getElementById('search-predictions')
  if (!el) return

  if (!query || query.length < 1 || cachedProducts.length === 0) {
    el.classList.add('hidden')
    el.innerHTML = ''
    return
  }

  const q = query.toLowerCase()

  // Exact substring matches (case-insensitive)
  const exactMatches = cachedProducts.filter(p =>
    (p.name || '').toLowerCase().includes(q)
  )

  // Fuzzy matches (typos) — Levenshtein distance ≤ 2 and not already in exact matches
  const exactIds = new Set(exactMatches.map(p => p.id))
  const fuzzyMatches = cachedProducts
    .filter(p => !exactIds.has(p.id) && (p.name || '').length > 0)
    .map(p => ({
      ...p,
      distance: levenshtein(q, (p.name || '').toLowerCase().slice(0, q.length + 2))
    }))
    .filter(p => p.distance <= 2)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)

  const allMatches = [...exactMatches.slice(0, 6), ...fuzzyMatches]

  if (allMatches.length === 0) {
    el.classList.add('hidden')
    el.innerHTML = ''
    return
  }

  let html = ''

  exactMatches.slice(0, 6).forEach(p => {
    const img = (p.pictures && p.pictures[0]) ? p.pictures[0] : ''
    const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : ''
    const cat = p.category || ''
    html += `
      <div class="amz-prediction-item" onclick="selectPrediction('${(p.name || '').replace(/'/g, "\\'")}')">
        ${img ? `<img class="amz-prediction-thumb" src="${img}" />` : ''}
        <div class="amz-prediction-info">
          <div class="amz-prediction-name">${highlightMatch(p.name, query)}</div>
          <div class="amz-prediction-meta">${cat}${p.location ? ' · ' + p.location : ''}</div>
        </div>
        ${price ? `<div class="amz-prediction-price">${price}</div>` : ''}
      </div>
    `
  })

  if (fuzzyMatches.length > 0) {
    html += '<div class="amz-prediction-corrected">Did you mean:</div>'
    fuzzyMatches.forEach(p => {
      const img = (p.pictures && p.pictures[0]) ? p.pictures[0] : ''
      const price = p.price ? `$${parseFloat(p.price).toFixed(2)}` : ''
      html += `
        <div class="amz-prediction-item" onclick="selectPrediction('${(p.name || '').replace(/'/g, "\\'")}')">
          ${img ? `<img class="amz-prediction-thumb" src="${img}" />` : ''}
          <div class="amz-prediction-info">
            <div class="amz-prediction-name">${p.name}</div>
            <div class="amz-prediction-meta">Similar to "${query}"</div>
          </div>
          ${price ? `<div class="amz-prediction-price">${price}</div>` : ''}
        </div>
      `
    })
  }

  el.innerHTML = html
  el.classList.remove('hidden')
}

function highlightMatch(name, query) {
  if (!name || !query) return name || ''
  const idx = name.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return name
  return name.slice(0, idx) + '<strong>' + name.slice(idx, idx + query.length) + '</strong>' + name.slice(idx + query.length)
}

window.selectPrediction = function(name) {
  const input = document.getElementById('search-input')
  if (input) input.value = name
  hidePredictions()
  fetchProducts()
}

// =============================================
//  LISTEN FOR AUTH STATE CHANGES
// =============================================
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    checkSessionAndShow()
  })
}

// =============================================
//  INIT — Run on page load
// =============================================
document.addEventListener('DOMContentLoaded', function () {
  initVisitorCounter()
  checkSessionAndShow()
  fetchProducts()
  checkForResetToken()
  loadProductCache()
})

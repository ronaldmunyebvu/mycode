/* ===================================================
   eShop — App Logic
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
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    window.location.href = 'welcome.html'
  } else {
    showToast('🔑 Please Login or Sign Up to advertise your products.')
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
//  LOGIN
// =============================================
window.handleLogin = async function (e) {
  e.preventDefault()
  if (!supabase) {
    showToast('⚠️ Server connection unavailable. Please try again later.')
    return
  }
  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  if (!email || !password) {
    showToast('⚠️ Please fill in all fields.')
    return
  }

  const btn = document.getElementById('btn-login')
  btn.disabled = true
  btn.textContent = '⏳  Signing in…'

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  btn.disabled = false
  btn.innerHTML = '🔐 &nbsp;Login to eShop'

  if (error) {
    if (error.message.toLowerCase().includes('invalid')) {
      showToast('❌ Incorrect email or password.')
    } else {
      showToast('❌ ' + error.message)
    }
    return
  }

  const name = data.user.user_metadata?.username || data.user.email
  showToast('✅ Welcome back, ' + name + '!')
  window.closeAuthModal()
  setTimeout(() => window.location.href = 'welcome.html', 800)
}

// =============================================
//  SIGN UP
// =============================================
window.handleSignup = async function (e) {
  e.preventDefault()
  if (!supabase) {
    showToast('⚠️ Server connection unavailable. Please try again later.')
    return
  }
  const username = document.getElementById('signup-name').value.trim()
  const email    = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value
  const confirm  = document.getElementById('signup-confirm').value

  if (!username || !email || !password || !confirm) {
    showToast('⚠️ Please fill in all fields.')
    return
  }
  if (password !== confirm) {
    showToast('❌ Passwords do not match.')
    return
  }
  if (password.length < 6) {
    showToast('❌ Password must be at least 6 characters.')
    return
  }

  const btn = document.getElementById('btn-signup')
  btn.disabled = true
  btn.textContent = '⏳  Creating account…'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  })

  btn.disabled = false
  btn.innerHTML = '🚀 &nbsp;Create My Account'

  if (error) {
    showToast('❌ ' + error.message)
    return
  }

  if (data.user && data.session) {
    showToast('🎉 Account created! Welcome, ' + username + '!')
    window.closeAuthModal()
    setTimeout(() => window.location.href = 'welcome.html', 800)
  } else {
    showToast('📧 Check your email to confirm your account!')
  }
}

// =============================================
//  LOGOUT
// =============================================
window.handleLogout = async function () {
  if (supabase) await supabase.auth.signOut()
  showToast('👋 You have been logged out.')
  checkSessionAndShow()
  fetchProducts()
}

// =============================================
//  FETCH PRODUCTS (search by name + location sort)
// =============================================
async function fetchProducts() {
  const container = document.getElementById('products-container')
  if (!container) return

  container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Loading available products...</p>'
  
  const nameSearch = (document.getElementById('search-input')?.value || '').trim()
  const locationSearch = (document.getElementById('location-input')?.value || '').trim()

  // Build query — filter by product name if provided
  let query = supabase.from('hookups').select(`
    *,
    hookup_likes ( user_id )
  `).order('created_at', { ascending: false })

  if (nameSearch !== '') {
    query = query.ilike('name', `%${nameSearch}%`)
  }

  const { data, error } = await query
  if (error) {
    container.innerHTML = `<p style="color: #dc2626; text-align: center; padding: 2rem;">Error loading products: ${error.message}</p>`
    return
  }

  container.innerHTML = ''
  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No products available at the moment.</p>'
    return
  }

  // Sort by location if user provided their location
  // Products matching the user's location appear first
  let sortedData = data
  if (locationSearch !== '') {
    const locLower = locationSearch.toLowerCase()
    sortedData = [...data].sort((a, b) => {
      const aMatch = (a.location || '').toLowerCase().includes(locLower) ? 0 : 1
      const bMatch = (b.location || '').toLowerCase().includes(locLower) ? 0 : 1
      return aMatch - bMatch
    })
  }

  const { data: { session } } = await supabase.auth.getSession()

  sortedData.forEach(p => {
    const card = document.createElement('div')
    card.className = 'product-card'
    card.onclick = () => window.openGallery(p.pictures)

    const imagesHtml = (p.pictures || []).map(url => `<img src="${url}" />`).join('')

    const likes = p.hookup_likes || []
    const likeCount = likes.length
    const userLiked = session ? likes.some(l => l.user_id === session.user.id) : false
    const heartColor = userLiked ? '#dc2626' : 'var(--text-muted)'

    // Highlight if product is near user's location
    const isNearby = locationSearch !== '' && (p.location || '').toLowerCase().includes(locationSearch.toLowerCase())
    const nearbyBadge = isNearby ? '<span style="background: var(--lime); color: var(--text-dark); font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-weight: 600; margin-left: 0.5rem;">📍 NEARBY</span>' : ''

    card.innerHTML = `
      <div>
        <h4>${p.name}${nearbyBadge}</h4>
        <p class="product-meta">📍 <strong>Location:</strong> ${p.location}</p>
        <p class="product-meta">📞 <strong>Contact:</strong> ${p.phone}</p>
      </div>
      <p class="product-desc">${p.description}</p>
      <div class="product-images">${imagesHtml}</div>
      <div class="like-btn" onclick="event.stopPropagation(); window.toggleLike('${p.id}', ${userLiked})">
        <span style="color: ${heartColor}; font-size: 1.1rem;">❤️</span>
        <span style="color: var(--text-body); font-size: 0.85rem; font-weight: bold;">${likeCount}</span>
      </div>
    `
    container.appendChild(card)
  })
}
window.fetchProducts = fetchProducts

// =============================================
//  LIKE TOGGLE
// =============================================
window.toggleLike = async function(hookupId, currentlyLiked) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    showToast('⚠️ Please login to like products.')
    window.showAuthModal()
    return
  }
  if (currentlyLiked) {
    await supabase.from('hookup_likes').delete().match({ hookup_id: hookupId, user_id: session.user.id })
  } else {
    await supabase.from('hookup_likes').insert([{ hookup_id: hookupId, user_id: session.user.id }])
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
    `<img src="${url}" style="height: 60vh; max-width: 90vw; object-fit: contain; border-radius: 8px; scroll-snap-align: center; flex-shrink: 0;" />`
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

// =============================================
//  CLOSE OVERLAYS ON BACKDROP CLICK
// =============================================
document.addEventListener('click', function (e) {
  const authOverlay = document.getElementById('auth-overlay')
  const galleryOverlay = document.getElementById('gallery-overlay')
  if (e.target === authOverlay) window.closeAuthModal()
  if (e.target === galleryOverlay) window.closeGallery()
})

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
})

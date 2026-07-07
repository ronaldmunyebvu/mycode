/* ===================================================
   MyCode — App Logic  (Supabase Auth Edition)
   Handles: Disclaimer, Supabase Auth flow,
            Visitor Counter, Particles, Toast
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
//  DISCLAIMER
// =============================================
const DISCLAIMER_KEY = 'mycode_disclaimer_accepted'

function initDisclaimer() {
  const accepted = sessionStorage.getItem(DISCLAIMER_KEY)
  if (accepted === 'true') {
    hideDisclaimer()
    checkSessionAndShow()
  } else {
    const overlay = document.getElementById('disclaimer-overlay')
    overlay.classList.add('active')
    overlay.style.display = 'flex'
  }
}

function hideDisclaimer() {
  const overlay = document.getElementById('disclaimer-overlay')
  overlay.style.opacity = '0'
  overlay.style.transition = 'opacity 0.5s'
  setTimeout(() => {
    overlay.style.display = 'none'
    overlay.classList.remove('active')
  }, 500)
}

window.acceptDisclaimer = function () {
  sessionStorage.setItem(DISCLAIMER_KEY, 'true')
  hideDisclaimer()
  showAuthScreen()
}

// =============================================
//  SESSION CHECK — auto-restore logged-in user
// =============================================
async function checkSessionAndShow() {
  if (!supabase) {
    showAuthScreen()
    return
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    window.location.href = 'welcome.html'
  } else {
    showAuthScreen()
  }
}

// =============================================
//  SCREENS
// =============================================
function showAuthScreen() {
  const auth = document.getElementById('auth-screen')
  auth.classList.remove('hidden')
  auth.classList.add('active')
  auth.style.display = 'flex'
  auth.style.animation = 'fadeIn 0.6s ease'
  spawnParticles('particles')
  updateVisitorDisplays()
}

function showDashboard(user) {
  // Hide auth screen
  const auth = document.getElementById('auth-screen')
  auth.classList.add('hidden')
  auth.style.display = 'none'

  // Show dashboard
  const dash = document.getElementById('dashboard-screen')
  dash.classList.remove('hidden')
  dash.classList.add('active')
  dash.style.display = 'flex'
  dash.style.animation = 'fadeIn 0.6s ease'

  const nameEl = document.getElementById('welcome-username')
  if (nameEl) nameEl.textContent = user.name || 'User'

  spawnParticles('particles2')
  updateVisitorDisplays()
  animateOnlineCount()
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
//  LOGIN  (Supabase signInWithPassword)
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

  // Show loading state
  const btn = document.getElementById('btn-login')
  btn.disabled = true
  btn.textContent = '⏳  Signing in…'

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  btn.disabled = false
  btn.innerHTML = '🔐 &nbsp;Login to MyCode'

  if (error) {
    // Supabase returns a clear error message — show it to the user
    if (error.message.toLowerCase().includes('invalid')) {
      showToast('❌ Incorrect email or password.')
    } else if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('no user')) {
      showToast('❌ No account found with that email.')
    } else {
      showToast('❌ ' + error.message)
    }
    return
  }

  const name = data.user.user_metadata?.username || data.user.email
  showToast('✅ Welcome back, ' + name + '!')
  setTimeout(() => window.location.href = 'welcome.html', 800)
}

// =============================================
//  SIGN UP  (Supabase signUp)
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

  // Show loading state
  const btn = document.getElementById('btn-signup')
  btn.disabled = true
  btn.textContent = '⏳  Creating account…'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },       // stored in user_metadata
    },
  })

  btn.disabled = false
  btn.innerHTML = '🚀 &nbsp;Create My Account'

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      showToast('❌ An account with that email already exists.')
    } else {
      showToast('❌ ' + error.message)
    }
    return
  }

  // Supabase may require email confirmation (depends on your project settings)
  if (data.user && data.session) {
    // Email confirmation is OFF — user is logged in immediately
    showToast('🎉 Account created! Welcome, ' + username + '!')
    setTimeout(() => window.location.href = 'welcome.html', 800)
  } else {
    // Email confirmation is ON — ask user to verify
    showToast('📧 Check your email to confirm your account!')
  }
}

// =============================================
//  LOGOUT  (Supabase signOut)
// =============================================
window.handleLogout = async function () {
  if (supabase) await supabase.auth.signOut()

  const dash = document.getElementById('dashboard-screen')
  dash.classList.add('hidden')
  dash.style.display = 'none'
  dash.classList.remove('active')

  showAuthScreen()
  showToast('👋 You have been logged out.')
}

// =============================================
//  HOOKUP MODAL
// =============================================
window.openHookup = function () {
  const overlay = document.getElementById('hookup-overlay')
  overlay.classList.remove('hidden')
  overlay.style.display = 'flex'
  overlay.style.animation = 'fadeIn 0.4s ease'
}

window.closeHookup = function () {
  const overlay = document.getElementById('hookup-overlay')
  overlay.style.opacity = '0'
  overlay.style.transition = 'opacity 0.3s'
  setTimeout(() => {
    overlay.style.display = 'none'
    overlay.classList.add('hidden')
    overlay.style.opacity = ''
  }, 300)
}

// =============================================
//  TOAST NOTIFICATIONS
// =============================================
let toastTimer = null
function showToast(message) {
  const toast = document.getElementById('toast')
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
//  ANIMATED ONLINE COUNT
// =============================================
function animateOnlineCount() {
  const el = document.getElementById('online-count')
  if (!el) return
  const target  = Math.floor(Math.random() * 500) + 900
  let   current = 0
  const step    = Math.ceil(target / 60)
  const timer   = setInterval(() => {
    current = Math.min(current + step, target)
    el.textContent = current.toLocaleString()
    if (current >= target) clearInterval(timer)
  }, 20)
}

// =============================================
//  PARTICLE EFFECT
// =============================================
function spawnParticles(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return
  container.innerHTML = ''

  const colors = ['#c026d3', '#7c3aed', '#be123c', '#f59e0b', '#e879f9']
  const count  = window.innerWidth > 600 ? 22 : 10

  for (let i = 0; i < count; i++) {
    const p     = document.createElement('div')
    const size  = Math.random() * 8 + 3
    const left  = Math.random() * 100
    const delay = Math.random() * 8
    const dur   = Math.random() * 10 + 8
    const color = colors[Math.floor(Math.random() * colors.length)]

    p.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      bottom: -20px;
      background: ${color};
      border-radius: 50%;
      opacity: 0;
      animation: floatParticle ${dur}s ${delay}s ease-in infinite;
      filter: blur(${size > 7 ? 2 : 0}px);
    `
    container.appendChild(p)
  }
}

// =============================================
//  CLOSE OVERLAYS ON BACKDROP CLICK
// =============================================
document.addEventListener('click', function (e) {
  const hookupOverlay = document.getElementById('hookup-overlay')
  if (e.target === hookupOverlay) window.closeHookup()
})

// =============================================
//  LISTEN FOR AUTH STATE CHANGES (e.g. tab sync)
// =============================================
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      const dash = document.getElementById('dashboard-screen')
      if (dash && !dash.classList.contains('hidden')) {
        dash.classList.add('hidden')
        dash.style.display = 'none'
        dash.classList.remove('active')
        showAuthScreen()
      }
    }
  })
}

// =============================================
//  INIT — Run on page load
// =============================================
document.addEventListener('DOMContentLoaded', function () {
  initVisitorCounter()
  initDisclaimer()
})

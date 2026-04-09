// js/app.js

// --- AUTH GUARD ---
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
const currentPage = window.location.pathname.split('/').pop() || 'index.html';

if (!currentUser && currentPage !== 'login.html') {
  window.location.href = 'login.html';
}

function handleLogout() {
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

const API_BASE = '/api/cart';

// Get or create unique session ID for the DB
function getSessionId() {
  if (currentUser && currentUser.email) {
    return currentUser.email; 
  }
  let sessionId = localStorage.getItem('kiranaSessionId');
  if (!sessionId) {
    sessionId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('kiranaSessionId', sessionId);
  }
  return sessionId;
}

const SESSION_ID = getSessionId();

// Global Cart Array
let cart = [];

// Fetch initial cart from backend
async function initializeCart() {
  try {
    const response = await fetch(`${API_BASE}/${SESSION_ID}`);
    if (!response.ok) throw new Error("API not accessible");
    const cartData = await response.json();

    // Merge product details with cart data
    window.cart = cartData.map(item => {
      const product = window.getProductById(item.id);
      if (!product) return null;
      return { ...product, quantity: item.quantity };
    }).filter(item => item !== null);

    updateCartCount();
    window.dispatchEvent(new Event('cartLoaded'));
  } catch (err) {
    console.error("Error fetching cart from DB API", err);
    // Silent fail if backend is not running, just so UI still works somewhat
  }
}

function updateCartCount() {
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) {
    const totalItems = window.cart.reduce((total, item) => total + item.quantity, 0);
    cartCountEl.textContent = totalItems;
  }
}

async function addToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;
  
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = qtyInput ? parseInt(qtyInput.value) : 1;
  const otherInput = document.getElementById(`other-${productId}`);
  const otherText = otherInput ? otherInput.value.trim() : "";

  // Save "other" details if provided
  if (otherText) {
      let notes = JSON.parse(localStorage.getItem('cartNotes') || '{}');
      notes[productId] = otherText;
      localStorage.setItem('cartNotes', JSON.stringify(notes));
      if (otherInput) otherInput.value = ""; // clear after adding
  }

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID, productId: productId, quantityChange: quantity })
    });

    if (response.ok) {
      await initializeCart();
      showToast(`${quantity} x ${product.name} added to cart`);
    } else {
      throw new Error("Failed to post");
    }
  } catch (err) {
    alert("Database connection error. Is the Node Server and PostgreSQL running?");
    console.error("Failed to add to cart", err);
  }
}

window.changeQty = function(productId, delta) {
  const input = document.getElementById(`qty-${productId}`);
  if (input) {
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
  }
};

function showToast(message) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
    <span>${message}</span>
  `;
  document.getElementById('toast-container').appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Mobile Menu Toggle
function setupMobileMenu() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }
}

// Format currency
function formatPrice(price) {
  return `₹${Number(price).toFixed(2)}`;
}

// Initialize on App Load
document.addEventListener('DOMContentLoaded', async () => {
  setupMobileMenu();
  
  // Fetch products if not already fetched so cart mapping works
  if ((!window.productsData || window.productsData.length === 0) && window.fetchProducts) {
      await window.fetchProducts();
  }

  // Fetch cart data from the server on startup
  if (currentPage !== 'login.html') {
      initializeCart();
  }

  // Display global promo banner
  try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data && data.promoActive && data.promoMessage) {
          const banner = document.createElement('div');
          banner.id = 'promo-top-banner';
          banner.style = "background: linear-gradient(90deg, #1b5e20, #4caf50); color: white; text-align: center; padding: 0.8rem; font-weight: 600; font-size: 0.95rem; position: relative; z-index: 1000; letter-spacing: 0.5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
          banner.innerHTML = `
              <span>🛒 ${data.promoMessage} ✨</span>
              <button onclick="this.parentElement.style.display='none'" style="position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: white; font-size: 1.5rem; cursor: pointer; opacity: 0.8;">&times;</button>
          `;
          document.body.prepend(banner);
      }
  } catch (e) {
      console.error("Could not load promo settings", e);
  }

  // Update navbar for logged in users
  const navLinks = document.getElementById('nav-links');
  if (navLinks && currentUser) {
      const links = navLinks.querySelectorAll('a');
      links.forEach(link => {
          if (link.getAttribute('href') === 'login.html') {
              link.textContent = 'Logout';
              link.href = '#';
              link.onclick = (e) => {
                  e.preventDefault();
                  handleLogout();
              };
          }
      });
  }
});

// Expose globally
window.getSessionId = getSessionId;
window.initializeCart = initializeCart;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.formatPrice = formatPrice;
window.showToast = showToast;

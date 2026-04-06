// js/cart.js

// Wait for Database Cart data to be loaded before rendering
window.addEventListener('cartLoaded', () => {
  if (document.getElementById('cart-items-container')) {
    renderCart();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Usually initializeCart runs instantly before this, but just in case
  if (window.cart && window.cart.length >= 0 && document.getElementById('cart-items-container')) {
    renderCart();
  }
});

function renderCart() {
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartTotalEl = document.getElementById('cart-total');

  if (!cartItemsContainer) return;

  if (window.cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart-msg">
        <h3>Your Cart is Empty</h3>
        <p>Looks like you haven't added any items to your cart yet.</p>
        <a href="products.html" class="btn btn-primary" style="margin-top: 1rem;">Shop Now</a>
      </div>
    `;
    updateTotals(0);
    return;
  }

  cartItemsContainer.innerHTML = '';
  let subtotal = 0;

  window.cart.forEach(item => {
    if (!item || !item.price) return;
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const cartItemEl = document.createElement('div');
    cartItemEl.className = 'cart-item';
    cartItemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <div class="cart-item-price">${formatPrice(item.price)}</div>
      </div>
      <div class="quantity-controls">
        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
        <input type="number" class="qty-input" value="${item.quantity}" readonly>
        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
      </div>
      <div style="width: 80px; text-align: right; font-weight: bold;">
        ${formatPrice(itemTotal)}
      </div>
      <button class="remove-btn" onclick="removeFromCart(${item.id})" title="Remove Item">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
      </button>
    `;
    cartItemsContainer.appendChild(cartItemEl);
  });

  updateTotals(subtotal);
}

async function updateQuantity(productId, change) {
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: window.getSessionId(), productId: productId, quantityChange: change })
    });

    if (response.ok) {
      await window.initializeCart();
    } else {
      alert("Error updating quantity.");
    }
  } catch (err) {
    console.error(err);
  }
}

async function removeFromCart(productId) {
  try {
    const response = await fetch(`/api/cart/${window.getSessionId()}/${productId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      await window.initializeCart();
    }
  } catch (err) {
    console.error(err);
  }
}

function updateTotals(subtotal) {
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartTotalEl = document.getElementById('cart-total');

  if (cartSubtotalEl && cartTotalEl) {
    const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 50) : 0; // Free shipping over 500
    const total = subtotal + shipping;

    cartSubtotalEl.textContent = formatPrice(subtotal);
    document.getElementById('cart-shipping').textContent = shipping === 0 && subtotal > 0 ? "Free" : formatPrice(shipping);
    cartTotalEl.textContent = formatPrice(total);
  }
}

// Checkout Flow
let finalOrderAmount = 0;

window.checkout = function () {
  if (window.cart.length === 0) {
    alert("Please add items to your cart before checking out.");
    return;
  }
  
  // Calculate final sum
  const subtotal = window.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? (subtotal > 500 ? 0 : 50) : 0;
  finalOrderAmount = subtotal + shipping;

  // Inject modal details
  document.getElementById('modal-amount').textContent = `Total: ₹${finalOrderAmount.toFixed(2)}`;
  
  // Set QR Code
  const upiUrl = `upi://pay?pa=9356615701@upi&pn=FreshStore&am=${finalOrderAmount.toFixed(2)}`;
  document.getElementById('qr-code-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  // Open overlay
  document.getElementById('payment-modal').classList.add('active');
}

window.closePaymentModal = function() {
    document.getElementById('payment-modal').classList.remove('active');
}

window.confirmPaymentAndSendOrder = async function() {
    // 1. Build WhatsApp Message
    let orderText = `*New Order - FreshStore*\n\n`;
    orderText += `*Customer Session/Email:* ${window.getSessionId()}\n`;
    orderText += `------------------------\n`;
    
    window.cart.forEach(item => {
        orderText += `▪ ${item.name}\n  ${item.quantity} x ₹${item.price.toFixed(2)} = ₹${(item.quantity * item.price).toFixed(2)}\n`;
    });
    
    orderText += `------------------------\n`;
    orderText += `*Final Amount Paid:* ₹${finalOrderAmount.toFixed(2)}\n\n`;
    orderText += `_Payment completed via website QR/Phone._`;

    // 1.5 Record Order in Database
    try {
        await fetch(`/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail: window.getSessionId(),
                items: window.cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })), // strip huge details to save space
                totalAmount: finalOrderAmount
            })
        });
    } catch(err) {
        console.error("Failed to record order", err);
    }

    // 2. Clear Database Cart
    try {
        const response = await fetch(`/api/cart/${window.getSessionId()}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            await window.initializeCart();
        }
    } catch(err) {
        console.error("Cart clear failed", err);
    }

    // 3. Close modal & Shift to WhatsApp
    closePaymentModal();
    const whatsappUrl = `https://wa.me/919356615701?text=${encodeURIComponent(orderText)}`;
    window.open(whatsappUrl, '_blank');
}

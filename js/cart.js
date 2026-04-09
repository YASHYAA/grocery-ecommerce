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

  const payUpi = document.getElementById('pay-upi');
  if (payUpi) payUpi.checked = true;
  window.togglePaymentMethod();

  // Open overlay
  document.getElementById('payment-modal').classList.add('active');
}

window.togglePaymentMethod = function() {
    const isCod = document.getElementById('pay-cod') && document.getElementById('pay-cod').checked;
    const upiSection = document.getElementById('upi-details-section');
    
    let amountToDisplay = finalOrderAmount;
    if (isCod) {
        amountToDisplay += 20;
        if (upiSection) upiSection.style.display = 'none';
    } else {
        if (upiSection) upiSection.style.display = 'block';
    }
    
    document.getElementById('modal-amount').textContent = `Total: ₹${amountToDisplay.toFixed(2)}`;
    
    if (!isCod) {
        const upiUrl = `upi://pay?pa=9356615701@upi&pn=SiddhiKirana&am=${amountToDisplay.toFixed(2)}`;
        const qrCodeImg = document.getElementById('qr-code-img');
        if(qrCodeImg) qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
    }
}

window.closePaymentModal = function() {
    document.getElementById('payment-modal').classList.remove('active');
}

window.confirmPaymentAndSendOrder = async function() {
    const address = document.getElementById('delivery-address').value.trim();
    if (!address) {
        alert("Please enter a delivery address.");
        return;
    }
    
    const isCod = document.getElementById('pay-cod') && document.getElementById('pay-cod').checked;
    const computedTotal = finalOrderAmount + (isCod ? 20 : 0);

    // 1. Build WhatsApp Message
    let orderText = `*New Order - Siddhi Kirana and General Store*\n\n`;
    orderText += `*Customer Email/Session:* ${window.getSessionId()}\n`;
    orderText += `*Delivery Address:* ${address}\n`;
    orderText += `*Payment Method:* ${isCod ? 'Cash on Delivery (+₹20)' : 'UPI / Online'}\n`;
    orderText += `------------------------\n`;
    
    let cartNotes = JSON.parse(localStorage.getItem('cartNotes') || '{}');

    window.cart.forEach(item => {
        let note = cartNotes[item.id] ? ` (Note: ${cartNotes[item.id]})` : "";
        orderText += `▪ ${item.name}${note}\n  ${item.quantity} x ₹${Number(item.price).toFixed(2)} = ₹${(item.quantity * Number(item.price)).toFixed(2)}\n`;
    });
    
    orderText += `------------------------\n`;
    orderText += `*Final Amount:* ₹${computedTotal.toFixed(2)}\n\n`;
    if(isCod) {
        orderText += `_Please keep ₹${computedTotal.toFixed(2)} ready at delivery time._`;
    } else {
        orderText += `_Payment completed via website QR/Phone._`;
    }

    // 1.5 Record Order in Database
    let orderRecorded = false;
    try {
        const response = await fetch(`/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail: window.getSessionId(),
                address: address, // Send the collected delivery address to backend
                items: window.cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })), // strip huge details to save space
                totalAmount: computedTotal
            })
        });
        if (response.ok) {
            orderRecorded = true;
        } else {
            console.error("Backend error:", await response.text());
        }
    } catch(err) {
        console.error("Failed to record order", err);
    }

    if (!orderRecorded) {
        alert("Database Connection Failed! \n\nThe order could not be saved to the Admin Dashboard.\n\nIMPORTANT: Please ensure you are accessing the site via http://localhost:3000 in your browser, and NOT by opening the local HTML file (file:///). Ensure your Node server is running.");
        return; // Stop here, do not open WhatsApp or clear cart!
    }

    // 2. Clear Database Cart
    try {
        const response = await fetch(`/api/cart/${window.getSessionId()}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            localStorage.removeItem('cartNotes');
            await window.initializeCart();
        }
    } catch(err) {
        console.error("Cart clear failed", err);
    }

    // 3. Close modal & Shift to WhatsApp
    closePaymentModal();
    
    // Show explicit success popup
    alert("Order placed successfully! \n\nClick OK to be redirected to WhatsApp to send your order details to the store.");
    
    const whatsappUrl = `https://wa.me/919356615701?text=${encodeURIComponent(orderText)}`;
    window.location.href = whatsappUrl; // Replaces current tab to avoid browser popup blockers
}

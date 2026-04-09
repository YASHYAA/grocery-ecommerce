// js/products.js

window.productsData = [];

window.fetchProducts = async function() {
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            window.productsData = await response.json();
        } else {
            console.error("Failed to fetch products API");
        }
    } catch(err) {
        console.error("Database connection error. Using empty catalog.", err);
    }
}

function getCategories() {
  const categories = window.productsData.map(p => p.category);
  const uniqueCats = ["All", ...new Set(categories)]; // Unique categories
  if (!uniqueCats.includes("Other")) {
      uniqueCats.push("Other");
  }
  return uniqueCats;
}

function getProductById(id) {
  return window.productsData.find(p => Number(p.id) === Number(id));
}

window.getCategories = getCategories;
window.getProductById = getProductById;

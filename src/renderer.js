// This file contains the code that runs in the renderer process

document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
  // Add console log to debug tab navigation
  console.log('Tabs setup:', {
    sidebarLinks: document.querySelectorAll('.sidebar-nav a[data-tab]'),
    tabContents: document.querySelectorAll('.tab-content'),
    productsTab: document.getElementById('products-tab')
  });
  
  // Detect platform and add appropriate class to body
  // This will be used for platform-specific styling
  if (window.electron && window.electron.platform) {
    const platform = window.electron.platform;
    if (platform === 'win32') {
      document.body.classList.add('platform-win');
    } else if (platform === 'darwin') {
      document.body.classList.add('platform-darwin');
    } else if (platform === 'linux') {
      document.body.classList.add('platform-linux');
    }
  } else {
    // Fallback to navigator.platform if electron info not available
    const platform = navigator.platform.toLowerCase();
    if (platform.includes('win')) {
      document.body.classList.add('platform-win');
    } else if (platform.includes('mac')) {
      document.body.classList.add('platform-darwin');
    } else if (platform.includes('linux')) {
      document.body.classList.add('platform-linux');
    }
  }
  
  // We've removed custom window controls
  // The native window controls will be used instead
  
  // Sidebar toggle functionality
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      document.body.classList.toggle('collapsed-sidebar');
      // Store sidebar state in localStorage
      const isSidebarCollapsed = document.body.classList.contains('collapsed-sidebar');
      localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
      
      // For mobile: Create floating theme toggle when sidebar is collapsed
      updateMobileThemeToggle();
    });
    
    // Check saved sidebar state
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
      document.body.classList.add('collapsed-sidebar');
      // Initialize mobile theme toggle if needed
      updateMobileThemeToggle();
    }
  }
  
  // Function to create/update mobile theme toggle button
  function updateMobileThemeToggle() {
    const isMobile = window.innerWidth <= 768;
    const isSidebarCollapsed = document.body.classList.contains('collapsed-sidebar');
    
    // Remove existing mobile theme toggle if it exists
    const existingToggle = document.querySelector('.theme-toggle-mobile');
    if (existingToggle) {
      existingToggle.remove();
    }
    
    // Create new mobile theme toggle if needed
    if (isMobile && isSidebarCollapsed) {
      const mobileThemeToggle = document.createElement('button');
      mobileThemeToggle.className = 'theme-toggle-mobile';
      mobileThemeToggle.title = 'Toggle Dark Mode';
      
      // Add moon/sun icons based on current theme
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const iconClass = currentTheme === 'light' ? 'fa-moon-o' : 'fa-sun-o';
      mobileThemeToggle.innerHTML = `<i class="fa ${iconClass}"></i>`;
      
      // Add event listener to toggle theme
      mobileThemeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Update icon
        const icon = mobileThemeToggle.querySelector('i');
        icon.className = `fa ${newTheme === 'light' ? 'fa-moon-o' : 'fa-sun-o'}`;
      });
      
      document.body.appendChild(mobileThemeToggle);
    }
  }
  
  // Listen for window resize to update mobile toggle
  window.addEventListener('resize', () => {
    updateMobileThemeToggle();
  });
  
  // Dark mode toggle functionality
  const themeToggleBtn = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;
  
  // Check for saved theme preference or use default
  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  
  // Toggle theme when button is clicked
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
  
  // We're now using CSS to toggle the visibility of the two icons
  // No need to change icon classes dynamically
  
  // Tab navigation via sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.tab;
      
      console.log(`Tab clicked: ${target}`);
      
      // Remove active class from all links and contents
      sidebarLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to selected link and content
      link.classList.add('active');
      const targetTab = document.getElementById(`${target}-tab`);
      if (targetTab) {
        targetTab.classList.add('active');
        console.log(`Activated tab: ${target}-tab`);
      } else {
        console.error(`Tab element not found: ${target}-tab`);
      }
      
      // Update header text based on selected tab
      const contentHeader = document.querySelector('.content-header h1');
      if (contentHeader) {
        contentHeader.textContent = target === 'dashboard' ? 'Project Dashboard' : 'Product Catalog';
      }
      
      // Move db-path-container based on selected tab
      const dbPathContainer = document.getElementById('db-path-container');
      if (dbPathContainer) {
        if (target === 'products') {
          // Show the db path container in the products tab
          const productsHeader = document.querySelector('#products-tab .products-header');
          if (productsHeader) {
            productsHeader.prepend(dbPathContainer);
          }
        } else {
          // Hide the db path container from other tabs
          if (dbPathContainer.parentNode) {
            dbPathContainer.parentNode.removeChild(dbPathContainer);
          }
        }
      }
    });
  });
  
  // Database path functionality
  const selectDbPathBtn = document.getElementById('select-db-path');
  const dbPathContainer = document.getElementById('db-path-container');
  
  // Product functionality
  const productsTableBody = document.getElementById('products-table-body');
  const productsPreview = document.getElementById('products-preview');
  const productSearch = document.getElementById('product-search');
  const categoryFilter = document.getElementById('category-filter');
  
  // Pagination elements
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  
  // Product data state
  let allProducts = [];
  let filteredProducts = [];
  let categories = new Set();
  let currentPage = 1;
  const itemsPerPage = 10;
  
  // Check if database path is already set
  async function checkDatabasePath() {
    if (window.electron && window.electron.database) {
      const dbPath = await window.electron.database.getPath();
      
      if (dbPath) {
        displayDatabasePath(dbPath);
        loadDatabaseSummary(dbPath);
      } else {
        displayNoDatabasePath();
        // Try to load local products.json
        loadProducts();
      }
    } else {
      // If running without Electron, load from local products.json
      loadProducts();
    }
  }
  
  // Display the database path in UI
  function displayDatabasePath(path) {
    if (!dbPathContainer) return;
    
    dbPathContainer.innerHTML = `
      <div class="db-path-display">
        <div class="path">${path}</div>
        <div class="status connected">Connected</div>
      </div>
    `;
  }
  
  // Display when no database path is set
  function displayNoDatabasePath() {
    if (!dbPathContainer) return;
    
    dbPathContainer.innerHTML = `
      <div class="db-path-display">
        <div class="path">No database directory selected</div>
        <div class="status disconnected">Not Connected</div>
      </div>
    `;
  }
  
  // Load database summary and products
  async function loadDatabaseSummary(dbPath) {
    if (window.electron && window.electron.database) {
      try {
        // List all JSON files in the directory
        const result = await window.electron.database.listFiles();
        
        if (result.error) {
          console.error('Error listing files:', result.error);
          return;
        }
        
        // Count files by type
        let productFiles = 0;
        let categoryFiles = 0;
        let salesFiles = 0;
        let customerFiles = 0;
        
        const productFileNames = [];
        
        for (const file of result.files) {
          if (file.includes('product')) {
            productFiles++;
            productFileNames.push(file);
          }
          else if (file.includes('category')) categoryFiles++;
          else if (file.includes('sale')) salesFiles++;
          else if (file.includes('customer')) customerFiles++;
        }
        
        // Update the UI
        const numProductsEl = document.getElementById('num-products');
        const numCategoriesEl = document.getElementById('num-categories');
        const numSalesEl = document.getElementById('num-sales');
        const numCustomersEl = document.getElementById('num-customers');
        
        if (numProductsEl) numProductsEl.textContent = productFiles || '-';
        if (numCategoriesEl) numCategoriesEl.textContent = categoryFiles || '-';
        if (numSalesEl) numSalesEl.textContent = salesFiles || '-';
        if (numCustomersEl) numCustomersEl.textContent = customerFiles || '-';
        
        // Load products data (for the Products tab)
        await loadProducts(productFileNames);
        
      } catch (err) {
        console.error('Error loading database summary:', err);
      }
    }
  }
  
  // Load products from JSON files
  async function loadProducts(fileNames) {
    if (!window.electron || !window.electron.database) {
      // If we're running in development or without Electron, load directly from local file
      try {
        const response = await fetch('/data/products.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Load products from the products.json file structure
        if (data && data.products) {
          console.log("Loaded products from local JSON file:", data.products.length);
          allProducts = data.products;
          
          // Extract categories from both products and category list
          allProducts.forEach(product => {
            if (product.category) {
              categories.add(product.category);
            }
            if (product.subCategory) {
              categories.add(product.subCategory);
            }
          });
          
          // If there's a categories section, use those as well
          if (data.categories) {
            data.categories.forEach(category => {
              categories.add(category.name);
              if (category.subCategories) {
                category.subCategories.forEach(sub => {
                  categories.add(sub.name);
                });
              }
            });
          }
          
          // Update category filter
          updateCategoryFilter();
          
          // Apply initial filtering/search (show all)
          applyFilters();
        }
      } catch (err) {
        console.error('Error loading products from local file:', err);
      }
      return;
    }
    
    try {
      allProducts = [];
      categories.clear(); 
      
      // First, try to load products.json directly
      const result = await window.electron.database.readFile('products.json');
      
      if (!result.error && result.data && result.data.products) {
        // Use the products from products.json
        allProducts = result.data.products;
        
        // Extract categories from products
        allProducts.forEach(product => {
          if (product.category) {
            categories.add(product.category);
          }
          if (product.subCategory) {
            categories.add(product.subCategory);
          }
        });
        
        // If there's a categories section, use those as well
        if (result.data.categories) {
          result.data.categories.forEach(category => {
            categories.add(category.name);
            if (category.subCategories) {
              category.subCategories.forEach(sub => {
                categories.add(sub.name);
              });
            }
          });
        }
      } else {
        // Fallback to loading individual product files if products.json isn't found
        for (const fileName of fileNames) {
          const result = await window.electron.database.readFile(fileName);
          
          if (result.error) {
            console.error(`Error reading file ${fileName}:`, result.error);
            continue;
          }
          
          if (result.data) {
            // Handle both array and single object formats
            const products = Array.isArray(result.data) ? result.data : [result.data];
            
            // Add products to the array
            allProducts = [...allProducts, ...products];
            
            // Extract categories
            products.forEach(product => {
              if (product.category) {
                categories.add(product.category);
              }
              if (product.subCategory) {
                categories.add(product.subCategory);
              }
            });
          }
        }
      }
      
      // Update category filter
      updateCategoryFilter();
      
      // Apply initial filtering/search (show all)
      applyFilters();
      
    } catch (err) {
      console.error('Error loading products:', err);
    }
  }
  
  // Handle database path selection
  if (selectDbPathBtn) {
    selectDbPathBtn.addEventListener('click', async () => {
      if (window.electron && window.electron.database) {
        // Show a folder selection dialog
        const dbPath = await window.electron.database.selectPath();
        
        if (dbPath) {
          displayDatabasePath(dbPath);
          loadDatabaseSummary(dbPath);
          
          // Create the container if it doesn't exist
          let dbPathContainer = document.getElementById('db-path-container');
          if (!dbPathContainer) {
            dbPathContainer = document.createElement('div');
            dbPathContainer.id = 'db-path-container';
            const productsHeader = document.querySelector('#products-tab .products-header');
            if (productsHeader) {
              productsHeader.prepend(dbPathContainer);
            }
          }
          
          // Update database path display
          displayDatabasePath(dbPath);
        }
      }
    });
  }
  
  // Initialize - check if database path is already set
  checkDatabasePath();
  
  // Project card hover effects
  const projectCards = document.querySelectorAll('.project-card');
  projectCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-4px)';
      card.style.boxShadow = '0 4px 12px var(--shadow)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = '0 2px 8px var(--shadow)';
    });
  });
  
  // Project menu interactions (for ellipsis menu)
  const projectMenus = document.querySelectorAll('.project-menu');
  projectMenus.forEach(menu => {
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
      // Here you would show a dropdown menu
      console.log('Project menu clicked');
    });
  });
  
  // Update category filter dropdown
  function updateCategoryFilter() {
    if (!categoryFilter) return;
    
    // Clear existing options (keep the "All Categories" option)
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    // Create a sorted array of categories
    const sortedCategories = Array.from(categories).sort();
    
    // Add options for each category
    sortedCategories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });
  }
  
  // Apply search and filters to products
  function applyFilters() {
    const searchTerm = productSearch ? productSearch.value.toLowerCase() : '';
    const categoryValue = categoryFilter ? categoryFilter.value : '';
    
    // Filter products
    filteredProducts = allProducts.filter(product => {
      // Check if product name or description contains search term
      const nameMatch = product.name && product.name.toLowerCase().includes(searchTerm);
      const descMatch = product.description && product.description.toLowerCase().includes(searchTerm);
      const searchMatch = nameMatch || descMatch;
      
      // Check if product matches category filter
      const categoryMatch = !categoryValue || 
                           (product.category === categoryValue) || 
                           (product.subCategory === categoryValue);
      
      return searchMatch && categoryMatch;
    });
    
    // Sort products by popularity if available, otherwise by name
    filteredProducts.sort((a, b) => {
      if (a.popularity !== undefined && b.popularity !== undefined) {
        return b.popularity - a.popularity; // Higher popularity first
      } else {
        // Fallback to name sort
        return (a.name || '').localeCompare(b.name || '');
      }
    });
    
    // Update table and pagination
    updateProductsTable();
  }
  
  // Display products in the table
  function updateProductsTable() {
    if (!productsTableBody) return;
    
    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    
    // Update pagination controls
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    
    // Get products for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    
    // Clear the table
    productsTableBody.innerHTML = '';
    
    // Show empty state if no products
    if (pageProducts.length === 0) {
      productsTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="7">
            <div class="empty-state">
              <i class="fa fa-cubes"></i>
              <p>No products found matching your search.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    // Add products to table
    pageProducts.forEach(product => {
      const row = document.createElement('tr');
      
      // Determine status based on stock status or explicit status field
      let status = product.status || 'Active';
      let statusClass = 'status-active';
      
      if (status === 'Inactive') {
        statusClass = 'status-inactive';
      } else if (status === 'Out of Stock' || (product.stockStatus && !product.stockStatus.inStock)) {
        status = 'Out of Stock';
        statusClass = 'status-out-of-stock';
      }
      
      // Get stock quantity
      let stockDisplay = 'N/A';
      if (product.stockStatus && product.stockStatus.quantity !== undefined) {
        stockDisplay = product.stockStatus.quantity;
      } else if (product.stock !== undefined) {
        stockDisplay = product.stock;
      } else if (product.stockStatus && product.stockStatus.inStock !== undefined) {
        stockDisplay = product.stockStatus.inStock ? 'In Stock' : 'Out of Stock';
      }
      
      // Format price with currency
      let priceDisplay = formatPrice(product.price, product.currency);
      
      row.innerHTML = `
        <td>${product.id || ''}</td>
        <td>${product.name || ''}</td>
        <td>${product.category || ''} ${product.subCategory ? `/ ${product.subCategory}` : ''}</td>
        <td>${priceDisplay}</td>
        <td>${stockDisplay}</td>
        <td><span class="${statusClass}">${status}</span></td>
        <td>
          <div class="actions">
            <button class="btn-icon" data-action="view" data-id="${product.id}"><i class="fa fa-eye"></i></button>
            <button class="btn-icon" data-action="edit" data-id="${product.id}"><i class="fa fa-edit"></i></button>
          </div>
        </td>
      `;
      
      productsTableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    setupActionButtons();
  }
  
  // We no longer display product preview in the dashboard
  // Project cards are now static in the HTML
  
  // Helper function to format price
  function formatPrice(price, currency = 'USD') {
    if (price === undefined) return '';
    
    const formatOptions = {
      USD: { symbol: '$', position: 'before' },
      EUR: { symbol: '€', position: 'after' },
      GBP: { symbol: '£', position: 'before' },
      NOK: { symbol: 'kr', position: 'after' },
      SEK: { symbol: 'kr', position: 'after' },
      DKK: { symbol: 'kr', position: 'after' }
    };
    
    const currencyFormat = formatOptions[currency] || formatOptions['USD'];
    const formattedPrice = parseFloat(price).toFixed(2);
    
    return currencyFormat.position === 'before' 
      ? `${currencyFormat.symbol}${formattedPrice}`
      : `${formattedPrice} ${currencyFormat.symbol}`;
  }
  
  // Set up action buttons
  function setupActionButtons() {
    const actionButtons = document.querySelectorAll('.actions .btn-icon');
    
    actionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const action = button.dataset.action;
        const productId = button.dataset.id;
        
        if (action === 'view') {
          console.log('View product details:', productId);
          // Implement product detail view
        } else if (action === 'edit') {
          console.log('Edit product:', productId);
          // Implement product edit
        }
      });
    });
  }
  
  // Set up event listeners for search and filter
  if (productSearch) {
    productSearch.addEventListener('input', () => {
      currentPage = 1; // Reset to first page on search
      applyFilters();
    });
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      currentPage = 1; // Reset to first page on filter change
      applyFilters();
    });
  }
  
  // Pagination event listeners
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        updateProductsTable();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        updateProductsTable();
      }
    });
  }
  
  // Example of communicating with the main process (for real data)
  if (window.electron) {
    window.electron.sendToMain('getData', { type: 'products' });
    
    window.electron.receiveFromMain('dataResult', (data) => {
      console.log('Received data from main process:', data);
      // Update UI with the data
    });
    
    // Listen for trigger-open-database event from main process (menu item)
    window.electron.receiveFromMain('trigger-open-database', () => {
      console.log('Triggered database open from menu');
      
      // First, switch to products tab
      const productsLink = document.querySelector('.sidebar-nav a[data-tab="products"]');
      if (productsLink) {
        productsLink.click();
      }
      
      // Then trigger the database path selection
      const selectDbPathBtn = document.getElementById('select-db-path');
      if (selectDbPathBtn) {
        selectDbPathBtn.click();
      }
    });
  }
  
  // Debug function - can be triggered from DevTools
  window.switchToProductsTab = function() {
    console.log('Manually switching to products tab');
    const productsLink = document.querySelector('.sidebar-nav a[data-tab="products"]');
    if (productsLink) {
      productsLink.click();
    } else {
      console.error('Products tab link not found');
    }
  }
});
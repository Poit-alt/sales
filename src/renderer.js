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
    console.log('Checking database path on startup...');
    
    if (window.electron && window.electron.database) {
      // First, check for a data directory in the app's path
      const appDataPath = '/Users/peternordal/Documents/GitHub/sales/data';
      console.log('Checking for app data directory at:', appDataPath);
      
      // Always check for local data directory first
      if (window.electron.database) {
        console.log('Always try to load from local data directory first');
        displayDatabasePath('Local data directory');
        await loadProducts(); // Try to load from local data directory
      }
      
      // Then check for user-selected database path
      const dbPath = await window.electron.database.getPath();
      
      if (dbPath) {
        console.log('Database path is set to:', dbPath);
        displayDatabasePath(dbPath);
        loadDatabaseSummary(dbPath);
      } else {
        console.log('No database path set, using local directory');
        displayNoDatabasePath();
      }
    } else {
      // If running without Electron, load from local products.json
      console.log('No electron context available, loading via fetch');
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
    // Log all parameters to debug
    console.log('loadProducts called with fileNames:', fileNames);
    
    // Get hardcoded path from meta tag
    const storagePath = document.querySelector('meta[name="storage-path"]');
    const hardcodedPath = storagePath ? storagePath.getAttribute('content') : null;
    console.log('Hardcoded storage path from HTML:', hardcodedPath);
    
    // Try to load products.json from the data directory (always try the app data directory first)
    if (window.electron && window.electron.database) {
      try {
        console.log('Attempting to load products.json from app data directory');
        console.log('OVERRIDE: Using hardcoded path for maximum reliability');
        const result = await window.electron.database.readFile('products.json');
        
        if (result && !result.error && result.data && result.data.products) {
          console.log('Successfully loaded products from app data directory:', result.data.products.length, 'products');
          console.log('Product IDs in loaded data:', result.data.products.map(p => p.id).join(', '));
          allProducts = result.data.products;
          
          // Extract categories
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
          
          // Update category filter and apply filters
          updateCategoryFilter();
          applyFilters();
          
          return;
        } else {
          console.log('Failed to read products.json from app data directory:', result);
        }
      } catch (err) {
        console.error('Error loading products from app data directory:', err);
      }
    }
    
    // Fallback to loading via HTTP if electron method failed
    if (!window.electron || !window.electron.database) {
      // If we're running in development or without Electron, load directly from local file
      try {
        console.log('Loading products from local file via fetch');
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
      
      console.log('Loading products using electron database API');
      
      // First, try to load products.json directly
      const result = await window.electron.database.readFile('products.json');
      console.log('Database readFile result:', result);
      
      if (!result.error && result.data && result.data.products) {
        console.log('Successfully loaded products from database:', result.data.products.length);
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
      
      // For bundles, format price to show savings
      let priceColumn = priceDisplay;
      if (product.isBundle && product.regularPrice) {
        const savings = ((product.regularPrice - product.price) / product.regularPrice * 100).toFixed(1);
        priceColumn = `
          <div>${priceDisplay}</div>
          <div class="price-savings">Save ${savings}% from ${formatPrice(product.regularPrice, product.currency)}</div>
        `;
      }
      
      // Show bundle indicator for bundle products
      const nameColumn = product.isBundle 
        ? `<div>${product.name || ''}</div><span class="bundle-indicator">Bundle</span>` 
        : product.name || '';
      
      row.innerHTML = `
        <td>${product.id || ''}</td>
        <td>${nameColumn}</td>
        <td>${product.category || ''} ${product.subCategory ? `/ ${product.subCategory}` : ''}</td>
        <td>${priceColumn}</td>
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
          // Show product details in a modal
          const product = findProductById(productId);
          if (product) {
            showProductDetails(product);
          }
        } else if (action === 'edit') {
          console.log('Edit product:', productId);
          // Open the edit modal
          const product = findProductById(productId);
          if (product) {
            openEditProductModal(product);
          }
        }
      });
    });
  }
  
  // Find a product by its ID
  function findProductById(productId) {
    return allProducts.find(product => product.id === productId);
  }
  
  // Modal functionality
  const productModal = document.getElementById('product-modal');
  const modalClose = document.querySelector('.modal-close');
  const cancelEditBtn = document.getElementById('cancel-edit');
  const productForm = document.getElementById('product-form');
  const addFeatureBtn = document.getElementById('add-feature');
  const featuresContainer = document.getElementById('features-container');
  const addBundleItemBtn = document.getElementById('add-bundle-item');
  const bundleItemsContainer = document.getElementById('bundle-items-container');
  
  // Modal field elements
  const productIdField = document.getElementById('product-id');
  const productTypeField = document.getElementById('product-type');
  const productNameField = document.getElementById('product-name');
  const productDescriptionField = document.getElementById('product-description');
  const productPriceField = document.getElementById('product-price');
  const productRegularPriceField = document.getElementById('product-regular-price');
  const productBundleSavingsField = document.getElementById('product-bundle-savings');
  const productCategoryField = document.getElementById('product-category');
  const productSubcategoryField = document.getElementById('product-subcategory');
  const productCurrencyField = document.getElementById('product-currency');
  const productStatusField = document.getElementById('product-status');
  const productInStockField = document.getElementById('product-instock');
  const productQuantityField = document.getElementById('product-quantity');
  
  // Get all bundle field elements
  const bundleFields = document.querySelectorAll('.bundle-fields');
  
  // Variable to store the currently editing product
  let currentEditingProduct = null;
  
  // Close modal when clicking close button or cancel
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', closeModal);
  }
  
  // Close modal when clicking outside the modal content
  if (productModal) {
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) {
        closeModal();
      }
    });
  }
  
  // Toggle product type fields
  if (productTypeField) {
    productTypeField.addEventListener('change', () => {
      const isBundle = productTypeField.value === 'bundle';
      
      // Show/hide bundle fields
      bundleFields.forEach(field => {
        field.style.display = isBundle ? 'flex' : 'none';
      });
      
      // Update category field with Bundle option
      updateCategoryForProductType(isBundle);
    });
  }
  
  // Add feature button functionality
  if (addFeatureBtn) {
    addFeatureBtn.addEventListener('click', () => {
      addFeatureInput();
    });
  }
  
  // Add bundle item button functionality
  if (addBundleItemBtn) {
    addBundleItemBtn.addEventListener('click', () => {
      addBundleItemInput();
    });
  }
  
  // Handle form submission
  if (productForm) {
    productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProductChanges();
    });
  }
  
  // Update category dropdown based on product type
  function updateCategoryForProductType(isBundle) {
    if (!productCategoryField) return;
    
    const currentValue = productCategoryField.value;
    const hasBundle = Array.from(productCategoryField.options).some(option => option.value === 'Bundle');
    
    if (isBundle && !hasBundle) {
      // Add Bundle category if not already in the list
      const bundleOption = document.createElement('option');
      bundleOption.value = 'Bundle';
      bundleOption.textContent = 'Bundle';
      productCategoryField.appendChild(bundleOption);
      
      // Select it if this is a bundle
      productCategoryField.value = 'Bundle';
    } else if (isBundle && hasBundle) {
      // If it's a bundle and we already have a Bundle option, select it
      productCategoryField.value = 'Bundle';
    }
  }
  
  // Open modal to edit a product
  function openEditProductModal(product) {
    if (!productModal) return;
    
    // Store the current product being edited
    currentEditingProduct = product;
    
    // Set form title
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Edit Product: ${product.name}`;
    }
    
    // Populate form fields
    populateProductForm(product);
    
    // Show the modal
    productModal.classList.add('active');
  }
  
  // Populate the form with product data
  function populateProductForm(product) {
    // Determine if this is a bundle product
    const isBundle = product.isBundle || false;
    
    // Set product type
    if (productTypeField) {
      productTypeField.value = isBundle ? 'bundle' : 'regular';
      
      // Show/hide bundle fields
      bundleFields.forEach(field => {
        field.style.display = isBundle ? 'flex' : 'none';
      });
    }
    
    // Basic fields
    if (productIdField) productIdField.value = product.id || '';
    if (productNameField) productNameField.value = product.name || '';
    if (productDescriptionField) productDescriptionField.value = product.description || '';
    if (productPriceField) productPriceField.value = product.price || '';
    if (productCurrencyField) productCurrencyField.value = product.currency || 'USD';
    if (productStatusField) productStatusField.value = product.status || 'Active';
    
    // Bundle-specific fields
    if (isBundle) {
      if (productRegularPriceField) productRegularPriceField.value = product.regularPrice || '';
      if (productBundleSavingsField) productBundleSavingsField.value = product.bundleSavings || '';
    }
    
    // Stock status
    let inStock = true;
    let quantity = 0;
    
    if (product.stockStatus) {
      inStock = product.stockStatus.inStock !== undefined ? product.stockStatus.inStock : true;
      quantity = product.stockStatus.quantity !== undefined ? product.stockStatus.quantity : 0;
    }
    
    if (productInStockField) productInStockField.checked = inStock;
    if (productQuantityField) productQuantityField.value = quantity;
    
    // Categories
    populateCategoryDropdowns(product.category, product.subCategory);
    
    // Update category for product type
    updateCategoryForProductType(isBundle);
    
    // Features
    populateFeatures(product.features || []);
    
    // Bundle items
    if (isBundle && product.bundleItems) {
      populateBundleItems(product.bundleItems);
    }
  }
  
  // Populate category dropdowns
  function populateCategoryDropdowns(selectedCategory, selectedSubcategory) {
    if (!productCategoryField || !productSubcategoryField) return;
    
    // Clear existing options
    productCategoryField.innerHTML = '';
    productSubcategoryField.innerHTML = '<option value="">None</option>';
    
    // Get unique categories and subcategories
    const mainCategories = new Set();
    const subcategories = new Set();
    
    // Build categories from our data structure
    allProducts.forEach(product => {
      if (product.category) {
        mainCategories.add(product.category);
      }
      if (product.subCategory) {
        subcategories.add(product.subCategory);
      }
    });
    
    // Add main categories
    const sortedCategories = Array.from(mainCategories).sort();
    sortedCategories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      option.selected = category === selectedCategory;
      productCategoryField.appendChild(option);
    });
    
    // Add subcategories
    const sortedSubcategories = Array.from(subcategories).sort();
    sortedSubcategories.forEach(subcategory => {
      const option = document.createElement('option');
      option.value = subcategory;
      option.textContent = subcategory;
      option.selected = subcategory === selectedSubcategory;
      productSubcategoryField.appendChild(option);
    });
  }
  
  // Populate features
  function populateFeatures(features) {
    if (!featuresContainer) return;
    
    // Clear existing features
    featuresContainer.innerHTML = '';
    
    // Add each feature
    if (features && features.length > 0) {
      features.forEach(feature => {
        addFeatureInput(feature);
      });
    }
  }
  
  // Populate bundle items
  function populateBundleItems(bundleItems = []) {
    if (!bundleItemsContainer) return;
    
    // Clear existing bundle items
    bundleItemsContainer.innerHTML = '';
    
    // Add each bundle item
    if (bundleItems && bundleItems.length > 0) {
      bundleItems.forEach(item => {
        addBundleItemInput(item);
      });
    }
  }
  
  // Add a bundle item input
  function addBundleItemInput(bundleItem = null) {
    if (!bundleItemsContainer) return;
    
    const productId = bundleItem?.productId || '';
    const quantity = bundleItem?.quantity || 1;
    
    const bundleItemContainer = document.createElement('div');
    bundleItemContainer.className = 'bundle-item-container';
    
    // Create the bundle item markup
    bundleItemContainer.innerHTML = `
      <div class="bundle-item-header">
        <div class="bundle-item-title">Bundle Item</div>
        <button type="button" class="bundle-item-remove-btn"><i class="fa fa-times"></i></button>
      </div>
      <div class="bundle-item-details">
        <div class="bundle-item-detail">
          <label>Product</label>
          <select class="bundle-item-product-select">
            <option value="">Select a product</option>
            ${generateProductOptionsHTML(productId)}
          </select>
        </div>
        <div class="bundle-item-detail">
          <label>Quantity</label>
          <input type="number" class="bundle-item-quantity" value="${quantity}" min="1" step="1">
        </div>
      </div>
      <div class="bundle-item-preview">
        <div class="bundle-item-preview-content">
          <!-- Will be populated by updateBundleItemPreview -->
        </div>
      </div>
    `;
    
    // Add remove button functionality
    const removeBtn = bundleItemContainer.querySelector('.bundle-item-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        bundleItemContainer.remove();
        updateBundlePriceInfo();
      });
    }
    
    // Add product select change handler
    const productSelect = bundleItemContainer.querySelector('.bundle-item-product-select');
    if (productSelect) {
      productSelect.addEventListener('change', () => {
        updateBundleItemPreview(bundleItemContainer);
        updateBundlePriceInfo();
      });
    }
    
    // Add quantity change handler
    const quantityInput = bundleItemContainer.querySelector('.bundle-item-quantity');
    if (quantityInput) {
      quantityInput.addEventListener('input', () => {
        updateBundleItemPreview(bundleItemContainer);
        updateBundlePriceInfo();
      });
    }
    
    // Add to the container
    bundleItemsContainer.appendChild(bundleItemContainer);
    
    // Update the preview and price info
    updateBundleItemPreview(bundleItemContainer);
    updateBundlePriceInfo();
  }
  
  // Generate HTML for product options
  function generateProductOptionsHTML(selectedProductId = '') {
    // Filter out bundle products from the options to prevent circular references
    const regularProducts = allProducts.filter(product => !product.isBundle);
    
    return regularProducts.map(product => {
      const selected = product.id === selectedProductId ? 'selected' : '';
      return `<option value="${product.id}" ${selected}>${product.name}</option>`;
    }).join('');
  }
  
  // Update bundle item preview
  function updateBundleItemPreview(bundleItemContainer) {
    const productSelect = bundleItemContainer.querySelector('.bundle-item-product-select');
    const quantityInput = bundleItemContainer.querySelector('.bundle-item-quantity');
    const previewContent = bundleItemContainer.querySelector('.bundle-item-preview-content');
    
    if (!productSelect || !quantityInput || !previewContent) return;
    
    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value, 10) || 1;
    
    if (!productId) {
      previewContent.innerHTML = '<p>No product selected</p>';
      return;
    }
    
    const product = findProductById(productId);
    if (product) {
      const totalPrice = product.price * quantity;
      
      previewContent.innerHTML = `
        <div class="bundle-item-preview-img">
          <i class="fa fa-cube"></i>
        </div>
        <div class="bundle-item-preview-info">
          <div class="bundle-item-preview-name">${product.name}</div>
          <div class="bundle-item-preview-price">
            ${quantity} x ${formatPrice(product.price, product.currency)} = ${formatPrice(totalPrice, product.currency)}
          </div>
        </div>
      `;
    } else {
      previewContent.innerHTML = '<p>Product not found</p>';
    }
  }
  
  // Update bundle price information
  function updateBundlePriceInfo() {
    if (!productRegularPriceField || !bundleItemsContainer) return;
    
    // Calculate the total price of all bundle items
    let totalBundleItemsPrice = 0;
    
    const bundleItems = bundleItemsContainer.querySelectorAll('.bundle-item-container');
    bundleItems.forEach(item => {
      const productSelect = item.querySelector('.bundle-item-product-select');
      const quantityInput = item.querySelector('.bundle-item-quantity');
      
      if (productSelect && quantityInput) {
        const productId = productSelect.value;
        const quantity = parseInt(quantityInput.value, 10) || 1;
        
        if (productId) {
          const product = findProductById(productId);
          if (product) {
            totalBundleItemsPrice += product.price * quantity;
          }
        }
      }
    });
    
    // Update the regular price field with the calculated total
    productRegularPriceField.value = totalBundleItemsPrice.toFixed(2);
    
    // Calculate savings percentage if bundle price is set
    if (productPriceField && productPriceField.value) {
      const bundlePrice = parseFloat(productPriceField.value);
      if (bundlePrice > 0 && totalBundleItemsPrice > 0) {
        const savingsPercentage = ((totalBundleItemsPrice - bundlePrice) / totalBundleItemsPrice * 100).toFixed(1);
        
        // Update savings description if available
        if (productBundleSavingsField && !productBundleSavingsField.value) {
          productBundleSavingsField.value = `${savingsPercentage}% off regular price`;
        }
      }
    }
  }
  
  // Add a feature input field
  function addFeatureInput(value = '') {
    if (!featuresContainer) return;
    
    const featureGroup = document.createElement('div');
    featureGroup.className = 'feature-input-group';
    
    featureGroup.innerHTML = `
      <input type="text" class="feature-input" value="${value}" placeholder="Enter feature">
      <button type="button" class="feature-remove-btn"><i class="fa fa-times"></i></button>
    `;
    
    // Add remove button functionality
    const removeBtn = featureGroup.querySelector('.feature-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        featureGroup.remove();
      });
    }
    
    featuresContainer.appendChild(featureGroup);
  }
  
  // Save product changes
  async function saveProductChanges() {
    if (!currentEditingProduct) return;
    
    console.log('Saving changes for product:', currentEditingProduct.id);
    
    // Get product type
    const isBundle = productTypeField ? productTypeField.value === 'bundle' : false;
    
    // Get form values
    const updatedProduct = {
      ...currentEditingProduct,
      id: currentEditingProduct.id, // Make absolutely sure the ID is preserved
      name: productNameField ? productNameField.value : currentEditingProduct.name,
      description: productDescriptionField ? productDescriptionField.value : currentEditingProduct.description,
      price: productPriceField ? parseFloat(productPriceField.value) : currentEditingProduct.price,
      category: productCategoryField ? productCategoryField.value : currentEditingProduct.category,
      subCategory: productSubcategoryField && productSubcategoryField.value ? productSubcategoryField.value : currentEditingProduct.subCategory,
      currency: productCurrencyField ? productCurrencyField.value : currentEditingProduct.currency,
      status: productStatusField ? productStatusField.value : currentEditingProduct.status,
    };
    
    console.log('Original product:', currentEditingProduct);
    console.log('Updated product:', updatedProduct);
    
    // Update bundle-specific properties
    if (isBundle) {
      updatedProduct.isBundle = true;
      
      // Set regular price and bundle savings
      if (productRegularPriceField) {
        updatedProduct.regularPrice = parseFloat(productRegularPriceField.value) || 0;
      }
      
      if (productBundleSavingsField) {
        updatedProduct.bundleSavings = productBundleSavingsField.value || '';
      }
      
      // Collect bundle items
      if (bundleItemsContainer) {
        const bundleItemElements = bundleItemsContainer.querySelectorAll('.bundle-item-container');
        updatedProduct.bundleItems = Array.from(bundleItemElements).map(itemEl => {
          const productSelect = itemEl.querySelector('.bundle-item-product-select');
          const quantityInput = itemEl.querySelector('.bundle-item-quantity');
          
          return {
            productId: productSelect ? productSelect.value : '',
            quantity: quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1
          };
        }).filter(item => item.productId); // Filter out items with no product selected
      }
    } else {
      // Remove bundle properties if this is not a bundle
      updatedProduct.isBundle = false;
      delete updatedProduct.regularPrice;
      delete updatedProduct.bundleSavings;
      delete updatedProduct.bundleItems;
    }
    
    // Update stock status
    updatedProduct.stockStatus = {
      ...(currentEditingProduct.stockStatus || {}),
      inStock: productInStockField ? productInStockField.checked : true,
      quantity: productQuantityField ? parseInt(productQuantityField.value, 10) : 0
    };
    
    // Update features
    if (featuresContainer) {
      const featureInputs = featuresContainer.querySelectorAll('.feature-input');
      updatedProduct.features = Array.from(featureInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    }
    
    // Update product in the allProducts array
    console.log(`Searching for product with ID ${updatedProduct.id} in allProducts array of length ${allProducts.length}`);
    const productIndex = allProducts.findIndex(p => p.id === updatedProduct.id);
    console.log(`Product index in global array: ${productIndex}`);
    
    if (productIndex !== -1) {
      console.log('Product found in allProducts array, updating...');
      allProducts[productIndex] = updatedProduct;
      console.log('Product updated in global array, new value:', allProducts[productIndex]);
      
      // Update the UI
      applyFilters();
      
      // Save to the products.json file
      if (window.electron && window.electron.database) {
        try {
          // First read the current file to get the whole structure
          const result = await window.electron.database.readFile('products.json');
          
          if (!result.error && result.data) {
            // Update the product in the data
            const productsData = result.data;
            
            // Find and update the product in the array
            console.log('Loaded products data with', productsData.products.length, 'products');
            console.log('Current product IDs in file:', productsData.products.map(p => p.id).join(', '));
            
            const fileProductIndex = productsData.products.findIndex(p => p.id === updatedProduct.id);
            console.log(`Finding product with ID ${updatedProduct.id} in file data, index:`, fileProductIndex);
            
            if (fileProductIndex !== -1) {
              console.log('Replacing product in file data');
              productsData.products[fileProductIndex] = updatedProduct;
            } else {
              console.log('Product not found in file data, adding it directly');
              productsData.products.push(updatedProduct);
            }
            
            // Use the direct IPC send approach which is already working
            console.log('Saving product data via IPC...');
            
            // Set up one-time listener for the save result
            const onSaveResult = (result) => {
              // Remove the listener to avoid multiple callbacks
              window.electron.receiveFromMain('save-products-result', onSaveResult);
              
              if (result.success) {
                console.log('Product saved successfully to:', result.path);
                // Show a success message with the save path
                const savedPath = result.path || 'selected database';
                
                // Update the global products array to ensure changes persist in memory
                const updatedProductInGlobal = allProducts.findIndex(p => p.id === updatedProduct.id);
                if (updatedProductInGlobal !== -1) {
                  allProducts[updatedProductInGlobal] = updatedProduct;
                  console.log('Updated product in global products array');
                }
                
                alert(`Product updated and saved successfully to: ${savedPath}`);
              } else {
                console.error('Failed to save via IPC:', result.error);
                alert('Warning: Product was updated in memory but failed to save to file: ' + result.error);
              }
            };
            
            // Register the event listener
            window.electron.receiveFromMain('save-products-result', onSaveResult);
            
            // Send the products data to the main process
            window.electron.sendToMain('save-products', productsData);
          }
        } catch (err) {
          console.error('Error saving product:', err);
          alert('Warning: Product was updated in memory but failed to generate the download');
        }
      }
      
      // Show success message (this will be shown after the save result is received)
      console.log('Product updated successfully in memory:', updatedProduct);
      
      // Close the modal
      closeModal();
    }
  }
  
  // Show product details
  function showProductDetails(product) {
    // In a real app, you might show a detailed view
    // For now, just alert with some basic info
    let details = `
      ID: ${product.id}
      Name: ${product.name}
      Category: ${product.category}${product.subCategory ? ' / ' + product.subCategory : ''}
      Price: ${formatPrice(product.price, product.currency)}
      Status: ${product.status || 'Active'}
    `;
    
    // For bundles, add bundle-specific information
    if (product.isBundle) {
      details += `\nRegular Price: ${formatPrice(product.regularPrice || 0, product.currency)}`;
      details += `\nSavings: ${product.bundleSavings || ''}`;
      
      // Add bundle items
      if (product.bundleItems && product.bundleItems.length > 0) {
        details += '\n\nBundle Contains:';
        product.bundleItems.forEach(item => {
          const bundledProduct = findProductById(item.productId);
          if (bundledProduct) {
            details += `\n- ${item.quantity}x ${bundledProduct.name} (${formatPrice(bundledProduct.price, bundledProduct.currency)} each)`;
          }
        });
      }
    }
    
    alert(details);
  }
  
  // Close the modal
  function closeModal() {
    if (productModal) {
      productModal.classList.remove('active');
    }
    
    // Reset the current editing product
    currentEditingProduct = null;
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
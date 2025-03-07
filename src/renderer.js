// This file contains the code that runs in the renderer process

document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
  // Add console log to debug tab navigation
  console.log('Tabs setup:', {
    sidebarLinks: document.querySelectorAll('.sidebar-nav a[data-tab]'),
    tabContents: document.querySelectorAll('.tab-content'),
    productsTab: document.getElementById('products-tab')
  });
  
  // Add event listeners for modal tabs
  const modalTabs = document.querySelectorAll('.modal-tab');
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Extract tab ID from button ID (modal-tab-details -> details)
      const tabId = tab.id.replace('modal-tab-', '');
      setActiveModalTab(tabId);
    });
  });
  
  // Check settings tab 
  const settingsTab = document.getElementById('settings-tab');
  if (settingsTab) {
    console.log('Settings tab found in DOM:', settingsTab);
    console.log('Settings tab HTML:', settingsTab.innerHTML.substring(0, 100) + '...');
  } else {
    console.error('Settings tab element not found in DOM!');
  }
  
  // Initialize project functionality
  initializeProjectForm();
  initializeProjectDatabase();
  checkProjectsDatabasePath(); // Check for projects database path first
  
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
  
  // Load user settings on startup
  loadUserSettings();
  
  // Debug: Initialize settings menu functionality
  window.switchToSettingsTab = function() {
    console.log('Manually switching to settings tab');
    const settingsLink = document.querySelector('.sidebar-nav a[data-tab="settings"]');
    if (settingsLink) {
      settingsLink.click();
    } else {
      console.error('Settings tab link not found');
    }
  };
  
  // Tab navigation via sidebar
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Debug: List all available tabs
  console.log('Available tabs:', Array.from(tabContents).map(tab => tab.id));
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.tab;
      
      console.log(`Tab clicked: ${target}`);
      console.log(`Looking for tab element with ID: ${target}-tab`);
      
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
      
      // Update header text and action button based on selected tab
      const contentTitle = document.getElementById('content-title');
      const headerActionButton = document.getElementById('header-action-button');
      
      if (contentTitle) {
        // Set appropriate title for each tab
        if (target === 'dashboard') {
          contentTitle.textContent = 'Project Dashboard';
          if (headerActionButton) {
            headerActionButton.innerHTML = '<i class="fa fa-plus"></i> New Project';
            headerActionButton.style.display = 'block';
            
            // Set click handler for new project button
            headerActionButton.onclick = openNewProjectModal;
          }
        } else if (target === 'products') {
          contentTitle.textContent = 'Product Catalog';
          if (headerActionButton) {
            headerActionButton.innerHTML = '<i class="fa fa-plus"></i> New Product';
            headerActionButton.style.display = 'block';
          }
        } else if (target === 'settings') {
          contentTitle.textContent = 'Settings';
          if (headerActionButton) {
            headerActionButton.style.display = 'none'; // Hide action button on settings page
          }
        }
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
      // Check if product id, name or description contains search term
      const idMatch = product.id && product.id.toLowerCase().includes(searchTerm);
      const nameMatch = product.name && product.name.toLowerCase().includes(searchTerm);
      const descMatch = product.description && product.description.toLowerCase().includes(searchTerm);
      const searchMatch = idMatch || nameMatch || descMatch;
      
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
    
    // Populate price history tab
    populatePriceHistory(product);
    
    // Show the modal
    productModal.classList.add('active');
    
    // Set the default active tab
    setActiveModalTab('details');
  }
  
  // Set active modal tab
  function setActiveModalTab(tabId) {
    // Get all tabs and tab contents
    const tabs = document.querySelectorAll('.modal-tab');
    const tabContents = document.querySelectorAll('.modal-tab-content');
    
    // Remove active class from all tabs and contents
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    const selectedTab = document.getElementById(`modal-tab-${tabId}`);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }
    
    const selectedContent = document.querySelector(`.modal-tab-content[data-tab="${tabId}"]`);
    if (selectedContent) {
      selectedContent.classList.add('active');
    }
  }
  
  // Populate price history tab
  function populatePriceHistory(product) {
    const priceHistoryTableBody = document.getElementById('price-history-table-body');
    const priceHistoryEmpty = document.getElementById('price-history-empty');
    const currentPriceDisplay = document.getElementById('current-price-display');
    
    if (!priceHistoryTableBody || !priceHistoryEmpty || !currentPriceDisplay) return;
    
    // Show current price
    const currentPriceFormatted = formatPrice(product.price, product.currency);
    currentPriceDisplay.textContent = currentPriceFormatted;
    
    // Add extra info for bundles
    if (product.isBundle && product.regularPrice) {
      const regularPriceFormatted = formatPrice(product.regularPrice, product.currency);
      currentPriceDisplay.textContent = `${currentPriceFormatted} (Regular: ${regularPriceFormatted})`;
    }
    
    // Clear existing table rows
    priceHistoryTableBody.innerHTML = '';
    
    // Check if price history exists
    if (!product.priceHistory || product.priceHistory.length === 0) {
      // Show empty state and hide table
      priceHistoryEmpty.style.display = 'block';
      document.querySelector('.price-history-table-container').style.display = 'none';
      return;
    }
    
    // Show table and hide empty state
    priceHistoryEmpty.style.display = 'none';
    document.querySelector('.price-history-table-container').style.display = 'block';
    
    // Sort price history by date (most recent first)
    const sortedHistory = [...product.priceHistory].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Add rows for each price change
    sortedHistory.forEach((entry, index) => {
      const row = document.createElement('tr');
      
      // Format date
      const date = new Date(entry.date);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      // Format price and determine if it was an increase or decrease
      const price = formatPrice(entry.price, entry.currency);
      let priceChangeHTML = price;
      
      // Add price change indicator if not the first price (oldest)
      if (index < sortedHistory.length - 1) {
        const nextEntry = sortedHistory[index + 1]; // Next entry is actually the previous in time
        const prevPrice = nextEntry.price;
        const priceDiff = entry.price - prevPrice;
        
        if (priceDiff !== 0) {
          const changePercent = ((priceDiff / prevPrice) * 100).toFixed(1);
          const changeClass = priceDiff > 0 ? 'price-increase change-up' : 'price-decrease change-down';
          const changeSign = priceDiff > 0 ? '+' : '';
          
          priceChangeHTML += ` <span class="price-change ${changeClass}">${changeSign}${changePercent}%</span>`;
        }
      }
      
      // Regular price for bundles
      let regularPriceCell = '-';
      if (entry.regularPrice) {
        regularPriceCell = formatPrice(entry.regularPrice, entry.currency);
      }
      
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${priceChangeHTML}</td>
        <td>${regularPriceCell}</td>
        <td>${entry.currency}</td>
        <td>${entry.changedBy || 'Unknown'}</td>
      `;
      
      priceHistoryTableBody.appendChild(row);
    });
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
          <div class="product-select-wrapper">
            <input type="text" class="bundle-item-product-search" placeholder="Search for product by ID or name...">
            <div class="product-suggestions"></div>
            <input type="hidden" class="bundle-item-product-select" value="${productId}">
          </div>
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
    
    // Add product search functionality
    const productSearch = bundleItemContainer.querySelector('.bundle-item-product-search');
    const productSelect = bundleItemContainer.querySelector('.bundle-item-product-select');
    
    if (productSearch && productSelect) {
      // Initialize search with product name if a product is already selected
      if (productId) {
        const selectedProduct = findProductById(productId);
        if (selectedProduct) {
          productSearch.value = `${selectedProduct.id} - ${selectedProduct.name}`;
        }
      }
      
      // Get suggestion container
      const suggestionsContainer = bundleItemContainer.querySelector('.product-suggestions');
      
      // Use debounce to prevent filtering on every keystroke
      let searchTimeout;
      productSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        
        // Only filter after user stops typing for 200ms
        searchTimeout = setTimeout(() => {
          const searchTerm = productSearch.value.toLowerCase();
          
          // Check if it might be an ID search (no spaces, alphanumeric)
          const isLikelyIdSearch = /^[a-z0-9\-_]+$/.test(searchTerm);
          
          if (isLikelyIdSearch && searchTerm.length >= 1) {
            // If it looks like an ID search, allow shorter search terms
            showSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, bundleItemContainer, true);
          } else if (searchTerm.length >= 2) {
            // Show suggestions when search term is at least 2 characters
            showSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, bundleItemContainer);
          } else {
            // Hide suggestions
            suggestionsContainer.classList.remove('show');
            suggestionsContainer.innerHTML = '';
          }
        }, 200);
      });
      
      // Handle click outside to close suggestions
      document.addEventListener('click', (e) => {
        if (!productSearch.contains(e.target) && !suggestionsContainer.contains(e.target)) {
          suggestionsContainer.classList.remove('show');
        }
      });
      
      // Make it easy to choose from the dropdown after filtering
      productSearch.addEventListener('click', () => {
        // Select all text for easy replacement
        productSearch.select();
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
  
  // Function removed as we no longer need to filter dropdown options
  
  // Show suggestions based on search term
  function showSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, bundleItemContainer, isIdSearch = false) {
    if (!suggestionsContainer) return;
    
    // Clear previous suggestions
    suggestionsContainer.innerHTML = '';
    
    // Add ID search hint
    if (isIdSearch && searchTerm.length === 1) {
      const hintEl = document.createElement('div');
      hintEl.className = 'search-hint';
      hintEl.innerHTML = '<i class="fa fa-info-circle"></i> Continue typing to search by Product ID';
      suggestionsContainer.appendChild(hintEl);
      suggestionsContainer.classList.add('show');
      return;
    }
    
    // Filter out bundle products from suggestions
    const regularProducts = allProducts.filter(product => !product.isBundle);
    
    // Find matching products (max 8 suggestions)
    // First try exact ID match
    let exactIdMatch = regularProducts.find(product => 
      product.id.toLowerCase() === searchTerm
    );
    
    // Then look for partial matches
    const matchingProducts = regularProducts.filter(product => {
      // Skip exact match as we'll add it at the top
      if (exactIdMatch && product.id === exactIdMatch.id) return false;
      
      const idMatch = product.id.toLowerCase().includes(searchTerm);
      const nameMatch = product.name.toLowerCase().includes(searchTerm);
      return idMatch || nameMatch;
    }).slice(0, exactIdMatch ? 7 : 8); // Leave room for exact match if found
    
    // Add exact match at the beginning if found
    if (exactIdMatch) {
      matchingProducts.unshift(exactIdMatch);
    }
    
    if (matchingProducts.length > 0) {
      // Create suggestion elements
      matchingProducts.forEach(product => {
        const suggestionEl = document.createElement('div');
        
        // Check if this is an exact ID match
        const isExactMatch = product.id.toLowerCase() === searchTerm;
        suggestionEl.className = isExactMatch ? 'product-suggestion exact-match' : 'product-suggestion';
        
        // Highlight matching parts
        const idHtml = highlightMatch(product.id, searchTerm);
        const nameHtml = highlightMatch(product.name, searchTerm);
        
        // Format price
        const priceDisplay = formatPrice(product.price, product.currency);
        
        suggestionEl.innerHTML = `
          <span class="product-suggestion-id">${idHtml}</span> - 
          <span class="product-suggestion-name">${nameHtml}</span>
          <div class="product-suggestion-price">${priceDisplay}</div>
          ${isExactMatch ? '<div class="exact-match-indicator">Exact ID Match</div>' : ''}
        `;
        
        // Handle click on suggestion
        suggestionEl.addEventListener('click', () => {
          // Update hidden input with product ID
          productSelect.value = product.id;
          
          // Update the search field
          productSearch.value = `${product.id} - ${product.name}`;
          
          // Hide suggestions
          suggestionsContainer.classList.remove('show');
          
          // Update the UI
          updateBundleItemPreview(bundleItemContainer);
          updateBundlePriceInfo();
        });
        
        suggestionsContainer.appendChild(suggestionEl);
      });
      
      // Show suggestions
      suggestionsContainer.classList.add('show');
    } else {
      // No matches, hide suggestions
      suggestionsContainer.classList.remove('show');
    }
  }
  
  // Highlight matching parts of text
  function highlightMatch(text, searchTerm) {
    if (!text) return '';
    
    const lowerText = text.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    if (!lowerText.includes(lowerSearchTerm)) return text;
    
    const startIndex = lowerText.indexOf(lowerSearchTerm);
    const endIndex = startIndex + lowerSearchTerm.length;
    
    return (
      text.substring(0, startIndex) +
      `<span class="product-suggestion-highlight">${text.substring(startIndex, endIndex)}</span>` +
      text.substring(endIndex)
    );
  }
  
  // Function removed as we no longer need to generate dropdown options
  
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
    
    // Keep track of products to catch duplicates
    const bundleProducts = new Map(); // Map<productId, {count, price, totalQuantity}>
    
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
            // Add to total price
            totalBundleItemsPrice += product.price * quantity;
            
            // Add to product tracking
            if (bundleProducts.has(productId)) {
              // Update existing product entry
              const productInfo = bundleProducts.get(productId);
              productInfo.count++;
              productInfo.totalQuantity += quantity;
            } else {
              // Create new product entry
              bundleProducts.set(productId, {
                count: 1,
                price: product.price,
                totalQuantity: quantity,
                name: product.name
              });
            }
          }
        }
      }
    });
    
    // Check for duplicate products and show warning if needed
    let duplicateWarningContainer = document.getElementById('duplicate-product-warning');
    
    // Remove existing warning if it exists
    if (duplicateWarningContainer) {
      duplicateWarningContainer.remove();
    }
    
    // Find duplicates and show warning if any exist
    const duplicates = Array.from(bundleProducts.entries())
      .filter(([_, info]) => info.count > 1)
      .map(([id, info]) => ({
        id,
        name: info.name,
        count: info.count,
        totalQuantity: info.totalQuantity
      }));
    
    if (duplicates.length > 0) {
      // Create warning element
      duplicateWarningContainer = document.createElement('div');
      duplicateWarningContainer.id = 'duplicate-product-warning';
      duplicateWarningContainer.className = 'bundle-warning';
      
      let warningHTML = `
        <div class="warning-header">
          <i class="fa fa-info-circle"></i> Product Added Multiple Times
        </div>
        <div class="warning-content">
          <p>The following products appear multiple times in this bundle:</p>
          <ul>
      `;
      
      duplicates.forEach(dup => {
        warningHTML += `
          <li><strong>${dup.name}</strong> (${dup.id}) - ${dup.count} times, total quantity: ${dup.totalQuantity}</li>
        `;
      });
      
      warningHTML += `
          </ul>
          <p>Consider consolidating each product into a single entry with the total quantity.</p>
        </div>
      `;
      
      duplicateWarningContainer.innerHTML = warningHTML;
      
      // Insert after bundle items container
      if (bundleItemsContainer.parentNode) {
        bundleItemsContainer.parentNode.insertBefore(duplicateWarningContainer, bundleItemsContainer.nextSibling);
      }
    }
    
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
    
    // Check if price has changed
    const priceChanged = updatedProduct.price !== currentEditingProduct.price;
    const regularPriceChanged = isBundle && 
      productRegularPriceField && 
      parseFloat(productRegularPriceField.value) !== currentEditingProduct.regularPrice;
    
    // If price has changed, add to price history
    if (priceChanged || regularPriceChanged) {
      // Initialize price history array if it doesn't exist
      if (!updatedProduct.priceHistory) {
        updatedProduct.priceHistory = [];
      }
      
      // Create a new price history entry
      const priceHistoryEntry = {
        date: new Date().toISOString(),
        price: updatedProduct.price,
        currency: updatedProduct.currency,
        changedBy: getCurrentUserName() // Get the user's name from settings
      };
      
      // Add bundle specific price data if applicable
      if (isBundle && productRegularPriceField) {
        priceHistoryEntry.regularPrice = parseFloat(productRegularPriceField.value);
      }
      
      // Add the entry to the history
      updatedProduct.priceHistory.push(priceHistoryEntry);
      
      console.log('Price changed, adding to price history:', priceHistoryEntry);
    }
    
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
  
  // Handle saving user settings
  const saveUserSettingsBtn = document.getElementById('save-user-settings');
  if (saveUserSettingsBtn) {
    saveUserSettingsBtn.addEventListener('click', () => {
      saveUserSettings();
    });
  }
  
  // Initialize theme buttons based on current theme
  const themeButtons = document.querySelectorAll('.theme-button');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  
  themeButtons.forEach(button => {
    // Set active class on the button matching the current theme
    if (button.dataset.theme === currentTheme) {
      button.classList.add('active');
    }
    
    // Add click handler to change theme
    button.addEventListener('click', () => {
      const newTheme = button.dataset.theme;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      // Update active class
      themeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
});

// Functions for user settings

// Save user settings to localStorage
function saveUserSettings() {
  const userName = document.getElementById('user-name').value.trim();
  const userRole = document.getElementById('user-role').value;
  
  if (userName) {
    const userSettings = {
      name: userName,
      role: userRole,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    
    // Show success message
    showNotification('User settings saved successfully', 'success');
  } else {
    // Show error message if name is empty
    showNotification('Please enter your name', 'error');
  }
}

// Load user settings from localStorage
function loadUserSettings() {
  const userNameInput = document.getElementById('user-name');
  const userRoleSelect = document.getElementById('user-role');
  
  if (!userNameInput || !userRoleSelect) return;
  
  // Get saved settings from localStorage
  const savedSettings = localStorage.getItem('userSettings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      userNameInput.value = settings.name || '';
      
      // Set role dropdown if it exists in saved settings
      if (settings.role && userRoleSelect.querySelector(`option[value="${settings.role}"]`)) {
        userRoleSelect.value = settings.role;
      }
    } catch (err) {
      console.error('Error loading user settings:', err);
    }
  }
}

// Get current user name
function getCurrentUserName() {
  const savedSettings = localStorage.getItem('userSettings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      return settings.name || 'Anonymous';
    } catch (err) {
      console.error('Error reading user settings:', err);
      return 'Anonymous';
    }
  }
  return 'Anonymous';
}

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Add icon based on type
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-triangle';
  if (type === 'warning') icon = 'exclamation-circle';
  
  notification.innerHTML = `
    <i class="fa fa-${icon}"></i>
    <div class="notification-message">${message}</div>
    <button class="notification-close"><i class="fa fa-times"></i></button>
  `;
  
  // Add to the page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Set up close button
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeNotification(notification);
    });
  }
  
  // Auto close after a delay
  setTimeout(() => {
    closeNotification(notification);
  }, 5000);
}

// Close notification
function closeNotification(notification) {
  notification.classList.remove('show');
  notification.classList.add('hiding');
  
  // Remove from DOM after animation
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// Project management functions

// Projects data store
let projects = [
  // Initial projects are static data from HTML
];

// Open new project modal
function openNewProjectModal() {
  const projectModal = document.getElementById('project-modal');
  if (!projectModal) return;
  
  // Clear form
  const projectForm = document.getElementById('project-form');
  if (projectForm) {
    projectForm.reset();
    
    // Set today's date as default
    const deadlineInput = document.getElementById('project-deadline');
    if (deadlineInput) {
      const today = new Date();
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);
      
      // Format date as YYYY-MM-DD
      const formattedDate = nextMonth.toISOString().split('T')[0];
      deadlineInput.value = formattedDate;
    }
    
    // Clear tasks
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
      tasksContainer.innerHTML = '';
    }
  }
  
  // Set form title
  const modalTitle = document.getElementById('project-modal-title');
  if (modalTitle) {
    modalTitle.textContent = 'Create New Project';
  }
  
  // Update submit button
  const saveButton = document.getElementById('save-project');
  if (saveButton) {
    saveButton.textContent = 'Create Project';
  }
  
  // Show modal
  projectModal.classList.add('active');
  
  // Focus on first field
  setTimeout(() => {
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
      projectNameInput.focus();
    }
  }, 100);
}

// Close project modal
function closeProjectModal() {
  const projectModal = document.getElementById('project-modal');
  if (projectModal) {
    projectModal.classList.remove('active');
  }
}

// Add task input to form
function addTaskInput(taskText = '') {
  const tasksContainer = document.getElementById('tasks-container');
  if (!tasksContainer) return;
  
  const taskGroup = document.createElement('div');
  taskGroup.className = 'task-input-group';
  
  taskGroup.innerHTML = `
    <input type="text" class="task-input" value="${taskText}" placeholder="Enter task description">
    <button type="button" class="task-remove-btn"><i class="fa fa-times"></i></button>
  `;
  
  // Add remove button functionality
  const removeBtn = taskGroup.querySelector('.task-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      taskGroup.remove();
    });
  }
  
  tasksContainer.appendChild(taskGroup);
  
  // Focus on new input
  const newInput = taskGroup.querySelector('.task-input');
  if (newInput) {
    newInput.focus();
  }
}

// Generate unique ID for projects
function generateProjectId() {
  return 'proj-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Save new project
async function saveProject(projectData) {
  // Add to projects array
  projects.push(projectData);
  
  // Get the database path (either user selected or default)
  const dbPath = localStorage.getItem('projectsDatabasePath');
  
  try {
    // First, always save to localStorage as backup
    saveProjectsToStorage();
    
    // Then try saving to file system
    const saveResult = await saveProjectsToDatabase();
    
    // Add project card to UI regardless of save status
    addProjectCardToUI(projectData);
    
    // Show appropriate notification based on save result
    if (saveResult) {
      if (dbPath) {
        showNotification(`Project created and saved to: ${dbPath}`, 'success');
      } else {
        showNotification('Project created and saved successfully', 'success');
      }
    } else {
      // If file save failed but localStorage succeeded
      showNotification('Project created and saved to local browser storage only', 'warning');
    }
    
    return saveResult;
  } catch (err) {
    console.error('Error in saveProject:', err);
    
    // Still add to UI even if save failed
    addProjectCardToUI(projectData);
    
    // Show warning notification
    showNotification('Project created but there was an error saving to file', 'warning');
    
    // Rethrow to allow caller to handle
    throw err;
  }
}

// Check for projects database path
async function checkProjectsDatabasePath() {
  console.log('Checking projects database path on startup...');
  
  if (window.electron && window.electron.database) {
    // Check for a local directory in the app's path
    const appDataPath = '/Users/peternordal/Documents/GitHub/sales/data';
    console.log('Checking for app data directory for projects at:', appDataPath);
    
    // Get saved projects database path
    const dbPath = localStorage.getItem('projectsDatabasePath');
    
    // If custom database path is set, use that first
    if (dbPath) {
      console.log('Projects database path is set to:', dbPath);
      displayProjectsDatabasePath(dbPath);
      
      try {
        // Try to read projects.json from the selected path
        // We're using a custom approach for path handling
        const checkResult = await window.electron.database.readFile('projects.json', dbPath);
        
        if (!checkResult || checkResult.error) {
          console.warn('Could not read projects.json from selected path:', dbPath);
          console.log('Projects file will be created when you save your first project');
          
          // Show notification but keep the path
          showNotification('Projects database will be created when you add a project', 'info');
          
          // Try to load any existing projects from localStorage
          loadProjectsFromStorage();
        } else {
          console.log('Successfully read projects from selected path');
          
          // Load projects from the database
          if (checkResult.data && checkResult.data.projects) {
            projects = checkResult.data.projects;
            refreshProjectsUI();
            console.log('Loaded', projects.length, 'projects from database');
          } else {
            console.log('No projects found in database or invalid format');
            loadProjectsFromStorage();
          }
        }
      } catch (err) {
        console.error('Error checking projects in selected path:', err);
        
        // Try local data directory as fallback
        console.log('Trying to load projects from local data directory instead');
        displayProjectsDatabasePath('Local data directory');
        await loadProjects();
      }
    } else {
      // No custom path, try local data directory
      console.log('No projects database path set, using local directory');
      displayProjectsDatabasePath('Local data directory');
      await loadProjects(); // Try to load from local data directory
    }
  } else {
    // If running without Electron, load from localStorage
    console.log('No electron context available for projects, loading from localStorage');
    loadProjectsFromStorage();
  }
}

// Display the projects database path in UI
function displayProjectsDatabasePath(path) {
  const dbPathContainer = document.getElementById('projects-db-path-container');
  if (!dbPathContainer) return;
  
  dbPathContainer.innerHTML = `
    <div class="db-path-display">
      <div class="path">${path}</div>
      <div class="status connected">Connected</div>
    </div>
  `;
}

// Display when no projects database path is set
function displayNoProjectsDatabasePath() {
  const dbPathContainer = document.getElementById('projects-db-path-container');
  if (!dbPathContainer) return;
  
  dbPathContainer.innerHTML = `
    <div class="db-path-display">
      <div class="path">No projects database directory selected</div>
      <div class="status disconnected">Not Connected</div>
    </div>
  `;
}

// Save projects to file system
async function saveProjectsToDatabase() {
  if (window.electron && window.electron.database) {
    try {
      // Create proper data structure
      const projectsData = { 
        projects: projects,
        meta: {
          updatedAt: new Date().toISOString(),
          updatedBy: getCurrentUserName(),
          version: '1.0'
        }
      };
      
      // Get the selected database path
      const dbPath = localStorage.getItem('projectsDatabasePath');
      if (dbPath) {
        console.log('Using selected database path:', dbPath);
      } else {
        console.log('No database path selected, using default location');
      }
      
      // IMPORTANT: The correct method is saveFile, not writeFile
      console.log('Calling saveFile method with projects.json');
      
      // Send the path along with the data if needed
      let saveParams = {
        fileName: 'projects.json',
        data: projectsData
      };
      
      // Add path if we have one
      if (dbPath) {
        saveParams.path = dbPath;
      }
      
      // Save the file using the proper API method
      const result = await window.electron.database.saveFile('projects.json', projectsData);
      
      // Check result
      if (result && result.error) {
        console.error('Error saving projects to database:', result.error);
        saveProjectsToStorage();
        return false;
      }
      
      console.log('Projects saved successfully to database:', result ? result.path : 'Unknown path');
      return true;
    } catch (err) {
      console.error('Error in saveProjectsToDatabase:', err);
      
      // Try alternative approach if the direct call fails
      try {
        console.log('Trying alternative approach: sending via IPC');
        
        // Get the selected database path
        const dbPath = localStorage.getItem('projectsDatabasePath');
        
        // Create data to send
        const saveData = {
          type: 'projects',
          fileName: 'projects.json',
          data: {
            projects: projects,
            meta: {
              updatedAt: new Date().toISOString(),
              updatedBy: getCurrentUserName(),
              version: '1.0'
            }
          },
          path: dbPath
        };
        
        // Send via IPC channel - 'saveData' is in the whitelist in preload.js
        window.electron.sendToMain('saveData', saveData);
        
        console.log('Data sent via IPC channel');
        
        // Listen for save result
        const savePromise = new Promise((resolve) => {
          const resultHandler = (result) => {
            console.log('Received save result:', result);
            resolve(result);
          };
          
          // Set up listener for the result
          window.electron.receiveFromMain('dataResult', resultHandler);
          
          // Also listen for errors
          window.electron.receiveFromMain('error', (err) => {
            console.error('Error from main process:', err);
            resolve({ success: false, error: err });
          });
        });
        
        // Wait for a response with a timeout
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ success: true, note: 'No explicit confirmation received' }), 1000);
        });
        
        // Use the first result we get
        await Promise.race([savePromise, timeoutPromise]);
        
        // Consider it a success unless we hear otherwise
        return true;
      } catch (ipcErr) {
        console.error('Error saving via IPC:', ipcErr);
        // Fallback to localStorage if both approaches fail
        saveProjectsToStorage();
        return false;
      }
    }
  } else {
    // If no electron context, save to localStorage
    saveProjectsToStorage();
    return true;
  }
}

// Load projects from file system
async function loadProjects() {
  if (window.electron && window.electron.database) {
    try {
      // Get the current database path (if any)
      const dbPath = localStorage.getItem('projectsDatabasePath');
      
      // Try to read projects.json - either from default location or specified path
      const result = await window.electron.database.readFile('projects.json', dbPath);
      
      if (!result || result.error) {
        console.error('Error reading projects.json:', result ? result.error : 'No result');
        
        // Fallback to localStorage if reading from file fails
        loadProjectsFromStorage();
        return;
      }
      
      if (result.data && result.data.projects) {
        console.log('Successfully loaded projects from database:', result.data.projects.length, 'projects');
        projects = result.data.projects;
        refreshProjectsUI();
      } else {
        console.log('No projects found in database or invalid format, using defaults');
        captureInitialProjects();
      }
    } catch (err) {
      console.error('Error loading projects from database:', err);
      
      // Fallback to localStorage if reading from file fails
      loadProjectsFromStorage();
    }
  } else {
    // If no electron context, load from localStorage
    loadProjectsFromStorage();
  }
}

// Save projects to localStorage (as fallback)
function saveProjectsToStorage() {
  localStorage.setItem('projects', JSON.stringify(projects));
}

// Load projects from localStorage (as fallback)
function loadProjectsFromStorage() {
  const savedProjects = localStorage.getItem('projects');
  if (savedProjects) {
    try {
      projects = JSON.parse(savedProjects);
      
      // Update UI with loaded projects
      refreshProjectsUI();
    } catch (err) {
      console.error('Error loading projects from storage:', err);
    }
  } else {
    // Capture initial projects from HTML if no saved projects
    captureInitialProjects();
  }
}

// Initialize project database functionality
function initializeProjectDatabase() {
  const selectProjectsDbPathBtn = document.getElementById('select-projects-db-path');
  
  if (selectProjectsDbPathBtn) {
    selectProjectsDbPathBtn.addEventListener('click', async () => {
      if (window.electron && window.electron.database) {
        try {
          // Show a folder selection dialog
          console.log('Showing folder selection dialog');
          
          // React to the selected-path event
          window.electron.receiveFromMain('selected-path', (path) => {
            if (path) {
              console.log('Path selected via event:', path);
              handleNewDatabasePath(path);
            }
          });
          
          // Call selectPath directly
          const result = await window.electron.database.selectPath();
          
          // Handle direct result if available
          if (result) {
            console.log('Direct result from selectPath:', result);
            
            // Extract path from result (different formats are possible)
            let dbPath = null;
            if (typeof result === 'string') {
              dbPath = result;
            } else if (result.path) {
              dbPath = result.path;
            } else if (result.filePaths && result.filePaths.length > 0) {
              dbPath = result.filePaths[0];
            }
            
            if (dbPath) {
              handleNewDatabasePath(dbPath);
            } else {
              console.log('No valid path found in result');
            }
          }
        } catch (err) {
          console.error('Error selecting database path:', err);
          showNotification('Failed to select database path', 'error');
        }
      } else {
        showNotification('Database selection is not available in this environment', 'warning');
      }
    });
  }
}

// Handle a newly selected database path
function handleNewDatabasePath(dbPath) {
  console.log('User selected database path:', dbPath);
  
  // Save selected path
  localStorage.setItem('projectsDatabasePath', dbPath);
  
  // Update display
  displayProjectsDatabasePath(dbPath);
  
  // Load projects from selected path
  loadProjectsFromDatabase(dbPath);
  
  // Notify the user
  showNotification(`Projects database path set to: ${dbPath}`, 'success');
}

// Load projects from specified database path
async function loadProjectsFromDatabase(dbPath) {
  if (!window.electron || !window.electron.database) {
    return;
  }
  
  try {
    // Store the path in localStorage for future use
    localStorage.setItem('projectsDatabasePath', dbPath);
    
    console.log('Attempting to read projects.json from:', dbPath);
    
    // Since we can't pass the path to readFile directly, we need to first
    // set the path in the main process context, then read the file
    
    // Send path data to the main process
    window.electron.sendToMain('saveData', {
      type: 'database-path',
      path: dbPath
    });
    
    // Now try to read the file (main process should use the path we just sent)
    const checkResult = await window.electron.database.readFile('projects.json');
    
    // Check if we got a valid result
    if (!checkResult || checkResult.error || !checkResult.data) {
      console.log('No existing projects.json found at selected path, will create one when needed');
      showNotification('New projects database will be created when you add your first project', 'info');
      
      // Get any existing projects from localStorage to populate the new database
      loadProjectsFromStorage();
      return;
    }
    
    // Process the successful result
    console.log('Found existing projects database at:', dbPath);
    
    if (checkResult.data.projects && Array.isArray(checkResult.data.projects)) {
      // Valid projects array found
      projects = checkResult.data.projects;
      refreshProjectsUI();
      
      // Show notification
      showNotification(`${projects.length} projects loaded from database`, 'success');
    } else {
      // Got a result but it doesn't have the expected format
      console.warn('Invalid projects data format:', checkResult.data);
      showNotification('Found database file has invalid format', 'warning');
      loadProjectsFromStorage();
    }
  } catch (err) {
    console.error('Error loading projects from database:', err);
    showNotification('Failed to load projects from database', 'error');
    
    // Try an alternative approach - read any available projects file
    try {
      console.log('Trying to read projects from default location');
      const fallbackResult = await window.electron.database.readFile('projects.json');
      
      if (fallbackResult && fallbackResult.data && fallbackResult.data.projects) {
        console.log('Found projects in default location');
        projects = fallbackResult.data.projects;
        refreshProjectsUI();
        showNotification('Projects loaded from default location', 'success');
        return;
      }
    } catch (fallbackErr) {
      console.error('Error in fallback read:', fallbackErr);
    }
    
    // Fallback to localStorage as last resort
    loadProjectsFromStorage();
  }
}

// Capture the initial projects from the HTML structure
function captureInitialProjects() {
  const projectCards = document.querySelectorAll('.project-card');
  
  projects = Array.from(projectCards).map((card, index) => {
    const title = card.querySelector('.project-title')?.textContent || `Project ${index + 1}`;
    const priorityEl = card.querySelector('.project-priority');
    const priority = priorityEl?.textContent.toLowerCase().includes('high') ? 'high' : 
                    (priorityEl?.textContent.toLowerCase().includes('medium') ? 'medium' : 'low');
                    
    const deadlineText = card.querySelector('.project-deadline')?.textContent || '';
    const deadlineMatch = deadlineText.match(/(\w+)\s+(\d+),\s+(\d+)/);
    let deadline = '';
    if (deadlineMatch) {
      const [_, month, day, year] = deadlineMatch;
      const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
      deadline = `${year}-${monthNum.toString().padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    const completionText = card.querySelector('.completion-text')?.textContent || '0% Complete';
    const completion = parseInt(completionText) || 0;
    
    // Generate a unique ID for the project
    const id = generateProjectId();
    
    return {
      id,
      title,
      priority,
      deadline,
      completion,
      client: '',
      description: '',
      tasks: [],
      teamSize: 3,
      budget: 5000,
      createdAt: new Date().toISOString(),
      createdBy: getCurrentUserName()
    };
  });
  
  // Save to localStorage for future use
  saveProjectsToStorage();
}

// Add project card to UI
function addProjectCardToUI(project) {
  const projectGrid = document.querySelector('.project-grid');
  if (!projectGrid) return;
  
  // Format date for display
  const deadlineDate = project.deadline ? new Date(project.deadline) : new Date();
  const formattedDate = deadlineDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  // Create new card element
  const card = document.createElement('div');
  card.className = 'project-card';
  card.dataset.projectId = project.id;
  
  // Determine number of completed tasks if any
  let tasksCountHtml = '';
  if (project.tasks && project.tasks.length > 0) {
    const completedTasks = project.tasks.filter(task => task.completed).length;
    tasksCountHtml = `
      <div class="stat">
        <i class="fa fa-check-circle"></i> ${completedTasks}/${project.tasks.length}
      </div>
    `;
  }
  
  card.innerHTML = `
    <div class="project-card-header">
      <div class="project-priority ${project.priority}">${project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority</div>
      <div class="project-menu"><i class="fa fa-ellipsis-v"></i></div>
    </div>
    <h3 class="project-title">${project.title}</h3>
    <div class="project-details">
      <div class="project-completion">
        <span class="completion-text">${project.completion}% Complete</span>
        <div class="progress-bar">
          <div class="progress" style="width: ${project.completion}%"></div>
        </div>
      </div>
      <div class="project-deadline">
        <i class="fa fa-calendar"></i> Due: ${formattedDate}
      </div>
      <div class="project-team">
        <div class="team-members">
          <img src="https://via.placeholder.com/24" alt="Team Member" class="team-member">
          <img src="https://via.placeholder.com/24" alt="Team Member" class="team-member">
          ${project.teamSize > 2 ? `<span class="team-more">+${project.teamSize - 2}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="project-stats">
      ${tasksCountHtml}
      <div class="stat">
        <i class="fa fa-comment"></i> 0
      </div>
      <div class="stat">
        <i class="fa fa-paperclip"></i> 0
      </div>
    </div>
  `;
  
  // Add hover effect
  card.addEventListener('mouseenter', () => {
    card.style.transform = 'translateY(-4px)';
    card.style.boxShadow = '0 4px 12px var(--shadow)';
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = '0 2px 8px var(--shadow)';
  });
  
  // Add to grid
  projectGrid.prepend(card); // Add at the beginning
  
  // Update project count in summary
  updateProjectCounts();
}

// Update project counts in summary cards
function updateProjectCounts() {
  const projectCountEl = document.getElementById('num-projects');
  if (projectCountEl) {
    // Products count comes from allProducts
    const productsCount = allProducts ? allProducts.length : 0;
    projectCountEl.textContent = productsCount;
  }
  
  // Update other summary cards if needed
}

// Refresh all projects in UI
function refreshProjectsUI() {
  const projectGrid = document.querySelector('.project-grid');
  if (!projectGrid) return;
  
  // Clear existing projects
  projectGrid.innerHTML = '';
  
  // Add all projects
  projects.forEach(project => {
    addProjectCardToUI(project);
  });
}

// Initialize project form event listeners
function initializeProjectForm() {
  const projectForm = document.getElementById('project-form');
  const cancelProjectBtn = document.getElementById('cancel-project');
  const addTaskBtn = document.getElementById('add-task');
  const projectModalCloseBtn = document.querySelector('#project-modal .modal-close');
  
  // Form submission
  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const name = document.getElementById('project-name').value;
      const client = document.getElementById('project-client').value;
      const priority = document.getElementById('project-priority').value;
      const deadline = document.getElementById('project-deadline').value;
      const description = document.getElementById('project-description').value;
      const budget = parseFloat(document.getElementById('project-budget').value) || 0;
      const teamSize = parseInt(document.getElementById('project-team-size').value) || 1;
      
      // Get tasks
      const taskInputs = document.querySelectorAll('#tasks-container .task-input');
      const tasks = Array.from(taskInputs).map(input => ({
        text: input.value.trim(),
        completed: false
      })).filter(task => task.text !== '');
      
      // Create project object
      const projectData = {
        id: generateProjectId(),
        title: name,
        client,
        priority,
        deadline,
        description,
        budget,
        teamSize,
        tasks,
        completion: 0,
        createdAt: new Date().toISOString(),
        createdBy: getCurrentUserName()
      };
      
      // Show loading notification with path info
      const dbPath = localStorage.getItem('projectsDatabasePath');
      if (dbPath) {
        showNotification(`Saving project to ${dbPath}...`, 'info');
      } else {
        showNotification('Saving project...', 'info');
      }
      
      try {
        // Save project (async operation)
        await saveProject(projectData);
        
        // Close modal after successful save
        closeProjectModal();
      } catch (err) {
        console.error('Error saving project:', err);
        showNotification('Error saving project, please try again', 'error');
        // Keep modal open so user can try again
      }
    });
  }
  
  // Cancel button
  if (cancelProjectBtn) {
    cancelProjectBtn.addEventListener('click', closeProjectModal);
  }
  
  // Close button
  if (projectModalCloseBtn) {
    projectModalCloseBtn.addEventListener('click', closeProjectModal);
  }
  
  // Add task button
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      addTaskInput();
    });
  }
  
  // Close modal when clicking outside
  const projectModal = document.getElementById('project-modal');
  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        closeProjectModal();
      }
    });
  }
}
// This file contains the code that runs in the renderer process

// Global product data arrays - made globally accessible with window
window.allProducts = [];
window.filteredProducts = [];

// Function to show a notification message
function showNotification(message, type = 'info') {
  console.log(`Notification (${type}): ${message}`);
  
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);
  }
  
  // Set the message and type
  notification.textContent = message;
  notification.className = `notification ${type}`;
  
  // Show the notification
  notification.classList.add('show');
  
  // Hide after a delay
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Modal input function to replace prompt()
function showInputModal(title, message, defaultValue = '', callback) {
  const inputModal = document.getElementById('input-modal');
  const modalTitle = document.getElementById('input-modal-title');
  const modalLabel = document.getElementById('input-modal-label');
  const modalInput = document.getElementById('input-modal-value');
  const confirmBtn = document.getElementById('input-modal-confirm');
  const cancelBtn = document.getElementById('input-modal-cancel');
  const closeBtn = inputModal.querySelector('.modal-close');
  
  // Set modal content
  modalTitle.textContent = title || 'Enter Information';
  modalLabel.textContent = message || 'Please enter a value:';
  modalInput.value = defaultValue;
  
  // Show the modal
  inputModal.classList.add('active');
  modalInput.focus();
  
  // Handle confirm button
  const handleConfirm = () => {
    const value = modalInput.value.trim();
    inputModal.classList.remove('active');
    if (callback) callback(value);
    cleanup();
  };
  
  // Handle cancel/close
  const handleCancel = () => {
    inputModal.classList.remove('active');
    if (callback) callback(null);
    cleanup();
  };
  
  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };
  
  // Add event listeners
  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  closeBtn.addEventListener('click', handleCancel);
  modalInput.addEventListener('keydown', handleKeyPress);
  
  // Cleanup function to remove event listeners
  function cleanup() {
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    closeBtn.removeEventListener('click', handleCancel);
    modalInput.removeEventListener('keydown', handleKeyPress);
  }
}

// Find a product by its ID (global function)
function findProductById(productId) {
  // Check if we have product data
  if (typeof window.allProducts === 'undefined' || !window.allProducts || !Array.isArray(window.allProducts)) {
    console.error('Product data not available');
    return null;
  }
  
  return window.allProducts.find(product => product && product.id === productId);
}

// Setup print view buttons
function setupPrintViewButtons() {
  const printNowBtn = document.getElementById('print-now-btn');
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const exportExcelBtn = document.getElementById('export-excel-btn');
  const hoursReportBtn = document.getElementById('print-hours-report-btn');
  
  if (printNowBtn) {
    printNowBtn.addEventListener('click', () => {
      const currentProject = getCurrentProject();
      if (currentProject) {
        printContent();
      }
    });
  }
  
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const currentProject = getCurrentProject();
      if (currentProject) {
        if (window.electron && window.electron.print && window.electron.print.printToPDF) {
          printToPDF(currentProject.title);
        } else {
          showNotification('Use the "Save as PDF" option in the print dialog', 'info');
          printContent();
        }
      }
    });
  }
  
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
      const currentProject = getCurrentProject();
      if (currentProject) {
        exportProjectProductsToCSV(currentProject);
      }
    });
  }
  
  if (hoursReportBtn) {
    hoursReportBtn.addEventListener('click', () => {
      const currentProject = getCurrentProject();
      if (currentProject) {
        openHoursReportWindow(currentProject);
      } else {
        showNotification('No project data available for hours report', 'error');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
  // Setup print view buttons
  setupPrintViewButtons();
  
  // Ensure window.allProducts exists and is empty on startup
  if (typeof window.allProducts === 'undefined') {
    console.log('Initializing empty global products array');
    window.allProducts = [];
  }
  
  // Initialize product categories in settings
  initializeProductCategoriesSettings();
  
  // Initialize file dropdown menu
  initializeFileMenu();
  
  // Initialize dashboard stats with zeros until data is loaded
  updateDashboardStatistics(0, 0, 0, 0);
  
  // Add console log to debug tab navigation
  console.log('Tabs setup:', {
    sidebarLinks: document.querySelectorAll('.sidebar-nav a[data-tab]'),
    tabContents: document.querySelectorAll('.tab-content'),
    productsTab: document.getElementById('products-tab')
  });
  
  // Handle clicking outside of project details modal to close it
  const detailsModal = document.getElementById('project-details-modal');
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal) {
        closeProjectDetailsModal(detailsModal);
      }
    });
  }
  
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
  
  // Load user settings from local storage and app data
function loadUserSettings() {
  console.log('Loading user settings...');
  
  // First try to load from localStorage for backward compatibility
  const userName = localStorage.getItem('userName');
  const userRole = localStorage.getItem('userRole');
  const defaultCurrency = localStorage.getItem('defaultCurrency');
  
  // Populate form fields if data exists
  if (userName) {
    const userNameInput = document.getElementById('user-name');
    if (userNameInput) userNameInput.value = userName;
  }
  
  if (userRole) {
    const userRoleSelect = document.getElementById('user-role');
    if (userRoleSelect) userRoleSelect.value = userRole;
  }
  
  if (defaultCurrency) {
    // Set the default currency in the settings page
    const defaultCurrencySelect = document.getElementById('default-currency');
    if (defaultCurrencySelect && defaultCurrencySelect.querySelector(`option[value="${defaultCurrency}"]`)) {
      defaultCurrencySelect.value = defaultCurrency;
    }
    
    // Also update other currency selects throughout the app for consistency
    const currencySelects = document.querySelectorAll('select[id$="-currency"]');
    currencySelects.forEach(select => {
      if (select && select.querySelector(`option[value="${defaultCurrency}"]`)) {
        select.value = defaultCurrency;
      }
    });
  }
  
  // Try to load from app data storage - use same special file approach
  if (window.electron && window.electron.database && window.electron.database.readFile) {
    window.electron.database.readFile('__app_settings__.json')
      .then(result => {
        if (!result.error && result.data) {
          const appSettings = result.data;
          console.log('Loaded app settings:', appSettings);
          
          // Apply user name if set
          if (appSettings.userName) {
            const userNameInput = document.getElementById('user-name');
            if (userNameInput) userNameInput.value = appSettings.userName;
          }
          
          // Apply user role if set
          if (appSettings.userRole) {
            const userRoleSelect = document.getElementById('user-role');
            if (userRoleSelect) userRoleSelect.value = appSettings.userRole;
          }
          
          // Apply default currency if set
          if (appSettings.defaultCurrency) {
            // Set the default currency in the settings page
            const defaultCurrencySelect = document.getElementById('default-currency');
            if (defaultCurrencySelect && defaultCurrencySelect.querySelector(`option[value="${appSettings.defaultCurrency}"]`)) {
              defaultCurrencySelect.value = appSettings.defaultCurrency;
            }
            
            // Also update other currency selects throughout the app for consistency
            const currencySelects = document.querySelectorAll('select[id$="-currency"]');
            currencySelects.forEach(select => {
              if (select && select.querySelector(`option[value="${appSettings.defaultCurrency}"]`)) {
                select.value = appSettings.defaultCurrency;
              }
            });
          }
          
          // Apply categories if they exist
          if (appSettings.categories && Array.isArray(appSettings.categories)) {
            // Store categories for later use
            window.appCategories = appSettings.categories;
            
            // Update the UI
            renderCategoriesInSettings();
          }
        }
      })
      .catch(err => {
        console.error('Error loading settings from app data:', err);
      });
  }
}

// Save user settings to both localStorage and app data
function saveUserSettings() {
  console.log('Saving user settings...');
  
  // Get values from form
  const userNameInput = document.getElementById('user-name');
  const userRoleSelect = document.getElementById('user-role');
  const userName = userNameInput ? userNameInput.value.trim() : '';
  const userRole = userRoleSelect ? userRoleSelect.value : 'staff';
  
  // Get the default currency from settings
  const defaultCurrencySelect = document.getElementById('default-currency');
  const defaultCurrency = defaultCurrencySelect ? defaultCurrencySelect.value : 'USD';
  
  // Get categories from the UI
  const categories = [];
  const categoryItems = document.querySelectorAll('.category-item');
  categoryItems.forEach((item, index) => {
    const categoryId = item.dataset.id;
    const categoryName = item.querySelector('.category-title').textContent.trim();
    
    categories.push({
      id: categoryId,
      name: categoryName,
      order: index
    });
  });
  
  // Save to localStorage for backward compatibility
  localStorage.setItem('userName', userName);
  localStorage.setItem('userRole', userRole);
  localStorage.setItem('defaultCurrency', defaultCurrency);
  
  // Store categories globally
  window.appCategories = categories;
  
  // Create the settings object to save
  const settings = {
    userName,
    userRole,
    defaultCurrency,
    categories
  };
  
  // Save to app data storage - use a special saving approach 
  // to ensure settings go to the app's data directory regardless of database path
  if (window.electron && window.electron.database && window.electron.database.saveFile) {
    // Special parameter to indicate this is app settings, not user data
    const specialFileName = '__app_settings__.json';
    
    window.electron.database.saveFile(specialFileName, settings)
      .then(result => {
        if (result.success) {
          console.log('Settings saved to app data successfully');
          showNotification('Settings saved successfully', 'success');
        } else {
          console.error('Error saving settings to app data:', result.error);
          showNotification('Error saving settings: ' + result.error, 'error');
        }
      })
      .catch(err => {
        console.error('Exception saving settings:', err);
        showNotification('Error saving settings', 'error');
      });
  } else {
    console.log('Electron database API not available, using localStorage only');
    showNotification('Settings saved to browser storage', 'info');
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
  
  // Load currency rates on startup
  loadCurrencyRates();
  
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
  
  // Initialize the products state if needed
  if (typeof window.allProducts === 'undefined') {
    window.allProducts = [];
  }
  if (typeof window.filteredProducts === 'undefined') {
    window.filteredProducts = [];
  }
  let filteredProducts = window.filteredProducts; // Point to the global variable
  let categories = new Set();
  let currentPage = 1;
  const itemsPerPage = 10;
  
  // Check if database path is already set
  async function checkDatabasePath() {
    console.log('Checking database path on startup...');
    
    // Check for a previously saved database path in localStorage
    const lastLoadedPath = localStorage.getItem('lastLoadedDatabasePath');
    console.log('Last loaded database path from localStorage:', lastLoadedPath);
    
    // IMPORTANT: Clear all products at startup
    window.allProducts = [];
    window.filteredProducts = [];
    categories.clear();
    
    if (window.electron && window.electron.database) {
      // First, check for a data directory in the app's path
      const appDataPath = '/Users/peternordal/Documents/GitHub/sales/data';
      console.log('App data directory path:', appDataPath);
      
      // If we have a previously loaded path from localStorage, use ONLY that
      if (lastLoadedPath) {
        console.log('Using database path from localStorage:', lastLoadedPath);
        displayDatabasePath(lastLoadedPath);
        
        // If the path is the local data directory, use loadProducts()
        if (lastLoadedPath === 'Local data directory') {
          console.log('Loading from local data directory based on localStorage setting');
          await loadProducts();
        } else {
          console.log('Loading from custom directory based on localStorage setting:', lastLoadedPath);
          // Force setting the database path in main process
          await window.electron.database.selectPath(lastLoadedPath);
          loadDatabaseSummary(lastLoadedPath);
        }
      } 
      // Otherwise check if there's a path in main process
      else {
        const dbPath = await window.electron.database.getPath();
        if (dbPath) {
          console.log('Database path is set in main process:', dbPath);
          displayDatabasePath(dbPath);
          loadDatabaseSummary(dbPath);
        } else {
          console.log('No database path set anywhere, defaulting to local directory');
          displayDatabasePath('Local data directory');
          await loadProducts(); // Load from local data directory as fallback
        }
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
  
  // Function to update the dashboard statistics
  function updateDashboardStatistics(productsCount, categoriesCount, salesCount = 0, customersCount = 0) {
    // Products count
    const numProductsEl = document.getElementById('num-products');
    if (numProductsEl) {
      numProductsEl.textContent = productsCount || '-';
    }
    
    // Categories count
    const numCategoriesEl = document.getElementById('num-categories');
    if (numCategoriesEl) {
      numCategoriesEl.textContent = categoriesCount || '-';
    }
    
    // Sales count
    const numSalesEl = document.getElementById('num-sales');
    if (numSalesEl) {
      numSalesEl.textContent = salesCount || '-';
    }
    
    // Customers count
    const numCustomersEl = document.getElementById('num-customers');
    if (numCustomersEl) {
      numCustomersEl.textContent = customersCount || '-';
    }
  }

  // Load database summary and products
  async function loadDatabaseSummary(dbPath) {
    if (window.electron && window.electron.database) {
      try {
        // Clear existing products and categories before loading from new location
        console.log("FORCE CLEARING all products array and filtered products");
        window.allProducts = [];
        window.filteredProducts = [];
        filteredProducts = [];
        categories.clear();
        
        // Immediately update UI to show empty state
        if (productsTableBody) {
          productsTableBody.innerHTML = '<tr><td colspan="7">Loading products...</td></tr>';
        }
        
        // Force statistics to reset
        updateDashboardStatistics(0, 0, 0, 0);
        
        // Store this database path in localStorage
        if (dbPath) {
          localStorage.setItem('lastLoadedDatabasePath', dbPath);
        }
        
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
        
        // Update the UI with counts from file system
        updateDashboardStatistics(productFiles, categoryFiles, salesFiles, customerFiles);
        
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
    
    // Always start with empty products and categories - reset EVERYTHING
    console.log('FORCE CLEARING all existing products, filtered products, and categories');
    window.allProducts = [];
    filteredProducts = [];
    window.filteredProducts = [];
    categories.clear();
    
    // Force UI update to show empty state immediately
    if (productsTableBody) {
      productsTableBody.innerHTML = '<tr><td colspan="7">Loading products...</td></tr>';
    }
    
    // Reset statistics to zero
    updateDashboardStatistics(0, 0, 0, 0);
    
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
          
          // Set products directly from the result (we already cleared existing ones above)
          window.allProducts = result.data.products;
          
          // Store the data directory location in localStorage
          localStorage.setItem('lastLoadedDatabasePath', 'Local data directory');
          
          // Extract categories
          window.allProducts.forEach(product => {
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
          
          // Update summary statistics
          updateDashboardStatistics(window.allProducts.length, categories.size);
          
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
          window.allProducts = data.products;
          
          // Extract categories from both products and category list
          window.allProducts.forEach(product => {
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
          
          // Update summary statistics
          updateDashboardStatistics(window.allProducts.length, categories.size);
          
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
      console.log('Loading products using electron database API');
      
      // First, try to load products.json directly
      const result = await window.electron.database.readFile('products.json');
      console.log('Database readFile result:', result);
      
      if (!result.error && result.data && result.data.products) {
        console.log('Successfully loaded products from database:', result.data.products.length);
        // Use the products from products.json
        window.allProducts = result.data.products;
        
        // Extract categories from products
        window.allProducts.forEach(product => {
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
      } else if (fileNames && fileNames.length > 0) {
        // Fallback to loading individual product files if products.json isn't found
        window.allProducts = []; // Ensure we start with empty array
        
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
            window.allProducts = [...window.allProducts, ...products];
            
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
      
      // Update summary statistics
      updateDashboardStatistics(window.allProducts.length, categories.size);
      
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
          // FORCE CLEAR: Delete all products completely before changing databases
          console.log('FORCE CLEARING all products before database switch');
          window.allProducts = [];
          window.filteredProducts = [];
          categories = new Set(); // Reset categories
          
          // Force UI refresh with empty product set
          if (productsTableBody) {
            productsTableBody.innerHTML = '<tr><td colspan="7">Switching databases...</td></tr>';
          }
          
          // Store selected path in localStorage for future reference
          localStorage.setItem('lastLoadedDatabasePath', dbPath);
          
          // Display the new path
          displayDatabasePath(dbPath);
          
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
          
          // Reset statistics to zero to show loading state
          updateDashboardStatistics(0, 0, 0, 0);
          
          // Now load from the new database
          setTimeout(() => {
            // Load with a slight delay to ensure clearing happens first
            loadDatabaseSummary(dbPath);
          }, 100);
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
  
  // Function to show project menu dropdown
  window.showProjectMenu = function(menuElement, project) {
    // Remove any existing dropdown
    const existingDropdown = document.querySelector('.project-dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }
    
    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'project-dropdown';
    
    dropdown.innerHTML = `
      <div class="dropdown-item" data-action="view">
        <i class="fa fa-eye"></i> View Details
      </div>
      <div class="dropdown-item" data-action="edit">
        <i class="fa fa-edit"></i> Edit Project
      </div>
      <div class="dropdown-item" data-action="share">
        <i class="fa fa-share-alt"></i> Share Project
      </div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item" data-action="delete">
        <i class="fa fa-trash"></i> Delete Project
      </div>
    `;
    
    // Position the dropdown
    const rect = menuElement.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
    
    // Add click handlers to dropdown items
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        
        if (action === 'view') {
          navigateToProjectManagement(project);
        } else if (action === 'edit') {
          openEditProjectModal(project);
        } else if (action === 'share') {
          // Not implemented
          showNotification('Sharing not implemented yet', 'info');
        } else if (action === 'delete') {
          confirmDeleteProject(project);
        }
        
        // Close the dropdown
        dropdown.remove();
      });
    });
    
    // Add to body
    document.body.appendChild(dropdown);
    
    // Close when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && !menuElement.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  }
  
  // Confirm project deletion
  function confirmDeleteProject(project) {
    if (confirm(`Are you sure you want to delete the project "${project.title}"?`)) {
      deleteProject(project.id);
    }
  }
  
  // Delete a project
  async function deleteProject(projectId) {
    // Find the project index
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;
    
    // Remove project from array
    projects.splice(projectIndex, 1);
    
    // Save changes
    try {
      await saveProjectsToDatabase();
      showNotification('Project deleted successfully', 'success');
      
      // Refresh UI
      refreshProjectsUI();
    } catch (err) {
      console.error('Error deleting project:', err);
      showNotification('Error deleting project', 'error');
    }
  }
  
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
    
    // Start with empty filtered products
    window.filteredProducts = [];
    
    // Filter products
    window.filteredProducts = window.allProducts.filter(product => {
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
    window.filteredProducts.sort((a, b) => {
      if (a.popularity !== undefined && b.popularity !== undefined) {
        return b.popularity - a.popularity; // Higher popularity first
      } else {
        // Fallback to name sort
        return (a.name || '').localeCompare(b.name || '');
      }
    });
    
    // Update the local reference
    filteredProducts = window.filteredProducts;
    
    // Update table and pagination
    updateProductsTable();
  }
  
  // Display products in the table
  function updateProductsTable() {
    if (!productsTableBody) return;
    
    // Use global filtered products for consistency
    filteredProducts = window.filteredProducts;
    
    // Calculate pagination
    const totalPages = Math.max(1, Math.ceil(window.filteredProducts.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    
    // Update pagination controls
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    
    // Get products for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pageProducts = window.filteredProducts.slice(startIndex, startIndex + itemsPerPage);
    
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
  
  // Use the global findProductById function
  
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
    
    // Installation times
    const timeEngineering = document.getElementById('product-time-engineering');
    const timeProduction = document.getElementById('product-time-production');
    const timeCommissioning = document.getElementById('product-time-commissioning');
    
    // Set installation time values if they exist, otherwise default to 0
    if (timeEngineering) timeEngineering.value = product.installationTime?.engineering || 0;
    if (timeProduction) timeProduction.value = product.installationTime?.production || 0;
    if (timeCommissioning) timeCommissioning.value = product.installationTime?.commissioning || 0;
    
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
    
    // Update installation times
    const timeEngineering = document.getElementById('product-time-engineering');
    const timeProduction = document.getElementById('product-time-production');
    const timeCommissioning = document.getElementById('product-time-commissioning');
    
    updatedProduct.installationTime = {
      engineering: timeEngineering ? parseFloat(timeEngineering.value) || 0 : 0,
      production: timeProduction ? parseFloat(timeProduction.value) || 0 : 0,
      commissioning: timeCommissioning ? parseFloat(timeCommissioning.value) || 0 : 0
    };
    
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
            
            // Use the save-database-file approach for proper path handling
            console.log('Saving product data via save-database-file...');
            
            try {
              // Use window.electron.database.saveFile which respects the selected database path
              const saveResult = await window.electron.database.saveFile('products.json', productsData);
              
              if (saveResult && !saveResult.error) {
                console.log('Product saved successfully with saveFile');
                // Show a success message with the save path
                const savedPath = saveResult.path || 'selected database';
                
                // Update the global products array to ensure changes persist in memory
                const updatedProductInGlobal = allProducts.findIndex(p => p.id === updatedProduct.id);
                if (updatedProductInGlobal !== -1) {
                  allProducts[updatedProductInGlobal] = updatedProduct;
                  console.log('Updated product in global products array');
                }
                
                alert(`Product updated and saved successfully to: ${savedPath}`);
              } else {
                console.error('Failed to save via saveFile:', saveResult ? saveResult.error : 'Unknown error');
                alert('Warning: Product was updated in memory but failed to save to file: ' + (saveResult ? saveResult.error : 'Unknown error'));
              }
            } catch (saveError) {
              console.error('Exception saving via saveFile:', saveError);
              alert('Warning: Product was updated in memory but failed to save to file: ' + saveError.message);
            }
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
    
    // Add installation time information if available
    if (product.installationTime) {
      const totalTime = (product.installationTime.engineering || 0) + 
                        (product.installationTime.production || 0) + 
                        (product.installationTime.commissioning || 0);
      
      if (totalTime > 0) {
        details += `\n\nInstallation Time (hours):`;
        if (product.installationTime.engineering > 0) {
          details += `\n- Engineering: ${product.installationTime.engineering}`;
        }
        if (product.installationTime.production > 0) {
          details += `\n- Production: ${product.installationTime.production}`;
        }
        if (product.installationTime.commissioning > 0) {
          details += `\n- Commissioning: ${product.installationTime.commissioning}`;
        }
        details += `\n- Total: ${totalTime}`;
      }
    }
    
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
      if (data && data.products) {
        allProducts = data.products;
        console.log(`Loaded ${allProducts.length} products from IPC channel`);
      }
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
      // Use our enhanced function that saves to app data too
      saveUserSettings();
    });
  }
  
  // Handle saving currency rates
  const saveCurrencyRatesBtn = document.getElementById('save-currency-rates');
  if (saveCurrencyRatesBtn) {
    saveCurrencyRatesBtn.addEventListener('click', () => {
      saveCurrencyRates();
    });
  }
  
  // Handle saving product categories
  const saveCategoriesBtn = document.getElementById('save-categories');
  if (saveCategoriesBtn) {
    saveCategoriesBtn.addEventListener('click', () => {
      saveProductCategories();
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

// Original save user settings to localStorage function 
// Renamed to avoid conflict with our enhanced version
function saveUserSettingsToLocalStorage() {
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

// Default product categories
const defaultProductCategories = [
  { id: 'hardware', name: 'Hardware', order: 0 },
  { id: 'software', name: 'Software', order: 1 },
  { id: 'services', name: 'Services', order: 2 }
];

// Save product categories
function saveProductCategories() {
  const categoriesList = document.getElementById('product-categories-list');
  if (!categoriesList) return;
  
  // Collect categories from the UI
  const categoryItems = categoriesList.querySelectorAll('.category-item');
  const categories = Array.from(categoryItems).map((item, index) => ({
    id: item.dataset.id || generateCategoryId(),
    name: item.querySelector('.category-title').textContent,
    order: index
  }));
  
  // Save to localStorage for backward compatibility
  localStorage.setItem('productCategories', JSON.stringify(categories));
  
  // Store categories globally
  window.appCategories = categories;
  
  // Save to user settings
  saveUserSettings();
  
  // Show success message
  showNotification('Product categories saved successfully', 'success');
  
  return categories;
}

// Save currency rates
function saveCurrencyRates() {
  const currencyRates = {
    USD: 1.0, // Base currency is always 1.0
    EUR: parseFloat(document.getElementById('rate-EUR').value) || 0.93,
    GBP: parseFloat(document.getElementById('rate-GBP').value) || 0.78,
    NOK: parseFloat(document.getElementById('rate-NOK').value) || 10.5,
    SEK: parseFloat(document.getElementById('rate-SEK').value) || 10.4,
    DKK: parseFloat(document.getElementById('rate-DKK').value) || 6.9
  };
  
  // Save to localStorage
  localStorage.setItem('currencyRates', JSON.stringify(currencyRates));
  
  // Show success message
  showNotification('Currency rates saved successfully', 'success');
  
  return currencyRates;
}

// Load currency rates
function loadCurrencyRates() {
  const rateEUR = document.getElementById('rate-EUR');
  const rateGBP = document.getElementById('rate-GBP');
  const rateNOK = document.getElementById('rate-NOK');
  const rateSEK = document.getElementById('rate-SEK');
  const rateDKK = document.getElementById('rate-DKK');
  
  // Get saved rates from localStorage
  const savedRates = localStorage.getItem('currencyRates');
  if (savedRates) {
    try {
      const rates = JSON.parse(savedRates);
      if (rateEUR) rateEUR.value = rates.EUR || 0.93;
      if (rateGBP) rateGBP.value = rates.GBP || 0.78;
      if (rateNOK) rateNOK.value = rates.NOK || 10.5;
      if (rateSEK) rateSEK.value = rates.SEK || 10.4;
      if (rateDKK) rateDKK.value = rates.DKK || 6.9;
    } catch (err) {
      console.error('Error loading currency rates:', err);
    }
  }
}

// Convert amount from one currency to another
function convertCurrency(amount, fromCurrency, toCurrency) {
  // Get saved rates from localStorage
  const savedRates = localStorage.getItem('currencyRates');
  let rates = {
    USD: 1.0,
    EUR: 0.93,
    GBP: 0.78,
    NOK: 10.5,
    SEK: 10.4,
    DKK: 6.9
  };
  
  if (savedRates) {
    try {
      const parsedRates = JSON.parse(savedRates);
      rates = { ...rates, ...parsedRates };
    } catch (err) {
      console.error('Error parsing currency rates:', err);
    }
  }
  
  // If currencies are the same, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  // Convert to USD as intermediate
  const amountInUSD = amount / rates[fromCurrency];
  
  // Convert from USD to target currency
  return amountInUSD * rates[toCurrency];
}

// Generate a unique ID for categories
function generateCategoryId() {
  return 'cat-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Load product categories
function loadProductCategories() {
  // First check if we have categories in memory from app data
  if (window.appCategories && Array.isArray(window.appCategories) && window.appCategories.length > 0) {
    console.log('Using app categories from memory:', window.appCategories);
    return window.appCategories;
  }
  
  // Then try to load from localStorage for backward compatibility
  const savedCategories = localStorage.getItem('productCategories');
  
  if (savedCategories) {
    try {
      return JSON.parse(savedCategories);
    } catch (err) {
      console.error('Error parsing saved categories:', err);
      return defaultProductCategories;
    }
  }
  
  // Return defaults if no saved categories
  return defaultProductCategories;
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
    
    // Set default currency from last saved preference
    const currencySelect = document.getElementById('project-currency');
    if (currencySelect) {
      const lastUsedCurrency = localStorage.getItem('lastUsedPrintCurrency') || 'USD';
      currencySelect.value = lastUsedCurrency;
    }
    
    // Clear tasks
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
      tasksContainer.innerHTML = '';
    }
    
    // Clear products
    const productsContainer = document.getElementById('project-products-container');
    if (productsContainer) {
      productsContainer.innerHTML = '';
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
    
    // Reset save button's project ID
    const saveButton = document.getElementById('save-project');
    if (saveButton) {
      saveButton.dataset.projectId = '';
      saveButton.textContent = 'Create Project';
    }
    
    // Reset modal title
    const modalTitle = document.getElementById('project-modal-title');
    if (modalTitle) {
      modalTitle.textContent = 'Create New Project';
    }
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

// Add a product input to project form
function addProjectProductInput(productData = null, customContainer = null) {
  const projectProductsContainer = customContainer || document.getElementById('project-products-container');
  if (!projectProductsContainer) return;
  
  const productId = productData?.id || '';
  const quantity = productData?.quantity || 1;
  
  const productGroup = document.createElement('div');
  productGroup.className = 'project-product-group';
  
  productGroup.innerHTML = `
    <div class="project-product-header">
      <div class="project-product-title">Project Product</div>
      <button type="button" class="project-product-remove-btn"><i class="fa fa-times"></i></button>
    </div>
    <div class="project-product-details">
      <div class="project-product-detail">
        <label>Product</label>
        <div class="product-select-wrapper">
          <input type="text" class="project-product-search" placeholder="Search for product by ID or name...">
          <div class="product-suggestions"></div>
          <input type="hidden" class="project-product-select" value="${productId}">
        </div>
      </div>
      <div class="project-product-detail">
        <label>Quantity</label>
        <input type="number" class="project-product-quantity" value="${quantity}" min="1" step="1">
      </div>
    </div>
    <div class="project-product-preview">
      <div class="project-product-preview-content">
        <!-- Will be populated by updateProjectProductPreview -->
      </div>
    </div>
  `;
  
  // Add remove button functionality
  const removeBtn = productGroup.querySelector('.project-product-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      productGroup.remove();
    });
  }
  
  // Add product search functionality
  const productSearch = productGroup.querySelector('.project-product-search');
  const productSelect = productGroup.querySelector('.project-product-select');
  
  if (productSearch && productSelect) {
    // Initialize search with product name if a product is already selected
    if (productId) {
      const selectedProduct = findProductById(productId);
      if (selectedProduct) {
        productSearch.value = `${selectedProduct.id} - ${selectedProduct.name}`;
      }
    }
    
    // Get suggestion container
    const suggestionsContainer = productGroup.querySelector('.product-suggestions');
    
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
          showProjectProductSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, productGroup, true);
        } else if (searchTerm.length >= 2) {
          // Show suggestions when search term is at least 2 characters
          showProjectProductSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, productGroup);
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
  const quantityInput = productGroup.querySelector('.project-product-quantity');
  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      updateProjectProductPreview(productGroup);
    });
  }
  
  // Add to the container
  projectProductsContainer.appendChild(productGroup);
  
  // Update the preview
  updateProjectProductPreview(productGroup);
}

// Show product suggestions for project product selection
function showProjectProductSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, productGroup, isIdSearch = false) {
  if (!suggestionsContainer) return;
  
  // First, ensure we've attempted to load products
  (async function ensureProductsLoaded() {
    if (typeof allProducts === 'undefined' || !allProducts || !allProducts.length) {
      // Show loading message
      console.log('Products not loaded, attempting to load them now');
      suggestionsContainer.innerHTML = '<div class="search-hint"><i class="fa fa-spinner fa-spin"></i> Loading products...</div>';
      suggestionsContainer.classList.add('show');
      
      // Create a simple product array if all else fails
      if (typeof allProducts === 'undefined') {
        console.log('Initializing empty products array');
        window.allProducts = [];
      }
      
      // Try direct database read
      if (window.electron && window.electron.database) {
        console.log('Attempting to read products.json from data directory');
        try {
          // Read directly from local data directory
          const result = await window.electron.database.readFile('products.json');
          
          if (result && result.data && result.data.products) {
            console.log(`Successfully loaded ${result.data.products.length} products from data directory`);
            window.allProducts = result.data.products;
            
            // Now that we have products, try the search again
            showProjectProductSuggestions(searchTerm, suggestionsContainer, productSelect, productSearch, productGroup, isIdSearch);
            return;
          } else {
            console.error('Failed to read products.json properly:', result);
          }
        } catch (err) {
          console.error('Error reading products data file:', err);
        }
      }
      
      // Still no products? Show error
      if (!allProducts || !allProducts.length) {
        console.error('Products data not available after load attempt');
        suggestionsContainer.innerHTML = '<div class="search-hint error"><i class="fa fa-exclamation-circle"></i> Products data not loaded</div>';
        suggestionsContainer.classList.add('show');
        return;
      }
    }
    
    // Continue with search if we've reached this point with products loaded
    continueSearch();
  })();
  
  function continueSearch() {
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
    
    // Log for debugging
    console.log(`Searching for products matching '${searchTerm}' among ${allProducts.length} products`);
    
    // Find matching products (max 8 suggestions)
    // First try exact ID match
    let exactIdMatch = allProducts.find(product => 
      product.id && product.id.toLowerCase() === searchTerm
    );
    
    // Then look for partial matches
    const matchingProducts = allProducts.filter(product => {
      // Skip exact match as we'll add it at the top
      if (exactIdMatch && product.id === exactIdMatch.id) return false;
      
      const idMatch = product.id && product.id.toLowerCase().includes(searchTerm);
      const nameMatch = product.name && product.name.toLowerCase().includes(searchTerm);
      return idMatch || nameMatch;
    }).slice(0, exactIdMatch ? 7 : 8); // Leave room for exact match if found
    
    // Add exact match at the beginning if found
    if (exactIdMatch) {
      matchingProducts.unshift(exactIdMatch);
    }
    
    if (matchingProducts.length > 0) {
      // Create suggestion elements
      matchingProducts.forEach(product => {
        if (!product || !product.id) return; // Skip invalid products
        
        const suggestionEl = document.createElement('div');
        
        // Check if this is an exact ID match
        const isExactMatch = product.id.toLowerCase() === searchTerm;
        suggestionEl.className = isExactMatch ? 'product-suggestion exact-match' : 'product-suggestion';
        
        // Highlight matching parts
        const idHtml = highlightMatch(product.id || '', searchTerm);
        const nameHtml = highlightMatch(product.name || 'Unknown Product', searchTerm);
        
        // Format price
        const priceDisplay = formatPrice(product.price || 0, product.currency);
        
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
          productSearch.value = `${product.id} - ${product.name || 'Unknown Product'}`;
          
          // Hide suggestions
          suggestionsContainer.classList.remove('show');
          
          // Update the UI
          updateProjectProductPreview(productGroup);
        });
        
        suggestionsContainer.appendChild(suggestionEl);
      });
      
      // Show suggestions
      suggestionsContainer.classList.add('show');
    } else {
      // No matches, display a message
      const noMatchesEl = document.createElement('div');
      noMatchesEl.className = 'search-hint';
      noMatchesEl.innerHTML = '<i class="fa fa-info-circle"></i> No matching products found';
      suggestionsContainer.appendChild(noMatchesEl);
      suggestionsContainer.classList.add('show');
    }
  }
}

// Using the global findProductById function defined at the top of the file

// Format price with currency
function formatPrice(price, currency = 'USD') {
  if (price === undefined || price === null) return '';
  
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

// Highlight matching parts of text
function highlightMatch(text, searchTerm) {
  if (!text || !searchTerm) return text || '';
  
  const lowerText = text.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  if (!lowerText.includes(lowerSearchTerm)) return text;
  
  const startIndex = lowerText.indexOf(lowerSearchTerm);
  const endIndex = startIndex + lowerSearchTerm.length;
  
  return (
    text.substring(0, startIndex) +
    `<span class="match-highlight">${text.substring(startIndex, endIndex)}</span>` +
    text.substring(endIndex)
  );
}

// Update project product preview
function updateProjectProductPreview(productGroup) {
  const productSelect = productGroup.querySelector('.project-product-select');
  const quantityInput = productGroup.querySelector('.project-product-quantity');
  const previewContent = productGroup.querySelector('.project-product-preview-content');
  
  if (!productSelect || !quantityInput || !previewContent) return;
  
  const productId = productSelect.value;
  const quantity = parseInt(quantityInput.value, 10) || 1;
  
  if (!productId) {
    previewContent.innerHTML = '<p>No product selected</p>';
    return;
  }
  
  // Use an async function to load products if needed
  (async function loadProductsIfNeeded() {
    // Make sure allProducts is available
    if (typeof allProducts === 'undefined' || !allProducts || !allProducts.length) {
      // Show loading message
      previewContent.innerHTML = '<p><i class="fa fa-spinner fa-spin"></i> Loading products...</p>';
      
      // Create a simple product array if all else fails
      if (typeof allProducts === 'undefined') {
        console.log('Initializing empty products array');
        window.allProducts = [];
      }
      
      // Try direct database read
      if (window.electron && window.electron.database) {
        console.log('Attempting to read products.json from data directory');
        try {
          // Read directly from local data directory
          const result = await window.electron.database.readFile('products.json');
          
          if (result && result.data && result.data.products) {
            console.log(`Successfully loaded ${result.data.products.length} products from data directory`);
            window.allProducts = result.data.products;
            
            // Now that we have products, update the preview
            updatePreview();
            return;
          } else {
            console.error('Failed to read products.json properly:', result);
          }
        } catch (err) {
          console.error('Error reading products data file:', err);
        }
      }
      
      // Still no products? Show error
      if (!allProducts || !allProducts.length) {
        previewContent.innerHTML = '<p class="error-message">Products data not available</p>';
        return;
      }
    }
    
    // Continue with preview if we have products loaded
    updatePreview();
  })();
  
  function updatePreview() {
    // Use our safe findProductById function
    const product = findProductById(productId);
    if (product) {
      const price = product.price || 0;
      const totalPrice = price * quantity;
      
      previewContent.innerHTML = `
        <div class="project-product-preview-img">
          <i class="fa fa-cube"></i>
        </div>
        <div class="project-product-preview-info">
          <div class="project-product-preview-name">${product.name || 'Unknown Product'}</div>
          <div class="project-product-preview-price">
            ${quantity} x ${formatPrice(price, product.currency)} = ${formatPrice(totalPrice, product.currency)}
          </div>
        </div>
      `;
    } else {
      previewContent.innerHTML = '<p>Product not found</p>';
    }
  }
}

// Generate unique ID for projects
function generateProjectId() {
  return 'proj-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Save new or update existing project
async function saveProject(projectData) {
  // Check if project already exists
  const existingIndex = projects.findIndex(p => p.id === projectData.id);
  
  if (existingIndex >= 0) {
    // Update existing project
    projects[existingIndex] = projectData;
  } else {
    // Add new project to projects array
    projects.push(projectData);
  }
  
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
  
  // Determine number of products if any
  let productsCountHtml = '';
  if (project.products && project.products.length > 0) {
    // Calculate total product value
    let totalValue = 0;
    project.products.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        totalValue += productDetails.price * product.quantity;
      }
    });
    
    // Format total value
    const formattedValue = formatMoney(totalValue);
    
    productsCountHtml = `
      <div class="stat" title="Total Product Value: ${formattedValue}">
        <i class="fa fa-cubes"></i> ${project.products.length}
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
      ${productsCountHtml}
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
  
  // Add click handler to navigate to project management window
  card.addEventListener('click', (e) => {
    // Don't trigger if clicking on menu button or other interactive elements
    if (e.target.closest('.project-menu') || e.target.closest('.btn-icon')) {
      return;
    }
    
    // Find the project and navigate to project management
    const projectId = card.dataset.projectId;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      navigateToProjectManagement(project);
    }
  });
  
  // Add to grid
  projectGrid.prepend(card); // Add at the beginning
  
  // Add menu button functionality
  const menuButton = card.querySelector('.project-menu');
  if (menuButton) {
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      window.showProjectMenu(menuButton, project);
    });
  }
  
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
  
  // Add all active projects to the grid
  const activeProjects = projects.filter(project => 
    !project.status || project.status === 'active' || project.status === 'Active'
  );
  
  activeProjects.forEach(project => {
    addProjectCardToUI(project);
  });
  
  // Update the upcoming deadlines section with non-active projects
  updateNonActiveProjectsList();
  
  // Initialize project menu interactions for newly created cards
  const projectMenus = document.querySelectorAll('.project-menu');
  projectMenus.forEach(menu => {
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Get the project card and project ID
      const card = menu.closest('.project-card');
      if (!card) return;
      
      const projectId = card.dataset.projectId;
      if (!projectId) return;
      
      // Find the project
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      // Create and show dropdown menu
      window.showProjectMenu(menu, project);
    });
  });
}

// Update the Upcoming Deadlines section with non-active status projects
function updateNonActiveProjectsList() {
  const upcomingDeadlinesTable = document.querySelector('#dashboard-tab table tbody');
  if (!upcomingDeadlinesTable) return;
  
  // Clear existing rows
  upcomingDeadlinesTable.innerHTML = '';
  
  // Get non-active projects
  const nonActiveProjects = projects.filter(project => 
    project.status && project.status !== 'active' && project.status !== 'Active'
  );
  
  // If no non-active projects found, show a message
  if (nonActiveProjects.length === 0) {
    upcomingDeadlinesTable.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">
          <div class="empty-state">
            <i class="fa fa-info-circle"></i>
            <p>No projects with non-active status found.</p>
          </div>
        </td>
      </tr>
    `;
    
    // Update the heading to reflect what we're showing
    const upcomingDeadlinesHeading = document.querySelector('#dashboard-tab h2:nth-of-type(2)');
    if (upcomingDeadlinesHeading) {
      upcomingDeadlinesHeading.textContent = 'Non-Active Projects';
    }
    
    return;
  }
  
  // Sort by deadline date (most urgent first)
  nonActiveProjects.sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });
  
  // Update the heading to reflect what we're showing
  const upcomingDeadlinesHeading = document.querySelector('#dashboard-tab h2:nth-of-type(2)');
  if (upcomingDeadlinesHeading) {
    upcomingDeadlinesHeading.textContent = 'Non-Active Projects';
  }
  
  // Add each non-active project to the table
  nonActiveProjects.forEach(project => {
    // Format date for display
    const deadlineDate = project.deadline ? new Date(project.deadline) : new Date();
    const formattedDate = deadlineDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    // Create status HTML based on project status
    let statusHTML = '';
    const status = project.status || 'Unknown';
    
    switch (status.toLowerCase()) {
      case 'completed':
        statusHTML = `<span class="status-completed">Completed</span>`;
        break;
      case 'on hold':
        statusHTML = `<span class="status-on-hold">On Hold</span>`;
        break;
      case 'cancelled':
        statusHTML = `<span class="status-cancelled">Cancelled</span>`;
        break;
      case 'pending':
        statusHTML = `<span class="status-pending">Pending</span>`;
        break;
      default:
        statusHTML = `<span class="status-${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span>`;
    }
    
    // Create the row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="project-cell">
        <div class="project-info">
          <span class="project-name">${project.title}</span>
          <span class="project-client">${project.client || 'No client'}</span>
        </div>
      </td>
      <td>${statusHTML}</td>
      <td>${project.createdBy || 'Unknown'}</td>
      <td>${formattedDate}</td>
      <td>
        <div class="progress-bar">
          <div class="progress" style="width: ${project.completion}%"></div>
        </div>
      </td>
      <td>
        <div class="actions">
          <button class="btn-icon" data-project-id="${project.id}" data-action="view"><i class="fa fa-eye"></i></button>
          <button class="btn-icon" data-project-id="${project.id}" data-action="edit"><i class="fa fa-edit"></i></button>
          <button class="btn-icon" data-project-id="${project.id}" data-action="menu"><i class="fa fa-ellipsis-v"></i></button>
        </div>
      </td>
    `;
    
    upcomingDeadlinesTable.appendChild(row);
  });
  
  // Add event listeners to action buttons
  upcomingDeadlinesTable.querySelectorAll('.btn-icon[data-project-id]').forEach(button => {
    button.addEventListener('click', (e) => {
      const projectId = button.dataset.projectId;
      const action = button.dataset.action;
      
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      if (action === 'view') {
        // Navigate to project management window
        navigateToProjectManagement(project);
      } else if (action === 'edit') {
        // Edit project by opening the project modal with data
        openEditProjectModal(project);
      } else if (action === 'share') {
        // Share project (not implemented yet)
        showNotification('Sharing not implemented yet', 'info');
      } else if (action === 'menu') {
        // Show dropdown menu for this project
        window.showProjectMenu(button, project);
      }
    });
  });
}

// Navigate to project management window
function navigateToProjectManagement(project) {
  // Show project details modal with full functionality
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  // Store the current active tab before opening the modal
  const currentActiveTab = document.querySelector('.sidebar-nav a.active');
  const currentActiveTabId = currentActiveTab ? currentActiveTab.dataset.tab : null;
  
  // Also store this on the modal for retrieval when closing
  if (currentActiveTabId) {
    detailsModal.dataset.previousActiveTab = currentActiveTabId;
  }
  
  // Store the current project to the modal for future access
  detailsModal.dataset.projectId = project.id;
  
  // Set the project title
  const modalTitle = document.getElementById('project-details-title');
  if (modalTitle) {
    modalTitle.textContent = project.title;
  }
  
  // Populate all tabs with project data
  populateProjectDetailsModal(project);
  
  // Show the modal
  detailsModal.classList.add('active');
  
  // Default to products tab for project management
  activateTab('products');
}

// Helper function to populate all tabs of the project details modal
function populateProjectDetailsModal(project) {
  if (!project) return;
  
  // Fill in general information
  document.getElementById('details-status').textContent = project.status || 'Active';
  document.getElementById('details-priority').textContent = 
    (project.priority.charAt(0).toUpperCase() + project.priority.slice(1)) || 'Medium';
  document.getElementById('details-client').textContent = project.client || 'None';
  
  // Format date for display
  let deadlineText = 'Not set';
  if (project.deadline) {
    const deadlineDate = new Date(project.deadline);
    deadlineText = deadlineDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  document.getElementById('details-deadline').textContent = deadlineText;
  
  // Completion, budget, etc.
  document.getElementById('details-completion').textContent = `${project.completion || 0}%`;
  // Team size and budget fields removed
  document.getElementById('details-created-by').textContent = project.createdBy || 'Unknown';
  
  // Description
  const descriptionEl = document.getElementById('details-description');
  descriptionEl.textContent = project.description || 'No description provided.';
  
  // Tasks
  const tasksEl = document.getElementById('details-tasks');
  tasksEl.innerHTML = '';
  
  if (project.tasks && project.tasks.length > 0) {
    project.tasks.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = 'task-item';
      
      taskItem.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'completed' : ''}">
          ${task.completed ? '<i class="fa fa-check"></i>' : ''}
        </div>
        <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
      `;
      
      tasksEl.appendChild(taskItem);
    });
  } else {
    tasksEl.innerHTML = '<div class="empty-message">No tasks for this project</div>';
  }
  
  // Products Summary (on Overview Tab)
  const productsSummaryEl = document.getElementById('details-products-summary');
  productsSummaryEl.innerHTML = '';
  
  let totalValue = 0;
  
  if (project.products && project.products.length > 0) {
    const productSummary = document.createElement('div');
    productSummary.className = 'product-summary';
    
    // Count products by category
    const categoryCounts = {};
    const totalProducts = project.products.length;
    let validProducts = 0;
    let optionalProducts = 0;
    
    // Get project currency for conversion
    const projectCurrency = project.currency || 'USD';
    
    project.products.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        validProducts++;
        
        // Skip optional products in the price total
        if (product.isOption) {
          optionalProducts++;
          return;
        }
        
        // Convert product price to project currency
        const sourceCurrency = productDetails.currency || 'USD';
        const convertedPrice = convertCurrency(
          productDetails.price,
          sourceCurrency,
          projectCurrency
        );
        totalValue += convertedPrice * product.quantity;
        
        const category = productDetails.category || 'Uncategorized';
        if (categoryCounts[category]) {
          categoryCounts[category]++;
        } else {
          categoryCounts[category] = 1;
        }
      }
    });
    
    // Create summary text
    let optionalText = '';
    if (optionalProducts > 0) {
      optionalText = ` (including ${optionalProducts} optional product${optionalProducts !== 1 ? 's' : ''})`;
    }
    
    productSummary.innerHTML = `
      <div class="product-summary-info">
        <p>This project includes ${totalProducts} product${totalProducts !== 1 ? 's' : ''}${optionalText}
        with a total value of ${formatMoney(totalValue, projectCurrency)}.</p>
        
        <div class="product-summary-categories">
          <strong>Categories:</strong>
          <ul>
            ${Object.entries(categoryCounts).map(([category, count]) => 
              `<li>${category}: ${count} product${count !== 1 ? 's' : ''}</li>`
            ).join('')}
          </ul>
        </div>
      </div>
    `;
    
    productsSummaryEl.appendChild(productSummary);
    
    // Show total value
    const totalEl = document.getElementById('details-products-total');
    totalEl.textContent = `Total Product Value: ${formatMoney(totalValue, projectCurrency)}`;
    totalEl.style.display = 'block';
  } else {
    productsSummaryEl.innerHTML = '<div class="empty-message">No products for this project</div>';
    
    // Hide total value
    const totalEl = document.getElementById('details-products-total');
    totalEl.style.display = 'none';
  }
  
  // Products Tab
  populateProductsTab(project);
  
  // Technical Summary Tab
  populateTechSummaryTab(project);
  
  // Revisions Tab
  populateRevisionsTab(project);
  
  // Set up modal tabs
  setupModalTabs();
  
  // Set up edit button action
  const detailsModal = document.getElementById('project-details-modal');
  const editBtn = document.getElementById('details-edit-project');
  if (editBtn) {
    editBtn.onclick = () => {
      // Close details modal
      if (detailsModal) detailsModal.classList.remove('active');
      
      // Open edit modal
      openEditProjectModal(project);
    };
  }
  
  // Set up print button action
  const printBtn = document.getElementById('details-print-btn');
  if (printBtn) {
    printBtn.onclick = () => {
      // Create a new window for printing
      openPrintWindow(project);
    };
  }
  
  // Initialize currency selector with project's currency or stored preference
  const printCurrencySelect = document.getElementById('print-currency');
  if (printCurrencySelect) {
    // First try to use the project's default currency
    if (project && project.currency) {
      printCurrencySelect.value = project.currency;
    } else {
      // Fall back to last used currency from localStorage, or use USD as default
      const lastUsedCurrency = localStorage.getItem('lastUsedPrintCurrency') || 'USD';
      printCurrencySelect.value = lastUsedCurrency;
    }
    
    // Save the selected currency when changed
    printCurrencySelect.addEventListener('change', () => {
      localStorage.setItem('lastUsedPrintCurrency', printCurrencySelect.value);
    });
  }

  // Set up print now button
  const printNowBtn = document.getElementById('print-now-btn');
  if (printNowBtn) {
    printNowBtn.onclick = () => {
      // Create a new window for printing
      openPrintWindow(project);
    };
  }
  
  // Set up export PDF button
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.onclick = () => {
      showNotification(`Exporting PDF in ${printCurrencySelect.value} currency`, 'info');
      showNotification('Use the "Save as PDF" option in the print dialog', 'info');
      // Create a new window for printing
      openPrintWindow(project);
    };
  }
  
  // Set up export Excel button
  const exportExcelBtn = document.getElementById('export-excel-btn');
  if (exportExcelBtn) {
    exportExcelBtn.onclick = () => {
      showNotification(`Exporting Excel in ${printCurrencySelect.value} currency`, 'info');
      exportProjectProductsToCSV(project);
    };
  }
  
  // Set up close button action
  const closeBtn = document.getElementById('details-close');
  if (closeBtn && detailsModal) {
    closeBtn.onclick = () => {
      closeProjectDetailsModal(detailsModal);
    };
  }
  
  // Close button in header
  if (detailsModal) {
    const modalCloseBtn = detailsModal.querySelector('.modal-close');
    if (modalCloseBtn) {
      modalCloseBtn.onclick = () => {
        closeProjectDetailsModal(detailsModal);
      };
    }
  }
}

// Show project details in a modal
function showProjectDetails(project) {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  // Store the current active tab before opening the modal
  const currentActiveTab = document.querySelector('.sidebar-nav a.active');
  const currentActiveTabId = currentActiveTab ? currentActiveTab.dataset.tab : null;
  
  // Also store this on the modal for retrieval when closing
  if (currentActiveTabId) {
    detailsModal.dataset.previousActiveTab = currentActiveTabId;
  }
  
  // Store the current project to the modal for future access
  detailsModal.dataset.projectId = project.id;
  
  // Set the project title
  const modalTitle = document.getElementById('project-details-title');
  if (modalTitle) {
    modalTitle.textContent = project.title;
  }
  
  // Populate all tabs with project data
  populateProjectDetailsModal(project);
  
  // Show the modal
  detailsModal.classList.add('active');
  
  // Default to first tab (overview)
  activateTab('overview');
}

// Setup modal tabs functionality
function setupModalTabs() {
  const tabButtons = document.querySelectorAll('.modal-tab');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      activateTab(tabId);
    });
  });
}

// Close project details modal and restore previous tab state
function closeProjectDetailsModal(detailsModal) {
  // Hide the modal
  detailsModal.classList.remove('active');
  
  // Restore the previous active tab if it was stored
  if (detailsModal.dataset.previousActiveTab) {
    const previousTabId = detailsModal.dataset.previousActiveTab;
    const previousTabLink = document.querySelector(`.sidebar-nav a[data-tab="${previousTabId}"]`);
    
    if (previousTabLink) {
      // Manually trigger a click to restore the tab
      previousTabLink.click();
    }
  }
}

// Activate a specific tab
function activateTab(tabId) {
  // Remove active class from all tabs and contents
  const tabButtons = document.querySelectorAll('.modal-tab');
  const tabContents = document.querySelectorAll('.modal-tab-content');
  
  tabButtons.forEach(button => button.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));
  
  // Add active class to selected tab and content
  const selectedTab = document.querySelector(`.modal-tab[data-tab="${tabId}"]`);
  const selectedContent = document.querySelector(`.modal-tab-content[data-tab="${tabId}"]`);
  
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');
}

// Export project products to CSV format for Excel
function exportProjectProductsToCSV(project) {
  if (!project || !project.products || project.products.length === 0) {
    showNotification('No products to export', 'error');
    return;
  }
  
  // Get the selected output currency
  const printCurrencySelect = document.getElementById('print-currency');
  let outputCurrency = printCurrencySelect ? printCurrencySelect.value : 'USD';
  
  // Set a default value if needed
  if (printCurrencySelect) {
    if (!printCurrencySelect.value && project && project.currency) {
      // Default to project currency if available
      printCurrencySelect.value = project.currency;
      outputCurrency = project.currency;
    } else if (!printCurrencySelect.value) {
      // Fallback to USD
      printCurrencySelect.value = 'USD';
    }
  }
  
  // CSV header
  let csvContent = `Category,Product ID,Product Name,Type,Quantity,Unit Price (${outputCurrency}),Total Price (${outputCurrency}),Engineering Hours,Production Hours,Commissioning Hours,Total Hours\n`;
  
  // Get all categories
  const categories = {};
  if (project.productCategories) {
    project.productCategories.forEach(cat => {
      categories[cat.id] = cat.name;
    });
  }
  
  // Get all products by category
  project.products.forEach(product => {
    const productDetails = findProductById(product.productId);
    if (productDetails) {
      const categoryName = product.categoryId ? 
        (categories[product.categoryId] || 'Unknown Category') : 
        'Uncategorized';
      
      // Convert prices to output currency
      const convertedUnitPrice = convertCurrency(
        productDetails.price, 
        productDetails.currency || 'USD', 
        outputCurrency
      );
      const totalPrice = convertedUnitPrice * product.quantity;
      
      const unitPrice = formatPrice(convertedUnitPrice, outputCurrency, false);
      const totalPriceFormatted = formatPrice(totalPrice, outputCurrency, false);
      
      // Escape fields that might contain commas
      const escapeCsv = (field) => {
        if (!field) return '';
        const str = String(field);
        return str.includes(',') ? `"${str}"` : str;
      };
      
      // Get installation time values
      const engineeringHours = productDetails.installationTime?.engineering || 0;
      const productionHours = productDetails.installationTime?.production || 0;
      const commissioningHours = productDetails.installationTime?.commissioning || 0;
      const totalHours = engineeringHours + productionHours + commissioningHours;
      
      // Multiply hours by quantity
      const totalEngineeringHours = engineeringHours * product.quantity;
      const totalProductionHours = productionHours * product.quantity;
      const totalCommissioningHours = commissioningHours * product.quantity;
      const grandTotalHours = totalHours * product.quantity;
      
      // Add CSV row
      csvContent += `${escapeCsv(categoryName)},${escapeCsv(productDetails.id)},${escapeCsv(productDetails.name)},${product.isOption ? 'Optional' : 'Required'},${product.quantity},${unitPrice},${totalPriceFormatted},${totalEngineeringHours},${totalProductionHours},${totalCommissioningHours},${grandTotalHours}\n`;
    }
  });
  
  // Create Blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${project.title.replace(/[^a-z0-9]/gi, '_')}_products_${outputCurrency}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification(`CSV file exported successfully in ${outputCurrency}`, 'success');
}

// Format price for export (without currency symbol)
function formatPrice(price, currency = 'USD', includeCurrency = true) {
  if (typeof price !== 'number' || isNaN(price)) {
    return '0.00';
  }
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: includeCurrency ? 'currency' : 'decimal',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(price);
}

// Create a dedicated hours summary table for printing
function createHoursSummaryTable(project, totalEngineeringTime, totalProductionTime, totalCommissioningTime) {
  const totalInstallationTime = totalEngineeringTime + totalProductionTime + totalCommissioningTime;
  
  // If no hours, don't create the table
  if (totalInstallationTime <= 0) return;
  
  // Get the print view container
  const printViewContainer = document.querySelector('.print-view-container');
  if (!printViewContainer) return;
  
  // Create a page break element before the hours summary
  const pageBreak = document.createElement('div');
  pageBreak.style.pageBreakBefore = 'always';
  pageBreak.style.height = '1px';
  pageBreak.style.width = '100%';
  printViewContainer.appendChild(pageBreak);
  
  // Create a container for the hours summary on its own page
  const hoursSummaryContainer = document.createElement('div');
  hoursSummaryContainer.id = 'hours-summary-section';
  hoursSummaryContainer.className = 'hours-summary-container print-section';
  hoursSummaryContainer.style.marginTop = '50px';
  hoursSummaryContainer.style.pageBreakInside = 'avoid';
  hoursSummaryContainer.style.border = '2px solid #000';
  hoursSummaryContainer.style.padding = '15px';
  hoursSummaryContainer.style.backgroundColor = '#FFFFFF';
  hoursSummaryContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
  
  // Create a header
  const summaryHeader = document.createElement('h2');
  summaryHeader.style.borderBottom = '1px solid #000';
  summaryHeader.style.paddingBottom = '8px';
  summaryHeader.style.marginBottom = '15px';
  summaryHeader.style.textAlign = 'center';
  summaryHeader.style.fontSize = '14pt';
  summaryHeader.innerHTML = 'INSTALLATION HOURS SUMMARY';
  
  hoursSummaryContainer.appendChild(summaryHeader);
  
  // Create a table for the hours summary
  const summaryTable = document.createElement('table');
  summaryTable.style.width = '100%';
  summaryTable.style.borderCollapse = 'collapse';
  summaryTable.style.margin = '0 auto';
  summaryTable.border = '1';
  summaryTable.setAttribute('cellpadding', '8');
  summaryTable.setAttribute('cellspacing', '0');
  
  // Create the table header
  const headerRow = document.createElement('tr');
  headerRow.style.backgroundColor = '#f0f0f0';
  headerRow.style.fontWeight = 'bold';
  
  // Create header cells
  const headers = ['Category', 'Engineering Hours', 'Production Hours', 'Commissioning Hours', 'Total Hours'];
  headers.forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    th.style.padding = '8px';
    th.style.border = '1px solid #999';
    headerRow.appendChild(th);
  });
  
  summaryTable.appendChild(headerRow);
  
  // Create rows for each category
  let categoryEngineeringHours = 0;
  let categoryProductionHours = 0;
  let categoryCommissioningHours = 0;
  
  // Process categories
  if (project.productCategories && project.productCategories.length > 0) {
    // Sort categories
    const sortedCategories = [...project.productCategories].sort((a, b) => a.order - b.order);
    
    sortedCategories.forEach(category => {
      // Get products for this category
      const categoryProducts = (project.products || []).filter(p => p.categoryId === category.id);
      
      // Calculate hours
      let engineeringHours = 0;
      let productionHours = 0;
      let commissioningHours = 0;
      
      categoryProducts.forEach(product => {
        const productDetails = findProductById(product.productId);
        if (productDetails && productDetails.installationTime) {
          engineeringHours += (productDetails.installationTime.engineering || 0) * product.quantity;
          productionHours += (productDetails.installationTime.production || 0) * product.quantity;
          commissioningHours += (productDetails.installationTime.commissioning || 0) * product.quantity;
        }
      });
      
      // Skip categories with no hours
      if (engineeringHours === 0 && productionHours === 0 && commissioningHours === 0) {
        return;
      }
      
      // Add category hours to total
      categoryEngineeringHours += engineeringHours;
      categoryProductionHours += productionHours;
      categoryCommissioningHours += commissioningHours;
      
      // Create a row for this category
      const categoryRow = document.createElement('tr');
      
      // Category name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = category.name;
      nameCell.style.padding = '8px';
      nameCell.style.border = '1px solid #999';
      nameCell.style.fontWeight = 'bold';
      categoryRow.appendChild(nameCell);
      
      // Engineering hours
      const engCell = document.createElement('td');
      engCell.textContent = engineeringHours.toFixed(1);
      engCell.style.padding = '8px';
      engCell.style.border = '1px solid #999';
      engCell.style.textAlign = 'center';
      categoryRow.appendChild(engCell);
      
      // Production hours
      const prodCell = document.createElement('td');
      prodCell.textContent = productionHours.toFixed(1);
      prodCell.style.padding = '8px';
      prodCell.style.border = '1px solid #999';
      prodCell.style.textAlign = 'center';
      categoryRow.appendChild(prodCell);
      
      // Commissioning hours
      const commCell = document.createElement('td');
      commCell.textContent = commissioningHours.toFixed(1);
      commCell.style.padding = '8px';
      commCell.style.border = '1px solid #999';
      commCell.style.textAlign = 'center';
      categoryRow.appendChild(commCell);
      
      // Total hours
      const totalCell = document.createElement('td');
      const categoryTotal = engineeringHours + productionHours + commissioningHours;
      totalCell.textContent = categoryTotal.toFixed(1);
      totalCell.style.padding = '8px';
      totalCell.style.border = '1px solid #999';
      totalCell.style.textAlign = 'center';
      totalCell.style.fontWeight = 'bold';
      categoryRow.appendChild(totalCell);
      
      summaryTable.appendChild(categoryRow);
    });
  }
  
  // Add uncategorized products row if they have hours
  const uncategorizedProducts = (project.products || []).filter(p => !p.categoryId);
  
  if (uncategorizedProducts.length > 0) {
    // Calculate hours
    let uncategorizedEngHours = 0;
    let uncategorizedProdHours = 0;
    let uncategorizedCommHours = 0;
    
    uncategorizedProducts.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails && productDetails.installationTime) {
        uncategorizedEngHours += (productDetails.installationTime.engineering || 0) * product.quantity;
        uncategorizedProdHours += (productDetails.installationTime.production || 0) * product.quantity;
        uncategorizedCommHours += (productDetails.installationTime.commissioning || 0) * product.quantity;
      }
    });
    
    // Add to category totals
    categoryEngineeringHours += uncategorizedEngHours;
    categoryProductionHours += uncategorizedProdHours;
    categoryCommissioningHours += uncategorizedCommHours;
    
    // Only add row if there are hours
    if (uncategorizedEngHours > 0 || uncategorizedProdHours > 0 || uncategorizedCommHours > 0) {
      // Create a row for uncategorized
      const uncatRow = document.createElement('tr');
      
      // Category name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = 'Uncategorized Products';
      nameCell.style.padding = '8px';
      nameCell.style.border = '1px solid #999';
      nameCell.style.fontWeight = 'bold';
      uncatRow.appendChild(nameCell);
      
      // Engineering hours
      const engCell = document.createElement('td');
      engCell.textContent = uncategorizedEngHours.toFixed(1);
      engCell.style.padding = '8px';
      engCell.style.border = '1px solid #999';
      engCell.style.textAlign = 'center';
      uncatRow.appendChild(engCell);
      
      // Production hours
      const prodCell = document.createElement('td');
      prodCell.textContent = uncategorizedProdHours.toFixed(1);
      prodCell.style.padding = '8px';
      prodCell.style.border = '1px solid #999';
      prodCell.style.textAlign = 'center';
      uncatRow.appendChild(prodCell);
      
      // Commissioning hours
      const commCell = document.createElement('td');
      commCell.textContent = uncategorizedCommHours.toFixed(1);
      commCell.style.padding = '8px';
      commCell.style.border = '1px solid #999';
      commCell.style.textAlign = 'center';
      uncatRow.appendChild(commCell);
      
      // Total hours
      const totalCell = document.createElement('td');
      const uncatTotal = uncategorizedEngHours + uncategorizedProdHours + uncategorizedCommHours;
      totalCell.textContent = uncatTotal.toFixed(1);
      totalCell.style.padding = '8px';
      totalCell.style.border = '1px solid #999';
      totalCell.style.textAlign = 'center';
      totalCell.style.fontWeight = 'bold';
      uncatRow.appendChild(totalCell);
      
      summaryTable.appendChild(uncatRow);
    }
  }
  
  // Add a total row
  const totalRow = document.createElement('tr');
  totalRow.style.backgroundColor = '#f0f0f0';
  totalRow.style.fontWeight = 'bold';
  
  // Project total cell
  const totalLabelCell = document.createElement('td');
  totalLabelCell.textContent = 'PROJECT TOTAL:';
  totalLabelCell.style.padding = '8px';
  totalLabelCell.style.border = '1px solid #999';
  totalRow.appendChild(totalLabelCell);
  
  // Engineering total
  const engTotalCell = document.createElement('td');
  engTotalCell.textContent = totalEngineeringTime.toFixed(1);
  engTotalCell.style.padding = '8px';
  engTotalCell.style.border = '1px solid #999';
  engTotalCell.style.textAlign = 'center';
  totalRow.appendChild(engTotalCell);
  
  // Production total
  const prodTotalCell = document.createElement('td');
  prodTotalCell.textContent = totalProductionTime.toFixed(1);
  prodTotalCell.style.padding = '8px';
  prodTotalCell.style.border = '1px solid #999';
  prodTotalCell.style.textAlign = 'center';
  totalRow.appendChild(prodTotalCell);
  
  // Commissioning total
  const commTotalCell = document.createElement('td');
  commTotalCell.textContent = totalCommissioningTime.toFixed(1);
  commTotalCell.style.padding = '8px';
  commTotalCell.style.border = '1px solid #999';
  commTotalCell.style.textAlign = 'center';
  totalRow.appendChild(commTotalCell);
  
  // Grand total
  const grandTotalCell = document.createElement('td');
  grandTotalCell.textContent = totalInstallationTime.toFixed(1);
  grandTotalCell.style.padding = '8px';
  grandTotalCell.style.border = '1px solid #999';
  grandTotalCell.style.textAlign = 'center';
  totalRow.appendChild(grandTotalCell);
  
  summaryTable.appendChild(totalRow);
  
  // Add the table to the container
  hoursSummaryContainer.appendChild(summaryTable);
  
  // Add a note about the hours
  const hoursNote = document.createElement('div');
  hoursNote.style.marginTop = '10px';
  hoursNote.style.fontSize = '9pt';
  hoursNote.style.fontStyle = 'italic';
  hoursNote.style.textAlign = 'right';
  hoursNote.innerHTML = '*Hours are calculated based on the installation time required for each product.';
  
  hoursSummaryContainer.appendChild(hoursNote);
  
  // Add the hours summary container to the print view container
  printViewContainer.appendChild(hoursSummaryContainer);
}

// Open a dedicated hours report window
function openHoursReportWindow(project) {
  // Calculate total hours for the project
  let totalEngineeringTime = 0;
  let totalProductionTime = 0;
  let totalCommissioningTime = 0;
  
  // Get hours from all products
  (project.products || []).forEach(product => {
    const productDetails = findProductById(product.productId);
    if (productDetails && productDetails.installationTime) {
      totalEngineeringTime += (productDetails.installationTime.engineering || 0) * product.quantity;
      totalProductionTime += (productDetails.installationTime.production || 0) * product.quantity;
      totalCommissioningTime += (productDetails.installationTime.commissioning || 0) * product.quantity;
    }
  });
  
  const totalInstallationTime = totalEngineeringTime + totalProductionTime + totalCommissioningTime;
  
  // If no hours, show notification and return
  if (totalInstallationTime <= 0) {
    showNotification('No installation hours found for this project', 'warning');
    return;
  }
  
  // Generate the hours report table HTML
  let hoursSummaryHTML = '';
  
  // Start with a header
  hoursSummaryHTML += `
    <div class="print-view-header">
      <h2>${project.title} - Installation Hours Summary</h2>
      <div class="print-view-meta">
        <div><strong>Client:</strong> ${project.client || 'N/A'}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      </div>
    </div>
    
    <p style="margin-bottom: 20px;">This report provides a breakdown of the installation hours required for this project by category.</p>
  `;
  
  // Create the hours summary table
  hoursSummaryHTML += `
    <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <thead style="background-color:#f0f0f0; font-weight:bold;">
        <tr>
          <th style="text-align:left; width:40%;">Category</th>
          <th style="text-align:center; width:15%;">Engineering</th>
          <th style="text-align:center; width:15%;">Production</th>
          <th style="text-align:center; width:15%;">Commissioning</th>
          <th style="text-align:center; width:15%;">Total Hours</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Add rows for each category
  let categoryEngineeringHours = 0;
  let categoryProductionHours = 0;
  let categoryCommissioningHours = 0;
  
  // Process categories
  if (project.productCategories && project.productCategories.length > 0) {
    // Sort categories
    const sortedCategories = [...project.productCategories].sort((a, b) => a.order - b.order);
    
    sortedCategories.forEach(category => {
      // Get products for this category
      const categoryProducts = (project.products || []).filter(p => p.categoryId === category.id);
      
      // Calculate hours
      let engineeringHours = 0;
      let productionHours = 0;
      let commissioningHours = 0;
      
      categoryProducts.forEach(product => {
        const productDetails = findProductById(product.productId);
        if (productDetails && productDetails.installationTime) {
          engineeringHours += (productDetails.installationTime.engineering || 0) * product.quantity;
          productionHours += (productDetails.installationTime.production || 0) * product.quantity;
          commissioningHours += (productDetails.installationTime.commissioning || 0) * product.quantity;
        }
      });
      
      // Skip categories with no hours
      if (engineeringHours === 0 && productionHours === 0 && commissioningHours === 0) {
        return;
      }
      
      // Add to totals
      categoryEngineeringHours += engineeringHours;
      categoryProductionHours += productionHours;
      categoryCommissioningHours += commissioningHours;
      
      // Add row for this category
      const categoryTotal = engineeringHours + productionHours + commissioningHours;
      hoursSummaryHTML += `
        <tr>
          <td style="font-weight:bold; text-align:left;">${category.name}</td>
          <td style="text-align:center;">${engineeringHours.toFixed(1)}</td>
          <td style="text-align:center;">${productionHours.toFixed(1)}</td>
          <td style="text-align:center;">${commissioningHours.toFixed(1)}</td>
          <td style="font-weight:bold; text-align:center;">${categoryTotal.toFixed(1)}</td>
        </tr>
      `;
    });
  }
  
  // Add uncategorized products row if they have hours
  const uncategorizedProducts = (project.products || []).filter(p => !p.categoryId);
  
  if (uncategorizedProducts.length > 0) {
    // Calculate hours
    let uncategorizedEngHours = 0;
    let uncategorizedProdHours = 0;
    let uncategorizedCommHours = 0;
    
    uncategorizedProducts.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails && productDetails.installationTime) {
        uncategorizedEngHours += (productDetails.installationTime.engineering || 0) * product.quantity;
        uncategorizedProdHours += (productDetails.installationTime.production || 0) * product.quantity;
        uncategorizedCommHours += (productDetails.installationTime.commissioning || 0) * product.quantity;
      }
    });
    
    // Add to totals
    categoryEngineeringHours += uncategorizedEngHours;
    categoryProductionHours += uncategorizedProdHours;
    categoryCommissioningHours += uncategorizedCommHours;
    
    // Only add row if there are hours
    if (uncategorizedEngHours > 0 || uncategorizedProdHours > 0 || uncategorizedCommHours > 0) {
      const uncatTotal = uncategorizedEngHours + uncategorizedProdHours + uncategorizedCommHours;
      hoursSummaryHTML += `
        <tr>
          <td style="font-weight:bold; text-align:left;">Uncategorized Products</td>
          <td style="text-align:center;">${uncategorizedEngHours.toFixed(1)}</td>
          <td style="text-align:center;">${uncategorizedProdHours.toFixed(1)}</td>
          <td style="text-align:center;">${uncategorizedCommHours.toFixed(1)}</td>
          <td style="font-weight:bold; text-align:center;">${uncatTotal.toFixed(1)}</td>
        </tr>
      `;
    }
  }
  
  // Add total row
  hoursSummaryHTML += `
    <tr style="background-color:#f0f0f0; font-weight:bold;">
      <td style="text-align:left;">PROJECT TOTAL</td>
      <td style="text-align:center;">${categoryEngineeringHours.toFixed(1)}</td>
      <td style="text-align:center;">${categoryProductionHours.toFixed(1)}</td>
      <td style="text-align:center;">${categoryCommissioningHours.toFixed(1)}</td>
      <td style="text-align:center;">${totalInstallationTime.toFixed(1)}</td>
    </tr>
  `;
  
  // Close the table and add a note
  hoursSummaryHTML += `
      </tbody>
    </table>
    
    <p style="font-style:italic; font-size:9pt; text-align:right; margin-top:10px;">
      *Hours are calculated based on the installation time required for each product.
    </p>
  `;
  
  // Create a full HTML document for printing
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${project.title} - Installation Hours Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0.5in;
          font-size: 10pt;
          line-height: 1.3;
          color: black;
        }
        
        .print-view-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        .print-view-header h2 {
          font-size: 16pt;
          margin: 0;
        }
        
        .print-view-meta {
          font-size: 10pt;
          line-height: 1.4;
          text-align: right;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        th, td {
          border: 1px solid #999;
          padding: 8px;
        }
        
        th {
          background-color: #f0f0f0;
        }
        
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body id="hours-report-frame">
      ${hoursSummaryHTML}
    </body>
    </html>
  `;
  
  // Open a new window with the hours report
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for resources to load then print
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing (or if print is canceled)
        printWindow.onafterprint = function() {
          printWindow.close();
        };
      }, 500);
    };
  } else {
    showNotification('Unable to open print window. Please check your pop-up blocker settings.', 'error');
  }
}

// Open a new window with the print-friendly content
function openPrintWindow(project) {
  // First try to use the Electron print to PDF functionality
  if (window.electron && window.electron.print && window.electron.print.printToPDF) {
    try {
      console.log('Using Electron printToPDF API');
      
      // Generate HTML content
      const printContent = generateProductPrintContent(project);
      
      // Create complete HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${project.title} - Product Overview</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0.25in;
              font-size: 10pt;
              line-height: 1.2;
              color: black;
            }
            .print-view-container {
              width: 100%;
            }
            .print-view-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #333;
              padding-bottom: 6pt;
              margin-bottom: 10pt;
            }
            .print-view-header h2 {
              font-size: 12pt;
              margin: 0;
            }
            .print-view-meta {
              font-size: 8pt;
              line-height: 1.2;
              text-align: right;
            }
            .print-view-description {
              font-size: 8pt;
              margin-bottom: 10pt;
            }
            .print-category {
              margin-bottom: 10pt;
            }
            .print-category-header {
              background-color: #f5f5f5;
              border-left: 4px solid #4f46e5;
              padding: 4pt 6pt;
              margin-bottom: 5pt;
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              flex-wrap: wrap;
            }
            .print-category-name {
              flex: 1 1 100%;
              margin-bottom: 3pt;
            }
            .print-category-hours {
              flex: 1 1 60%;
              font-size: 8pt;
              color: #444;
              text-align: left;
            }
            .print-category-total {
              flex: 1 1 40%;
              text-align: right;
            }
            .print-product-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8pt;
              margin-bottom: 15px;
            }
            .print-product-table th {
              background-color: #f5f5f5;
              border-bottom: 1px solid #aaa;
              padding: 3pt 4pt;
              font-weight: 600;
              text-align: left;
            }
            .print-product-table td {
              border-bottom: 1px solid #ddd;
              padding: 3pt 4pt;
            }
            .print-product-table tr.bundle-subitem td {
              border-bottom: 1px dotted #ddd;
              background-color: #f9f9f9;
              font-size: 90%;
            }
            .print-view-summary {
              border-top: 1px solid #333;
              padding-top: 5pt;
              margin-top: 10pt;
              font-size: 10pt;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .print-view-summary-hours {
              font-size: 9pt;
              text-align: left;
              line-height: 1.4;
            }
            .print-view-summary-value {
              font-size: 10pt;
              text-align: right;
              font-weight: bold;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body id="print-frame">
          <div class="print-view-container">
            ${printContent}
          </div>
        </body>
        </html>
      `;
      
      // Call Electron's print function with the HTML content
      window.electron.print.printToPDF({
        html: htmlContent,
        printOptions: {
          marginsType: 0, // Default margins
          printBackground: true,
          printSelectionOnly: false,
          landscape: false,
          pageSize: 'A4',
          scaleFactor: 100
        }
      }).then(result => {
        if (result.success) {
          console.log('Electron print successful:', result);
          showNotification('File saved successfully: ' + result.path, 'success');
        } else if (result.canceled) {
          console.log('Print canceled by user');
        } else if (result.fallback) {
          console.log('Used browser print fallback');
        } else {
          console.error('Print failed:', result.error);
          // Fallback to the browser-based method
          openPrintWindowFallback(project);
        }
      }).catch(err => {
        console.error('Error in Electron print:', err);
        // Fallback to browser-based method on error
        openPrintWindowFallback(project);
      });
      
      return; // Exit early since we're handling printing via Electron
    } catch (error) {
      console.error('Error setting up Electron print:', error);
      // Fall through to browser-based method
    }
  }
  
  // Fallback to browser-based method
  openPrintWindowFallback(project);
}

function openPrintWindowFallback(project) {
  // Create a new window
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (!printWindow) {
    showNotification('Please allow popups to use the print feature', 'error');
    return;
  }
  
  // Write the HTML content to the new window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${project.title} - Product Overview</title>
      <style>
        @import url("../node_modules/font-awesome/css/font-awesome.min.css");
        
        body {
          font-family: Arial, sans-serif;
          margin: 0.25in;
          font-size: 10pt;
          line-height: 1.2;
          color: black;
        }
        .print-view-container {
          width: 100%;
        }
        .print-view-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #333;
          padding-bottom: 6pt;
          margin-bottom: 10pt;
        }
        .print-view-header h2 {
          font-size: 12pt;
          margin: 0;
        }
        .print-view-meta {
          font-size: 8pt;
          line-height: 1.2;
          text-align: right;
        }
        .print-view-description {
          font-size: 8pt;
          margin-bottom: 10pt;
        }
        .print-category {
          margin-bottom: 10pt;
        }
        .print-category-header {
          background-color: #f5f5f5;
          border-left: 4px solid #4f46e5;
          padding: 4pt 6pt;
          margin-bottom: 5pt;
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        .print-product-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin-bottom: 15px;
        }
        .print-product-table th {
          background-color: #f5f5f5;
          border-bottom: 1px solid #aaa;
          padding: 3pt 4pt;
          font-weight: 600;
          text-align: left;
        }
        .print-product-table td {
          border-bottom: 1px solid #ddd;
          padding: 3pt 4pt;
        }
        .print-product-table tr.bundle-subitem td {
          border-bottom: 1px dotted #ddd;
          background-color: #f9f9f9;
          font-size: 90%;
        }
        .print-view-summary {
          border-top: 1px solid #333;
          padding-top: 5pt;
          margin-top: 10pt;
          font-size: 10pt;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .print-view-summary-hours {
          font-size: 9pt;
          text-align: left;
          line-height: 1.4;
        }
        .print-view-summary-value {
          font-size: 10pt;
          text-align: right;
          font-weight: bold;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body id="print-frame">
      <div class="print-view-container">
  `);
  
  // Generate the product print view content
  const printContent = generateProductPrintContent(project);
  printWindow.document.write(printContent);
  
  // Close the HTML document
  printWindow.document.write(`
      </div>
      <script>
        // Add print and save buttons
        document.write('<div style="text-align:center; margin:20px; display:flex; justify-content:center; gap:15px;">'+
          '<button id="print-button" style="padding:10px 20px; background:#4f46e5; color:white; border:none; border-radius:4px; font-size:16px; cursor:pointer;"><i style="margin-right:8px;" class="fa fa-print"></i>Print</button>'+
          '<button id="save-pdf-button" style="padding:10px 20px; background:#22c55e; color:white; border:none; border-radius:4px; font-size:16px; cursor:pointer;"><i style="margin-right:8px;" class="fa fa-file-pdf-o"></i>Save as PDF</button>'+
        '</div>');
        
        // Setup print button - simple browser print
        document.getElementById('print-button').addEventListener('click', function() {
          // Hide the buttons before printing
          document.querySelectorAll('button').forEach(btn => btn.style.display = 'none');
          
          // Use timeout to ensure buttons are hidden before print dialog appears
          setTimeout(function() {
            window.print();
            
            // Show buttons again after print dialog closes
            setTimeout(function() {
              document.querySelectorAll('button').forEach(btn => btn.style.display = 'inline-block');
            }, 100);
          }, 100);
        });
        
        // Setup save PDF button - with instructions
        document.getElementById('save-pdf-button').addEventListener('click', function() {
          // Show instruction toast
          const toast = document.createElement('div');
          toast.style.position = 'fixed';
          toast.style.top = '20px';
          toast.style.left = '50%';
          toast.style.transform = 'translateX(-50%)';
          toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          toast.style.color = 'white';
          toast.style.padding = '12px 24px';
          toast.style.borderRadius = '4px';
          toast.style.zIndex = '9999';
          toast.style.fontSize = '14px';
          toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          toast.innerHTML = '<i class="fa fa-info-circle" style="margin-right:8px;"></i>Select "Save as PDF" in the print dialog';
          document.body.appendChild(toast);
          
          // Hide the buttons before printing
          document.querySelectorAll('button').forEach(btn => btn.style.display = 'none');
          
          // Auto remove toast after 5 seconds
          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
          }, 5000);
          
          // Use timeout to ensure buttons are hidden before print dialog appears
          setTimeout(function() {
            window.print();
            
            // Show buttons again after print dialog closes
            setTimeout(function() {
              document.querySelectorAll('button').forEach(btn => btn.style.display = 'inline-block');
            }, 100);
          }, 100);
        });
      </script>
    </body>
    </html>
  `);
  
  printWindow.document.close();
}

// Generate a professional print view of products sorted by categories
function generateProductPrintContent(project) {
  if (!project) return '';
  
  // Get the selected output currency
  const printCurrencySelect = document.getElementById('print-currency');
  let outputCurrency = printCurrencySelect ? printCurrencySelect.value : 'USD';

  // Set a default value if needed
  if (printCurrencySelect) {
    if (!printCurrencySelect.value && project && project.currency) {
      // Default to project currency if available
      printCurrencySelect.value = project.currency;
      outputCurrency = project.currency;
    } else if (!printCurrencySelect.value) {
      // Fallback to USD
      printCurrencySelect.value = 'USD';
    }
  }
  
  // Build the HTML content as a string
  let content = '';
  
  // Add header with currency information
  content += `
    <div class="print-view-header">
      <h2>${project.title} - Product Overview</h2>
      <div class="print-view-meta">
        <div><strong>Client:</strong> ${project.client || 'N/A'}</div>
        <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
        <div><strong>Currency:</strong> ${outputCurrency}</div>
      </div>
    </div>
    
    <div class="print-view-description">
      ${project.description || 'No description provided.'}
    </div>
  `;
  
  // Categories section
  content += `<div id="print-view-categories">`;
  
  // Calculate total value and hours for all products, with currency conversion
  // Exclude optional products from total
  let totalValue = 0;
  let totalEngHours = 0;
  let totalProdHours = 0;
  let totalCommHours = 0;
  
  (project.products || []).forEach(product => {
    // Skip optional products in the total
    if (product.isOption) return;
    
    const productDetails = findProductById(product.productId);
    if (productDetails) {
      // Convert price to output currency
      const convertedUnitPrice = convertCurrency(
        productDetails.price, 
        productDetails.currency || 'USD', 
        outputCurrency
      );
      totalValue += convertedUnitPrice * product.quantity;
      
      // Add hours
      totalEngHours += (productDetails.installationTime?.engineering || 0) * product.quantity;
      totalProdHours += (productDetails.installationTime?.production || 0) * product.quantity;
      totalCommHours += (productDetails.installationTime?.commissioning || 0) * product.quantity;
      
      // Add hours from bundled items
      if (productDetails.isBundle && productDetails.bundleItems && productDetails.bundleItems.length > 0) {
        productDetails.bundleItems.forEach(bundleItem => {
          const bundledProduct = findProductById(bundleItem.productId);
          if (bundledProduct) {
            totalEngHours += (bundledProduct.installationTime?.engineering || 0) * bundleItem.quantity * product.quantity;
            totalProdHours += (bundledProduct.installationTime?.production || 0) * bundleItem.quantity * product.quantity;
            totalCommHours += (bundledProduct.installationTime?.commissioning || 0) * bundleItem.quantity * product.quantity;
          }
        });
      }
    }
  });
  
  // Process categories
  if (project.productCategories && project.productCategories.length > 0) {
    // Sort categories
    const sortedCategories = [...project.productCategories].sort((a, b) => a.order - b.order);
    
    // Create each category section
    sortedCategories.forEach(category => {
      // Filter products for this category
      const categoryProducts = (project.products || []).filter(p => p.categoryId === category.id);
      
      // Skip empty categories
      if (categoryProducts.length === 0) return;
      
      // Calculate category total with currency conversion
      // Exclude optional products from total
      let categoryTotal = 0;
      let categoryEngHours = 0;
      let categoryProdHours = 0;
      let categoryCommHours = 0;
      
      categoryProducts.forEach(product => {
        // Skip optional products in the total
        if (product.isOption) return;
        
        const productDetails = findProductById(product.productId);
        if (productDetails) {
          // Convert price to output currency
          const convertedUnitPrice = convertCurrency(
            productDetails.price, 
            productDetails.currency || 'USD', 
            outputCurrency
          );
          categoryTotal += convertedUnitPrice * product.quantity;
          
          // Add hours
          categoryEngHours += (productDetails.installationTime?.engineering || 0) * product.quantity;
          categoryProdHours += (productDetails.installationTime?.production || 0) * product.quantity;
          categoryCommHours += (productDetails.installationTime?.commissioning || 0) * product.quantity;
          
          // Add hours from bundled items
          if (productDetails.isBundle && productDetails.bundleItems && productDetails.bundleItems.length > 0) {
            productDetails.bundleItems.forEach(bundleItem => {
              const bundledProduct = findProductById(bundleItem.productId);
              if (bundledProduct) {
                categoryEngHours += (bundledProduct.installationTime?.engineering || 0) * bundleItem.quantity * product.quantity;
                categoryProdHours += (bundledProduct.installationTime?.production || 0) * bundleItem.quantity * product.quantity;
                categoryCommHours += (bundledProduct.installationTime?.commissioning || 0) * bundleItem.quantity * product.quantity;
              }
            });
          }
        }
      });
      
      // Create category section
      content += `
        <div class="print-category">
          <div class="print-category-header">
            <div class="print-category-name">${category.name}</div>
            <div class="print-category-hours">
              Engineering: ${categoryEngHours} hrs | 
              Production: ${categoryProdHours} hrs | 
              Commissioning: ${categoryCommHours} hrs
            </div>
            <div class="print-category-total">${formatPrice(categoryTotal, outputCurrency)}</div>
          </div>
          
          <table class="print-product-table">
            <thead>
              <tr>
                <th style="width:15%">ID</th>
                <th style="width:25%">Product</th>
                <th style="width:10%">Qty</th>
                <th style="width:10%">Eng. Hrs</th>
                <th style="width:10%">Prod. Hrs</th>
                <th style="width:10%">Comm. Hrs</th>
                <th style="width:10%">Unit (${outputCurrency})</th>
                <th style="width:10%">Total (${outputCurrency})</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Add products to table with currency conversion
      categoryProducts.forEach(product => {
        const productDetails = findProductById(product.productId);
        if (productDetails) {
          // Convert price to output currency
          const convertedUnitPrice = convertCurrency(
            productDetails.price, 
            productDetails.currency || 'USD', 
            outputCurrency
          );
          const totalPrice = convertedUnitPrice * product.quantity;
          
          // Check if this is an optional product
          const rowClass = product.isOption ? 'optional-product' : '';
          
          // Get installation time values
          const engineeringHours = productDetails.installationTime?.engineering || 0;
          const productionHours = productDetails.installationTime?.production || 0;
          const commissioningHours = productDetails.installationTime?.commissioning || 0;
          
          // Calculate total hours
          const totalEngHours = engineeringHours * product.quantity;
          const totalProdHours = productionHours * product.quantity;
          const totalCommHours = commissioningHours * product.quantity;
          
          // Create the main product row
          content += `
            <tr class="${rowClass}">
              <td>${productDetails.id}</td>
              <td>${productDetails.name}${product.isOption ? ' <span style="color:#666;font-size:80%;font-style:italic">(Optional)</span>' : ''}</td>
              <td>${product.quantity}</td>
              <td>${totalEngHours}</td>
              <td>${totalProdHours}</td>
              <td>${totalCommHours}</td>
              <td>${formatPrice(convertedUnitPrice, outputCurrency)}</td>
              <td>${formatPrice(totalPrice, outputCurrency)}</td>
            </tr>
          `;
          
          // If this is a bundle, add the bundled items as subitems with indentation
          if (productDetails.isBundle && productDetails.bundleItems && productDetails.bundleItems.length > 0) {
            productDetails.bundleItems.forEach(bundleItem => {
              const bundledProduct = findProductById(bundleItem.productId);
              if (bundledProduct) {
                // Convert price of bundled item to output currency
                const bundledItemUnitPrice = convertCurrency(
                  bundledProduct.price,
                  bundledProduct.currency || 'USD',
                  outputCurrency
                );
                
                // Get bundled item installation time values
                const bundledEngHours = bundledProduct.installationTime?.engineering || 0;
                const bundledProdHours = bundledProduct.installationTime?.production || 0;
                const bundledCommHours = bundledProduct.installationTime?.commissioning || 0;
                
                // Calculate total bundled item hours
                const totalBundledEngHours = bundledEngHours * bundleItem.quantity * product.quantity;
                const totalBundledProdHours = bundledProdHours * bundleItem.quantity * product.quantity;
                const totalBundledCommHours = bundledCommHours * bundleItem.quantity * product.quantity;
                
                // Add bundle item row - with price shown as note only
                content += `
                  <tr class="bundle-subitem">
                    <td></td>
                    <td style="padding-left: 20px;">↳ ${bundledProduct.name}</td>
                    <td>${bundleItem.quantity * product.quantity}</td>
                    <td>${totalBundledEngHours}</td>
                    <td>${totalBundledProdHours}</td>
                    <td>${totalBundledCommHours}</td>
                    <td colspan="2" style="font-style: italic; color: #666;">Note: ${formatPrice(bundledItemUnitPrice, outputCurrency)} each</td>
                  </tr>
                `;
              }
            });
          }
        }
      });
      
      content += `
            </tbody>
          </table>
        </div>
      `;
    });
  }
  
  // Handle uncategorized products
  const uncategorizedProducts = (project.products || []).filter(p => !p.categoryId);
  if (uncategorizedProducts.length > 0) {
    // Calculate uncategorized total with currency conversion
    let uncategorizedTotal = 0;
    let uncategorizedEngHours = 0;
    let uncategorizedProdHours = 0;
    let uncategorizedCommHours = 0;
    
    uncategorizedProducts.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        // Convert price to output currency
        const convertedUnitPrice = convertCurrency(
          productDetails.price, 
          productDetails.currency || 'USD', 
          outputCurrency
        );
        uncategorizedTotal += convertedUnitPrice * product.quantity;
        
        // Add hours
        uncategorizedEngHours += (productDetails.installationTime?.engineering || 0) * product.quantity;
        uncategorizedProdHours += (productDetails.installationTime?.production || 0) * product.quantity;
        uncategorizedCommHours += (productDetails.installationTime?.commissioning || 0) * product.quantity;
        
        // Add hours from bundled items
        if (productDetails.isBundle && productDetails.bundleItems && productDetails.bundleItems.length > 0) {
          productDetails.bundleItems.forEach(bundleItem => {
            const bundledProduct = findProductById(bundleItem.productId);
            if (bundledProduct) {
              uncategorizedEngHours += (bundledProduct.installationTime?.engineering || 0) * bundleItem.quantity * product.quantity;
              uncategorizedProdHours += (bundledProduct.installationTime?.production || 0) * bundleItem.quantity * product.quantity;
              uncategorizedCommHours += (bundledProduct.installationTime?.commissioning || 0) * bundleItem.quantity * product.quantity;
            }
          });
        }
      }
    });
    
    // Create uncategorized section
    content += `
      <div class="print-category">
        <div class="print-category-header">
          <div class="print-category-name">Uncategorized Products</div>
          <div class="print-category-hours">
            Engineering: ${uncategorizedEngHours} hrs | 
            Production: ${uncategorizedProdHours} hrs | 
            Commissioning: ${uncategorizedCommHours} hrs
          </div>
          <div class="print-category-total">${formatPrice(uncategorizedTotal, outputCurrency)}</div>
        </div>
        
        <table class="print-product-table">
          <thead>
            <tr>
              <th style="width:15%">ID</th>
              <th style="width:25%">Product</th>
              <th style="width:10%">Qty</th>
              <th style="width:10%">Eng. Hrs</th>
              <th style="width:10%">Prod. Hrs</th>
              <th style="width:10%">Comm. Hrs</th>
              <th style="width:10%">Unit (${outputCurrency})</th>
              <th style="width:10%">Total (${outputCurrency})</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Add products to table with currency conversion
    uncategorizedProducts.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        // Convert price to output currency
        const convertedUnitPrice = convertCurrency(
          productDetails.price, 
          productDetails.currency || 'USD', 
          outputCurrency
        );
        const totalPrice = convertedUnitPrice * product.quantity;
        
        // Get installation time values
        const engineeringHours = productDetails.installationTime?.engineering || 0;
        const productionHours = productDetails.installationTime?.production || 0;
        const commissioningHours = productDetails.installationTime?.commissioning || 0;
        
        // Calculate total hours
        const totalEngHours = engineeringHours * product.quantity;
        const totalProdHours = productionHours * product.quantity;
        const totalCommHours = commissioningHours * product.quantity;
        
        // Create the main product row
        content += `
          <tr>
            <td>${productDetails.id}</td>
            <td>${productDetails.name}</td>
            <td>${product.quantity}</td>
            <td>${totalEngHours}</td>
            <td>${totalProdHours}</td>
            <td>${totalCommHours}</td>
            <td>${formatPrice(convertedUnitPrice, outputCurrency)}</td>
            <td>${formatPrice(totalPrice, outputCurrency)}</td>
          </tr>
        `;
        
        // If this is a bundle, add the bundled items as subitems with indentation
        if (productDetails.isBundle && productDetails.bundleItems && productDetails.bundleItems.length > 0) {
          productDetails.bundleItems.forEach(bundleItem => {
            const bundledProduct = findProductById(bundleItem.productId);
            if (bundledProduct) {
              // Convert price of bundled item to output currency
              const bundledItemUnitPrice = convertCurrency(
                bundledProduct.price,
                bundledProduct.currency || 'USD',
                outputCurrency
              );
              
              // Get bundled item installation time values
              const bundledEngHours = bundledProduct.installationTime?.engineering || 0;
              const bundledProdHours = bundledProduct.installationTime?.production || 0;
              const bundledCommHours = bundledProduct.installationTime?.commissioning || 0;
              
              // Calculate total bundled item hours
              const totalBundledEngHours = bundledEngHours * bundleItem.quantity * product.quantity;
              const totalBundledProdHours = bundledProdHours * bundleItem.quantity * product.quantity;
              const totalBundledCommHours = bundledCommHours * bundleItem.quantity * product.quantity;
              
              // Add bundle item row - with price shown as note only
              content += `
                <tr class="bundle-subitem">
                  <td></td>
                  <td style="padding-left: 20px;">↳ ${bundledProduct.name}</td>
                  <td>${bundleItem.quantity * product.quantity}</td>
                  <td>${totalBundledEngHours}</td>
                  <td>${totalBundledProdHours}</td>
                  <td>${totalBundledCommHours}</td>
                  <td colspan="2" style="font-style: italic; color: #666;">Note: ${formatPrice(bundledItemUnitPrice, outputCurrency)} each</td>
                </tr>
              `;
            }
          });
        }
      }
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  }
  
  // Close categories div
  content += `</div>`;
  
  // Add summary footer
  content += `
    <div class="print-view-summary">
      <div class="print-view-summary-hours">
        <div><strong>Engineering:</strong> ${totalEngHours} hrs</div>
        <div><strong>Production:</strong> ${totalProdHours} hrs</div>
        <div><strong>Commissioning:</strong> ${totalCommHours} hrs</div>
        <div><strong>Total Hours:</strong> ${totalEngHours + totalProdHours + totalCommHours} hrs</div>
      </div>
      <div class="print-view-summary-value">
        Total Value: ${formatPrice(totalValue, outputCurrency)}
      </div>
    </div>
  `;
  
  return content;
}

// Original function kept for compatibility
function generateProductPrintView(project) {
  if (!project) return;
  
  // Get the print view container
  const printViewCategories = document.getElementById('print-view-categories');
  if (!printViewCategories) return;
  
  // Clear previous content
  printViewCategories.innerHTML = '';
  
  // Set project metadata
  document.getElementById('print-view-title').textContent = `${project.title} - Product Overview`;
  document.getElementById('print-view-client').textContent = project.client || 'N/A';
  document.getElementById('print-view-date').textContent = new Date().toLocaleDateString();
  
  // Populate description (shortened to save space)
  const description = project.description || 'No description provided.';
  document.getElementById('print-view-description').textContent = description.length > 100 ? 
    description.substring(0, 100) + '...' : description;
  
  // Calculate total value for all products, converting to project currency
  let totalValue = 0;
  const projectCurrency = project.currency || 'USD';
  (project.products || []).forEach(product => {
    const productDetails = findProductById(product.productId);
    if (productDetails) {
      // Convert product price to project currency
      const sourceCurrency = productDetails.currency || 'USD';
      const convertedPrice = convertCurrency(
        productDetails.price,
        sourceCurrency,
        projectCurrency
      );
      totalValue += convertedPrice * product.quantity;
    }
  });
  
  // Calculate total installation time
  let totalEngineeringTime = 0;
  let totalProductionTime = 0;
  let totalCommissioningTime = 0;
  
  (project.products || []).forEach(product => {
    const productDetails = findProductById(product.productId);
    if (productDetails && productDetails.installationTime) {
      totalEngineeringTime += (productDetails.installationTime.engineering || 0) * product.quantity;
      totalProductionTime += (productDetails.installationTime.production || 0) * product.quantity;
      totalCommissioningTime += (productDetails.installationTime.commissioning || 0) * product.quantity;
    }
  });
  
  const totalInstallationTime = totalEngineeringTime + totalProductionTime + totalCommissioningTime;
  
  // Create a table for the project total that will display properly in print
  const totalElement = document.getElementById('print-view-total');
  totalElement.innerHTML = '';
  
  const totalTable = document.createElement('table');
  totalTable.style.width = '100%';
  totalTable.style.borderCollapse = 'collapse';
  totalTable.style.marginTop = '10px';
  totalTable.style.borderTop = '2px solid #000';
  totalTable.style.paddingTop = '8px';
  
  const totalRow = totalTable.insertRow();
  
  // Label cell
  const labelCell = totalRow.insertCell();
  labelCell.style.width = '40%';
  labelCell.style.textAlign = 'left';
  labelCell.style.fontWeight = 'bold';
  labelCell.textContent = 'PROJECT TOTAL:';
  
  // Hours cell
  const hoursCell = totalRow.insertCell();
  hoursCell.style.width = '40%';
  hoursCell.style.textAlign = 'right';
  
  if (totalInstallationTime > 0) {
    hoursCell.innerHTML = `
      <span style="font-weight:bold;">Hours:</span> 
      E:${totalEngineeringTime} P:${totalProductionTime} C:${totalCommissioningTime} 
      <span style="font-weight:bold;">(${totalInstallationTime})</span>
    `;
  } else {
    hoursCell.innerHTML = '&nbsp;';
  }
  
  // Money cell
  const moneyCell = totalRow.insertCell();
  moneyCell.style.width = '20%';
  moneyCell.style.textAlign = 'right';
  moneyCell.style.fontWeight = 'bold';
  moneyCell.textContent = formatMoney(totalValue, projectCurrency);
  
  totalElement.appendChild(totalTable);
  
  // Instead of trying to add to the existing print view, we'll create a separate button for hours report
  
  // Process categories
  if (project.productCategories && project.productCategories.length > 0) {
    // Sort categories
    const sortedCategories = [...project.productCategories].sort((a, b) => a.order - b.order);
    
    // Create each category section
    sortedCategories.forEach(category => {
      // Filter products for this category (preserves the order from the products array)
      const categoryProducts = (project.products || []).filter(p => p.categoryId === category.id);
      
      // Skip empty categories for print view
      if (categoryProducts.length === 0) return;
      
      // Calculate category total, converting to project currency
      let categoryTotal = 0;
      let categoryEngineeringTime = 0;
      let categoryProductionTime = 0;
      let categoryCommissioningTime = 0;
      
      categoryProducts.forEach(product => {
        const productDetails = findProductById(product.productId);
        if (productDetails) {
          // Convert product price to project currency
          const sourceCurrency = productDetails.currency || 'USD';
          const convertedPrice = convertCurrency(
            productDetails.price,
            sourceCurrency,
            projectCurrency
          );
          categoryTotal += convertedPrice * product.quantity;
          
          // Add installation time (use product's own time values, even for bundles)
          if (productDetails.installationTime) {
            categoryEngineeringTime += (productDetails.installationTime.engineering || 0) * product.quantity;
            categoryProductionTime += (productDetails.installationTime.production || 0) * product.quantity;
            categoryCommissioningTime += (productDetails.installationTime.commissioning || 0) * product.quantity;
          }
        }
      });
      
      const categoryTotalTime = categoryEngineeringTime + categoryProductionTime + categoryCommissioningTime;
      
      // Create category section
      const categorySection = document.createElement('div');
      categorySection.className = 'print-category';
      
      // Create category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'print-category-header';
      
      // Create header as a table to ensure consistent display in print
      const headerTable = document.createElement('table');
      headerTable.className = 'category-header-table';
      headerTable.style.width = '100%';
      headerTable.style.borderCollapse = 'collapse';
      
      const headerRow = headerTable.insertRow();
      
      // Category name cell
      const nameCell = headerRow.insertCell();
      nameCell.style.width = '40%';
      nameCell.style.textAlign = 'left';
      nameCell.style.fontWeight = 'bold';
      nameCell.textContent = category.name;
      
      // Hours cell
      const hoursCell = headerRow.insertCell();
      hoursCell.style.width = '40%';
      hoursCell.style.textAlign = 'right';
      
      if (categoryTotalTime > 0) {
        hoursCell.innerHTML = `
          <span style="font-weight:bold;">Hours:</span> 
          E:${categoryEngineeringTime} P:${categoryProductionTime} C:${categoryCommissioningTime} 
          <span style="font-weight:bold;">(${categoryTotalTime})</span>
        `;
      } else {
        hoursCell.innerHTML = '&nbsp;';
      }
      
      // Money cell
      const moneyCell = headerRow.insertCell();
      moneyCell.style.width = '20%';
      moneyCell.style.textAlign = 'right';
      moneyCell.style.fontWeight = 'bold';
      moneyCell.textContent = formatMoney(categoryTotal);
      
      // Clear existing content and append the table
      categoryHeader.innerHTML = '';
      categoryHeader.appendChild(headerTable);
      categorySection.appendChild(categoryHeader);
      
      // Create products table
      const productsTable = document.createElement('table');
      productsTable.className = 'print-product-table';
      
      // Add table header
      productsTable.innerHTML = `
        <thead>
          <tr>
            <th style="width:15%">ID</th>
            <th style="width:40%">Product</th>
            <th style="width:10%">Qty</th>
            <th style="width:15%">Unit</th>
            <th style="width:20%">Total</th>
          </tr>
        </thead>
        <tbody>
        </tbody>
      `;
      
      const tableBody = productsTable.querySelector('tbody');
      
      // Add products to table
      categoryProducts.forEach(product => {
        const productDetails = findProductById(product.productId);
        if (productDetails) {
          const totalPrice = productDetails.price * product.quantity;
          const row = document.createElement('tr');
          
          // Create the main product row
          row.innerHTML = `
            <td>${productDetails.id}</td>
            <td>${productDetails.name}${product.isOption ? ' <span style="color:#666;font-size:80%;font-style:italic">(Optional)</span>' : ''}</td>
            <td>${product.quantity}</td>
            <td>${formatPrice(productDetails.price, productDetails.currency)}</td>
            <td>${formatPrice(totalPrice, productDetails.currency)}</td>
          `;
          tableBody.appendChild(row);
          
          // Add installation time information if available
          if (productDetails.installationTime) {
            const engineeringTime = productDetails.installationTime.engineering || 0;
            const productionTime = productDetails.installationTime.production || 0;
            const commissioningTime = productDetails.installationTime.commissioning || 0;
            const totalTime = engineeringTime + productionTime + commissioningTime;
            
            if (totalTime > 0) {
              const timeRow = document.createElement('tr');
              timeRow.className = 'installation-time-row';
              timeRow.innerHTML = `
                <td></td>
                <td colspan="4" style="font-size:90%;color:#555;">
                  <strong>Installation Time:</strong> 
                  ${engineeringTime > 0 ? `Engineering: ${engineeringTime}h ` : ''}
                  ${productionTime > 0 ? `Production: ${productionTime}h ` : ''}
                  ${commissioningTime > 0 ? `Commissioning: ${commissioningTime}h ` : ''}
                  (Total: ${totalTime}h)
                </td>
              `;
              tableBody.appendChild(timeRow);
            }
          }
        }
      });
      
      categorySection.appendChild(productsTable);
      printViewCategories.appendChild(categorySection);
    });
  }
  
  // Handle uncategorized products
  const uncategorizedProducts = (project.products || []).filter(p => !p.categoryId);
  if (uncategorizedProducts.length > 0) {
    // Calculate uncategorized total and hours
    let uncategorizedTotal = 0;
    let uncategorizedEngineeringTime = 0;
    let uncategorizedProductionTime = 0;
    let uncategorizedCommissioningTime = 0;
    
    uncategorizedProducts.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        uncategorizedTotal += productDetails.price * product.quantity;
        
        // Add installation time (use product's own time values, even for bundles)
        if (productDetails.installationTime) {
          uncategorizedEngineeringTime += (productDetails.installationTime.engineering || 0) * product.quantity;
          uncategorizedProductionTime += (productDetails.installationTime.production || 0) * product.quantity;
          uncategorizedCommissioningTime += (productDetails.installationTime.commissioning || 0) * product.quantity;
        }
      }
    });
    
    const uncategorizedTotalTime = uncategorizedEngineeringTime + uncategorizedProductionTime + uncategorizedCommissioningTime;
    
    // Create uncategorized section
    const uncategorizedSection = document.createElement('div');
    uncategorizedSection.className = 'print-category';
    
    // Create category header
    const uncategorizedHeader = document.createElement('div');
    uncategorizedHeader.className = 'print-category-header';
    // Create header as a table to ensure consistent display in print
    const headerTable = document.createElement('table');
    headerTable.className = 'category-header-table';
    headerTable.style.width = '100%';
    headerTable.style.borderCollapse = 'collapse';
    
    const headerRow = headerTable.insertRow();
    
    // Category name cell
    const nameCell = headerRow.insertCell();
    nameCell.style.width = '40%';
    nameCell.style.textAlign = 'left';
    nameCell.style.fontWeight = 'bold';
    nameCell.textContent = 'Uncategorized Products';
    
    // Hours cell
    const hoursCell = headerRow.insertCell();
    hoursCell.style.width = '40%';
    hoursCell.style.textAlign = 'right';
    
    if (uncategorizedTotalTime > 0) {
      hoursCell.innerHTML = `
        <span style="font-weight:bold;">Hours:</span> 
        E:${uncategorizedEngineeringTime} P:${uncategorizedProductionTime} C:${uncategorizedCommissioningTime} 
        <span style="font-weight:bold;">(${uncategorizedTotalTime})</span>
      `;
    } else {
      hoursCell.innerHTML = '&nbsp;';
    }
    
    // Money cell
    const moneyCell = headerRow.insertCell();
    moneyCell.style.width = '20%';
    moneyCell.style.textAlign = 'right';
    moneyCell.style.fontWeight = 'bold';
    moneyCell.textContent = formatMoney(uncategorizedTotal);
    
    // Clear existing content and append the table
    uncategorizedHeader.innerHTML = '';
    uncategorizedHeader.appendChild(headerTable);
    uncategorizedSection.appendChild(uncategorizedHeader);
    
    // Create products table
    const productsTable = document.createElement('table');
    productsTable.className = 'print-product-table';
    
    // Add table header
    productsTable.innerHTML = `
      <thead>
        <tr>
          <th style="width:15%">ID</th>
          <th style="width:40%">Product</th>
          <th style="width:10%">Qty</th>
          <th style="width:15%">Unit</th>
          <th style="width:20%">Total</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    `;
    
    const tableBody = productsTable.querySelector('tbody');
    
    // Add products to table
    uncategorizedProducts.forEach(product => {
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        const totalPrice = productDetails.price * product.quantity;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${productDetails.id}</td>
          <td>${productDetails.name}</td>
          <td>${product.quantity}</td>
          <td>${formatPrice(productDetails.price, productDetails.currency)}</td>
          <td>${formatPrice(totalPrice, productDetails.currency)}</td>
        `;
        tableBody.appendChild(row);
        
        // Add installation time information if available
        if (productDetails.installationTime) {
          const engineeringTime = productDetails.installationTime.engineering || 0;
          const productionTime = productDetails.installationTime.production || 0;
          const commissioningTime = productDetails.installationTime.commissioning || 0;
          const totalTime = engineeringTime + productionTime + commissioningTime;
          
          if (totalTime > 0) {
            const timeRow = document.createElement('tr');
            timeRow.className = 'installation-time-row';
            timeRow.innerHTML = `
              <td></td>
              <td colspan="4" style="font-size:90%;color:#555;">
                <strong>Installation Time:</strong> 
                ${engineeringTime > 0 ? `Engineering: ${engineeringTime}h ` : ''}
                ${productionTime > 0 ? `Production: ${productionTime}h ` : ''}
                ${commissioningTime > 0 ? `Commissioning: ${commissioningTime}h ` : ''}
                (Total: ${totalTime}h)
              </td>
            `;
            tableBody.appendChild(timeRow);
          }
        }
      }
    });
    
    uncategorizedSection.appendChild(productsTable);
    printViewCategories.appendChild(uncategorizedSection);
  }
}

// Initialize file menu dropdown and handlers
function initializeFileMenu() {
  // Setup project file menu
  setupProjectFileMenu();
  
  // Close dropdown when clicking elsewhere
  document.addEventListener('click', (e) => {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      if (dropdown.classList.contains('show') && !dropdown.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  });
}

// Setup the project window's file menu
function setupProjectFileMenu() {
  const projectFileMenuBtn = document.getElementById('project-file-menu-btn');
  const projectFileDropdown = document.getElementById('project-file-dropdown');
  
  // Toggle dropdown on click
  if (projectFileMenuBtn) {
    projectFileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = projectFileMenuBtn.parentElement;
      dropdown.classList.toggle('show');
    });
  }
  
  // Handle project file menu actions
  if (projectFileDropdown) {
    // Print Products
    const printBtn = document.getElementById('project-file-print');
    if (printBtn) {
      printBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentProject = getCurrentProject();
        openPrintWindow(currentProject);
      });
    }
    
    // Save as PDF
    const savePdfBtn = document.getElementById('project-file-save-pdf');
    if (savePdfBtn) {
      savePdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentProject = getCurrentProject();
        showNotification('Use the "Save as PDF" option in the print dialog', 'info');
        openPrintWindow(currentProject);
      });
    }
    
    // Export to Excel
    const exportExcelBtn = document.getElementById('project-file-export-excel');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentProject = getCurrentProject();
        exportProjectProductsToCSV(currentProject);
      });
    }
  }
}

// Helper function to get the current active project
function getCurrentProject() {
  // Check if we're in a project modal
  const projectModal = document.getElementById('project-details-modal');
  if (projectModal && projectModal.classList.contains('active') && projectModal.dataset.projectId) {
    const projectId = projectModal.dataset.projectId;
    // For now, just return a reference to the active project from the modal
    return {
      id: projectId,
      title: document.getElementById('project-details-title').textContent,
      client: document.getElementById('details-client').textContent,
      description: document.getElementById('details-description').textContent,
      products: getActiveProjectProducts(),
      productCategories: getActiveProjectCategories()
    };
  }
  
  // Otherwise return a mock project so we can test the feature
  return {
    id: 'demo-project',
    title: 'Demo Project',
    client: 'Demo Client',
    description: 'This is a demo project for testing the print feature.',
    products: allProducts.slice(0, 5).map(p => ({
      productId: p.id,
      quantity: 1
    })),
    productCategories: [
      { id: 'cat1', name: 'Hardware', order: 0 },
      { id: 'cat2', name: 'Software', order: 1 },
      { id: 'cat3', name: 'Services', order: 2 }
    ]
  };
}

// Helper to get products from active project view
function getActiveProjectProducts() {
  const products = [];
  
  // First get categorized products in order they appear in each category
  const categoryContainers = document.querySelectorAll('.project-product-category');
  categoryContainers.forEach(categoryContainer => {
    const categoryId = categoryContainer.dataset.categoryId;
    const categoryProductsEl = categoryContainer.querySelector('.category-products');
    
    if (categoryProductsEl) {
      const productElements = categoryProductsEl.querySelectorAll('.product-item');
      
      productElements.forEach(el => {
        const productId = el.querySelector('.product-item-id')?.textContent;
        const quantity = parseInt(el.querySelector('.product-item-quantity')?.textContent) || 1;
        const isOption = el.classList.contains('option');
        
        if (productId) {
          products.push({
            productId,
            quantity,
            categoryId,
            isOption
          });
        }
      });
    }
  });
  
  // Then get uncategorized products
  const uncategorizedContainer = document.querySelector('.uncategorized-products');
  if (uncategorizedContainer) {
    const productElements = uncategorizedContainer.querySelectorAll('.product-item');
    
    productElements.forEach(el => {
      const productId = el.querySelector('.product-item-id')?.textContent;
      const quantity = parseInt(el.querySelector('.product-item-quantity')?.textContent) || 1;
      const isOption = el.classList.contains('option');
      
      if (productId) {
        products.push({
          productId,
          quantity,
          categoryId: null,
          isOption
        });
      }
    });
  }
  
  return products;
}

// Helper to get categories from active project view
function getActiveProjectCategories() {
  const categories = [];
  const categoryElements = document.querySelectorAll('.project-product-category');
  categoryElements.forEach((el, index) => {
    const categoryId = el.dataset.categoryId;
    const categoryName = el.querySelector('.category-name')?.textContent;
    if (categoryId && categoryName) {
      categories.push({
        id: categoryId,
        name: categoryName,
        order: index
      });
    }
  });
  return categories;
}

// Initialize product categories in settings
function initializeProductCategoriesSettings() {
  const categoriesList = document.getElementById('product-categories-list');
  const addCategoryBtn = document.getElementById('add-category-btn');
  const newCategoryInput = document.getElementById('new-category-input');
  
  if (!categoriesList || !addCategoryBtn || !newCategoryInput) return;
  
  // Load and render product categories
  renderCategoriesInSettings();
  
  // Add new category button
  addCategoryBtn.addEventListener('click', () => {
    const categoryName = newCategoryInput.value.trim();
    if (!categoryName) return;
    
    addCategoryToSettings(categoryName);
    newCategoryInput.value = '';
    newCategoryInput.focus();
  });
  
  // Add new category on Enter key
  newCategoryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addCategoryBtn.click();
    }
  });
}

// Render categories in settings
function renderCategoriesInSettings() {
  const categoriesList = document.getElementById('product-categories-list');
  if (!categoriesList) return;
  
  // Clear existing items
  categoriesList.innerHTML = '';
  
  // Load categories
  const categories = loadProductCategories();
  
  // Sort categories by their order
  categories.sort((a, b) => a.order - b.order);
  
  // Render each category
  categories.forEach(category => {
    addCategoryToSettings(category.name, category.id);
  });
  
  // Setup drag and drop for category reordering
  setupCategoryDragDrop();
}

// Add a category item to the settings UI
function addCategoryToSettings(categoryName, categoryId = null) {
  const categoriesList = document.getElementById('product-categories-list');
  if (!categoriesList) return;
  
  const categoryItem = document.createElement('div');
  categoryItem.className = 'category-item';
  categoryItem.draggable = true;
  
  // Generate a new ID if one wasn't provided
  const id = categoryId || generateCategoryId();
  categoryItem.dataset.id = id;
  
  categoryItem.innerHTML = `
    <div class="category-drag-handle">
      <i class="fa fa-bars"></i>
    </div>
    <div class="category-title">${categoryName}</div>
    <div class="category-actions">
      <button class="btn-icon edit-category" title="Edit category">
        <i class="fa fa-pencil"></i>
      </button>
      <button class="btn-icon remove-category" title="Remove category">
        <i class="fa fa-trash"></i>
      </button>
    </div>
  `;
  
  // Set up edit button
  const editBtn = categoryItem.querySelector('.edit-category');
  editBtn.addEventListener('click', () => {
    const titleElement = categoryItem.querySelector('.category-title');
    const currentName = titleElement.textContent;
    
    // Create an input for editing
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'category-edit-input';
    
    // Replace the title with the input
    titleElement.innerHTML = '';
    titleElement.appendChild(input);
    input.focus();
    input.select();
    
    // Event listener for Enter key and blur
    const saveEdit = () => {
      const newName = input.value.trim();
      if (newName) {
        titleElement.textContent = newName;
      } else {
        titleElement.textContent = currentName;
      }
    };
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      }
    });
    
    input.addEventListener('blur', saveEdit);
  });
  
  // Set up remove button
  const removeBtn = categoryItem.querySelector('.remove-category');
  removeBtn.addEventListener('click', () => {
    if (confirm(`Are you sure you want to remove the "${categoryName}" category?`)) {
      categoryItem.remove();
    }
  });
  
  // Add to list
  categoriesList.appendChild(categoryItem);
}

// Set up drag and drop for category reordering
function setupCategoryDragDrop() {
  const categoriesList = document.getElementById('product-categories-list');
  if (!categoriesList) return;
  
  const categoryItems = categoriesList.querySelectorAll('.category-item');
  
  categoryItems.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.dataset.id);
      item.classList.add('dragging');
      
      // Set a delay for visual feedback
      setTimeout(() => {
        item.style.opacity = '0.4';
      }, 0);
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      item.style.opacity = '1';
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      if (dragging && dragging !== item) {
        const box = item.getBoundingClientRect();
        const offset = e.clientY - box.top;
        
        if (offset < box.height / 2) {
          // Insert before
          categoriesList.insertBefore(dragging, item);
        } else {
          // Insert after
          categoriesList.insertBefore(dragging, item.nextSibling);
        }
      }
    });
  });
}

// Populate the Products Tab with categorized products
function populateProductsTab(project) {
  const productsEl = document.getElementById('details-products');
  const categoriesEl = document.getElementById('details-product-categories');
  
  if (!productsEl || !categoriesEl) return;
  
  // Clear existing content
  productsEl.innerHTML = '';
  categoriesEl.innerHTML = '';
  
  let totalProducts = 0;
  
  // Calculate total value for all products in this project, converting to project currency
  // Skip optional products in the total
  let totalValue = 0;
  const projectCurrency = project.currency || 'USD';
  (project.products || []).forEach(product => {
    // Skip optional products in the total
    if (product.isOption) return;
    
    const productDetails = findProductById(product.productId);
    if (productDetails) {
      // Convert product price to project currency
      const sourceCurrency = productDetails.currency || 'USD';
      const convertedPrice = convertCurrency(
        productDetails.price,
        sourceCurrency,
        projectCurrency
      );
      totalValue += convertedPrice * product.quantity;
    }
  });
  
  // Initialize or get project categories
  if (!project.productCategories) {
    // Use default categories from settings if none are defined for this project
    project.productCategories = loadProductCategories().map(cat => ({
      ...cat,
      expanded: true
    }));
  }
  
  // Sort categories by order
  project.productCategories.sort((a, b) => a.order - b.order);
  
  // Update category count display
  const categoryCountDisplay = document.getElementById('category-count-display');
  if (categoryCountDisplay) {
    const count = project.productCategories.length;
    categoryCountDisplay.textContent = `${count} ${count === 1 ? 'category' : 'categories'}`;
  }
  
  // Create categories
  project.productCategories.forEach(category => {
    const categoryEl = document.createElement('div');
    categoryEl.className = 'project-product-category';
    categoryEl.dataset.categoryId = category.id;
    
    // Filter products for this category and store original index
    const categoryProducts = [];
    (project.products || []).forEach((p, idx) => {
      if (p.categoryId === category.id) {
        // Create a new object with the original index
        categoryProducts.push({...p, _originalIndex: idx});
      }
    });
    
    // Calculate category total first, converting to project currency
    // Skip optional products in the total
    let categoryTotal = 0;
    categoryProducts.forEach(product => {
      // Skip optional products in the total
      if (product.isOption) return;
      
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        // Convert product price to project currency
        const sourceCurrency = productDetails.currency || 'USD';
        const convertedPrice = convertCurrency(
          productDetails.price,
          sourceCurrency,
          projectCurrency
        );
        categoryTotal += convertedPrice * product.quantity;
      }
    });

    // Create category header with inline total
    const headerEl = document.createElement('div');
    headerEl.className = 'category-header';
    headerEl.innerHTML = `
      <div class="category-name">
        <i class="fa fa-folder${category.expanded ? '-open' : ''}"></i>
        ${category.name}
        <span class="category-total">${formatMoney(categoryTotal, project.currency || 'USD')}</span>
      </div>
      <div class="category-actions">
        <button class="btn-icon toggle-category" title="${category.expanded ? 'Collapse' : 'Expand'} category">
          <i class="fa fa-${category.expanded ? 'chevron-up' : 'chevron-down'}"></i>
        </button>
        <button class="btn-icon add-product-to-category" title="Add product to this category">
          <i class="fa fa-plus"></i>
        </button>
        <button class="btn-icon move-category-up" title="Move category up">
          <i class="fa fa-arrow-up"></i>
        </button>
        <button class="btn-icon move-category-down" title="Move category down">
          <i class="fa fa-arrow-down"></i>
        </button>
        <button class="btn-icon remove-category" title="Remove category">
          <i class="fa fa-trash"></i>
        </button>
      </div>
    `;
    
    // Add toggle functionality
    const toggleBtn = headerEl.querySelector('.toggle-category');
    toggleBtn.addEventListener('click', () => {
      category.expanded = !category.expanded;
      toggleCategoryExpansion(categoryEl, category.expanded);
    });
    
    // Add product to category button
    const addProductBtn = headerEl.querySelector('.add-product-to-category');
    addProductBtn.addEventListener('click', () => {
      showAddProductModal(project, category.id);
    });
    
    // Move category up button
    const moveUpBtn = headerEl.querySelector('.move-category-up');
    moveUpBtn.addEventListener('click', () => {
      moveCategoryUp(category.id);
    });
    
    // Move category down button
    const moveDownBtn = headerEl.querySelector('.move-category-down');
    moveDownBtn.addEventListener('click', () => {
      moveCategoryDown(category.id);
    });
    
    // Remove category button
    const removeBtn = headerEl.querySelector('.remove-category');
    removeBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to remove the "${category.name}" category?`)) {
        removeCategory(category.id);
      }
    });
    
    // Create category products container
    const productsContainerEl = document.createElement('div');
    productsContainerEl.className = 'category-products';
    productsContainerEl.style.display = category.expanded ? 'block' : 'none';
    
    // We already filtered products for this category above
    totalProducts += categoryProducts.length;
    
    // If no products in this category, show empty message
    if (categoryProducts.length === 0) {
      productsContainerEl.innerHTML = `
        <div class="empty-category">No products in this category</div>
        <div class="category-drop-zone" data-category-id="${category.id}">
          Drop products here
        </div>
      `;
    } else {
      // Add products to this category
      categoryProducts.forEach((product, index) => {
        const productEl = createProductElement(product, index, project.currency);
        if (productEl) {
          productsContainerEl.appendChild(productEl);
        }
      });
      
      // Add drop zone after products
      const dropZone = document.createElement('div');
      dropZone.className = 'category-drop-zone';
      dropZone.dataset.categoryId = category.id;
      dropZone.textContent = 'Drop products here';
      productsContainerEl.appendChild(dropZone);
    }
    
    // Assemble the category element
    categoryEl.appendChild(headerEl);
    categoryEl.appendChild(productsContainerEl);
    
    // Add to categories container
    categoriesEl.appendChild(categoryEl);
  });
  
  // Handle any uncategorized products
  const uncategorizedProducts = [];
  (project.products || []).forEach((p, idx) => {
    if (!p.categoryId) {
      // Create a new object with the original index
      uncategorizedProducts.push({...p, _originalIndex: idx});
    }
  });
  
  // Update product count display
  const productCountDisplay = document.getElementById('product-count-display');
  if (productCountDisplay) {
    const count = (project.products || []).length;
    const projectCurrency = project.currency || 'USD';
    productCountDisplay.textContent = `${count} ${count === 1 ? 'product' : 'products'} - Total: ${formatMoney(totalValue, projectCurrency)}`;
  }
  
  if (uncategorizedProducts.length > 0) {
    totalProducts += uncategorizedProducts.length;
    
    // Calculate uncategorized total, converting to project currency
    // Skip optional products in the total
    let uncategorizedTotal = 0;
    uncategorizedProducts.forEach(product => {
      // Skip optional products in the total
      if (product.isOption) return;
      
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        // Convert product price to project currency
        const sourceCurrency = productDetails.currency || 'USD';
        const convertedPrice = convertCurrency(
          productDetails.price,
          sourceCurrency,
          projectCurrency
        );
        uncategorizedTotal += convertedPrice * product.quantity;
      }
    });
    
    productsEl.innerHTML = `<h3>Uncategorized Products <span class="category-total">${formatMoney(uncategorizedTotal, project.currency || 'USD')}</span></h3>`;
    
    // Create container for uncategorized products
    const uncategorizedContainer = document.createElement('div');
    uncategorizedContainer.className = 'uncategorized-products';
    
    uncategorizedProducts.forEach((product, index) => {
      const productEl = createProductElement(product, index, project.currency);
      if (productEl) {
        // Make draggable for categorization
        productEl.draggable = true;
        
        productEl.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('product-index', index.toString());
          e.dataTransfer.setData('product-category', 'uncategorized');
          productEl.classList.add('dragging');
        });
        
        productEl.addEventListener('dragend', () => {
          productEl.classList.remove('dragging');
        });
        
        uncategorizedContainer.appendChild(productEl);
        
        // We already calculated the total above
      }
    });
    
    // We're now showing the summary in the header
    
    productsEl.appendChild(uncategorizedContainer);
  } else if ((project.products || []).length === 0) {
    productsEl.innerHTML = '<div class="empty-message">No products for this project</div>';
  } else {
    productsEl.innerHTML = '<div class="empty-message">All products are categorized</div>';
  }
  
  // Show total value
  const totalEl = document.getElementById('details-products-total-bar');
  if (totalEl) {
    totalEl.textContent = `Total Product Value: ${formatMoney(totalValue, project.currency || 'USD')}`;
  }
  
  // Set up "Add Product" button
  const addProductBtn = document.getElementById('add-project-product-btn');
  if (addProductBtn) {
    addProductBtn.onclick = () => {
      showAddProductModal(project);
    };
  }
  
  // Set up "Add Category" button
  const addCategoryBtn = document.getElementById('add-product-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.onclick = () => {
      addNewCategory();
    };
  }
  
  // Set up "Save Changes" button
  const saveProductsBtn = document.getElementById('save-products-changes');
  if (saveProductsBtn) {
    saveProductsBtn.onclick = () => {
      saveProjectProductChanges();
    };
  }
  
  // Setup drag and drop for categorization
  setupProductCategorization();
  
  // Setup drag and drop for product reordering within categories
  setupProductDragDrop();
}

// Create a product element for the products list
function createProductElement(product, index, projectCurrency) {
  const productDetails = findProductById(product.productId);
  
  // Create a container for the product
  const productItem = document.createElement('div');
  productItem.className = 'product-item';
  if (product.isOption) {
    productItem.classList.add('option');
  }
  productItem.dataset.index = index;
  
  // Make the product item draggable for reordering
  productItem.draggable = true;
  
  if (productDetails) {
    // Get the source currency of the product
    const sourceCurrency = productDetails.currency || 'USD';
    
    // If project currency is provided, convert prices to it
    if (projectCurrency && projectCurrency !== sourceCurrency) {
      // Convert unit price to project currency
      const convertedUnitPrice = convertCurrency(
        productDetails.price,
        sourceCurrency,
        projectCurrency
      );
      const totalPrice = convertedUnitPrice * product.quantity;
      
      productItem.innerHTML = `
        <div class="product-item-header">
          <div class="product-item-name">${productDetails.name}</div>
          <div class="product-item-details">
            <div class="product-item-id">${productDetails.id}</div>
            <div class="product-item-price">${product.quantity} x ${formatPrice(convertedUnitPrice, projectCurrency)} = ${formatPrice(totalPrice, projectCurrency)}</div>
          </div>
        </div>
        <div class="product-actions">
          <div class="product-item-quantity">${product.quantity}x</div>
          <button class="btn-icon toggle-option" data-index="${product._originalIndex !== undefined ? product._originalIndex : index}" title="${product.isOption ? 'Mark as regular item' : 'Mark as optional'}">
            <i class="fa ${product.isOption ? 'fa-check-square-o' : 'fa-square-o'}"></i>
          </button>
          <button class="btn-icon remove-product" data-index="${product._originalIndex !== undefined ? product._originalIndex : index}" title="Remove product">
            <i class="fa fa-trash"></i>
          </button>
        </div>`;
    } else {
      // Use original currency if no project currency provided
      const totalPrice = productDetails.price * product.quantity;
      
      productItem.innerHTML = `
        <div class="product-item-header">
          <div class="product-item-name">${productDetails.name}</div>
          <div class="product-item-details">
            <div class="product-item-id">${productDetails.id}</div>
            <div class="product-item-price">${product.quantity} x ${formatPrice(productDetails.price, sourceCurrency)} = ${formatPrice(totalPrice, sourceCurrency)}</div>
          </div>
        </div>
        <div class="product-actions">
          <div class="product-item-quantity">${product.quantity}x</div>
          <button class="btn-icon toggle-option" data-index="${product._originalIndex !== undefined ? product._originalIndex : index}" title="${product.isOption ? 'Mark as regular item' : 'Mark as optional'}">
            <i class="fa ${product.isOption ? 'fa-check-square-o' : 'fa-square-o'}"></i>
          </button>
          <button class="btn-icon remove-product" data-index="${product._originalIndex !== undefined ? product._originalIndex : index}" title="Remove product">
            <i class="fa fa-trash"></i>
          </button>
        </div>`;
    }
    
    // Add event listener for remove button
    const removeButton = productItem.querySelector('.remove-product');
    if (removeButton) {
      removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        removeProductFromProject(index);
      });
    }
    
    // Add event listeners for the buttons
    const toggleOptionButton = productItem.querySelector('.toggle-option');
    if (toggleOptionButton) {
      toggleOptionButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const dataIndex = parseInt(toggleOptionButton.getAttribute('data-index'), 10);
        toggleProductOptionStatus(dataIndex);
      });
    }
    
    return productItem;
  } else {
    // Product not found
    productItem.innerHTML = `
      <div class="product-item-header">
        <div class="product-item-name">Unknown Product</div>
        <div class="product-actions">
          <div class="product-item-quantity">${product.quantity}x</div>
          <button class="btn-icon remove-product" data-index="${index}" title="Remove product">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="product-item-details">
        <div class="product-item-id">${product.productId}</div>
        <div class="product-item-price">Product not found</div>
      </div>
    `;
    
    // Add event listener for remove button
    const removeButton = productItem.querySelector('.remove-product');
    if (removeButton) {
      removeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        removeProductFromProject(index);
      });
    }
    
    return productItem;
  }
}

// Set up drag and drop for product categorization
function setupProductCategorization() {
  // Get all drop zones
  const dropZones = document.querySelectorAll('.category-drop-zone');
  
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });
    
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      
      const productIndex = e.dataTransfer.getData('product-index');
      const productCategory = e.dataTransfer.getData('product-category');
      const targetCategoryId = zone.dataset.categoryId;
      
      if (productIndex && targetCategoryId) {
        moveProductToCategory(parseInt(productIndex), targetCategoryId, productCategory);
      }
    });
  });
}

// Set up drag and drop for product reordering within categories
function setupProductDragDrop() {
  // Get all product items
  const productItems = document.querySelectorAll('.product-item');
  
  productItems.forEach(item => {
    // Setup drag start
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('product-index', item.dataset.index);
      e.dataTransfer.setData('product-category', item.closest('.category-products')?.parentElement?.dataset?.categoryId || 'uncategorized');
      // Add a class to style during dragging
      item.classList.add('dragging');
      
      // Set a delay for visual feedback
      setTimeout(() => {
        item.style.opacity = '0.4';
      }, 0);
    });
    
    // Setup drag end
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      item.style.opacity = '1';
    });
    
    // Setup drag over (to handle reordering within same category)
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingItem = document.querySelector('.product-item.dragging');
      
      if (draggingItem && draggingItem !== item) {
        const currentCategory = item.closest('.category-products');
        const draggingCategory = draggingItem.closest('.category-products');
        
        // Only handle reordering if in the same category
        if (currentCategory && draggingCategory && currentCategory === draggingCategory) {
          const box = item.getBoundingClientRect();
          const offset = e.clientY - box.top;
          
          if (offset < box.height / 2) {
            // Insert before
            currentCategory.insertBefore(draggingItem, item);
          } else {
            // Insert after
            currentCategory.insertBefore(draggingItem, item.nextSibling);
          }
        }
      }
    });
  });
  
  // Handle drop to update the model
  document.addEventListener('dragend', () => {
    updateProductOrdersInModel();
  });
}

// Update the product orders in the model after drag and drop
function updateProductOrdersInModel() {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project || !project.products) return;
  
  // Create a new array to hold the reordered products
  const reorderedProducts = [];
  
  // First handle categorized products
  const categoryContainers = document.querySelectorAll('.project-product-category');
  categoryContainers.forEach(categoryContainer => {
    const categoryId = categoryContainer.dataset.categoryId;
    const categoryProductsEl = categoryContainer.querySelector('.category-products');
    
    if (categoryProductsEl) {
      const productElements = categoryProductsEl.querySelectorAll('.product-item');
      
      productElements.forEach(productEl => {
        const originalIndex = parseInt(productEl.dataset.index, 10);
        if (!isNaN(originalIndex) && project.products[originalIndex]) {
          const product = {...project.products[originalIndex]};
          product.categoryId = categoryId; // Ensure category is set correctly
          reorderedProducts.push(product);
        }
      });
    }
  });
  
  // Then handle uncategorized products
  const uncategorizedContainer = document.querySelector('.uncategorized-products');
  if (uncategorizedContainer) {
    const productElements = uncategorizedContainer.querySelectorAll('.product-item');
    
    productElements.forEach(productEl => {
      const originalIndex = parseInt(productEl.dataset.index, 10);
      if (!isNaN(originalIndex) && project.products[originalIndex]) {
        const product = {...project.products[originalIndex]};
        product.categoryId = null; // Ensure product is uncategorized
        reorderedProducts.push(product);
      }
    });
  }
  
  // If we have all the products, update the project
  if (reorderedProducts.length === project.products.length) {
    project.products = reorderedProducts;
    showNotification('Product order updated', 'success');
  } else {
    console.error('Product count mismatch during reordering');
    showNotification('Error updating product order', 'error');
  }
}

// Move a product to a category
function moveProductToCategory(productIndex, categoryId, sourceCategory) {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project || !project.products) return;
  
  // Get the product to move
  const productToMove = project.products[productIndex];
  if (!productToMove) return;
  
  // Clone the product with the new category ID
  const updatedProduct = {
    ...productToMove,
    categoryId: categoryId
  };
  
  // Remove the product from its original position
  project.products.splice(productIndex, 1);
  
  // If there are products in the target category, add it to the end of that group
  const targetCategoryProducts = project.products.filter(p => p.categoryId === categoryId);
  
  if (targetCategoryProducts.length > 0) {
    // Find the index of the last product in this category
    const lastIndex = project.products.findIndex(p => p.categoryId === categoryId);
    let insertIndex = lastIndex;
    
    // Find the actual last index of the category (there may be multiple)
    for (let i = lastIndex + 1; i < project.products.length; i++) {
      if (project.products[i].categoryId === categoryId) {
        insertIndex = i;
      } else if (insertIndex !== lastIndex) {
        // We found the end of the category group
        break;
      }
    }
    
    // Insert after the last product in the category
    project.products.splice(insertIndex + 1, 0, updatedProduct);
  } else {
    // If no products in target category, just append to the end
    project.products.push(updatedProduct);
  }
  
  // Get the category name for the notification
  let categoryName = "uncategorized";
  if (categoryId !== null) {
    const targetCategory = project.productCategories.find(c => c.id === categoryId);
    if (targetCategory && targetCategory.name) {
      categoryName = targetCategory.name;
    }
  }
  
  // Show feedback
  showNotification(`Product moved to ${categoryName}`, 'success');
  
  // Update the UI
  populateProductsTab(project);
}

// Add a new category to the project
function addNewCategory() {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project) return;
  
  // Show our custom input modal instead of prompt()
  showInputModal(
    'Add Category', 
    'Enter a name for the new category:', 
    '', 
    (categoryName) => {
      // If user cancelled or entered empty string, do nothing
      if (!categoryName) return;
      
      // Initialize categories array if needed
      if (!project.productCategories) {
        project.productCategories = [];
      }
      
      // Add the new category
      const newCategory = {
        id: generateCategoryId(),
        name: categoryName,
        order: project.productCategories.length,
        expanded: true
      };
      
      project.productCategories.push(newCategory);
      
      // Show success notification
      showNotification(`Category "${categoryName}" added successfully`, 'success');
      
      // Update the UI
      populateProductsTab(project);
    }
  );
}

// Remove a category from the project
function removeCategory(categoryId) {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project || !project.productCategories) return;
  
  // Find the category index
  const categoryIndex = project.productCategories.findIndex(c => c.id === categoryId);
  if (categoryIndex === -1) return;
  
  // Remove the category
  project.productCategories.splice(categoryIndex, 1);
  
  // Remove category ID from all products in this category
  if (project.products) {
    project.products.forEach(product => {
      if (product.categoryId === categoryId) {
        delete product.categoryId;
      }
    });
  }
  
  // Update the UI
  populateProductsTab(project);
}

// Move a category up in the order
function moveCategoryUp(categoryId) {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project || !project.productCategories) return;
  
  // Find the category index
  const categoryIndex = project.productCategories.findIndex(c => c.id === categoryId);
  if (categoryIndex <= 0) return; // Already at the top
  
  // Swap with the previous category
  const temp = project.productCategories[categoryIndex];
  project.productCategories[categoryIndex] = project.productCategories[categoryIndex - 1];
  project.productCategories[categoryIndex - 1] = temp;
  
  // Update order values
  project.productCategories.forEach((cat, idx) => {
    cat.order = idx;
  });
  
  // Update the UI
  populateProductsTab(project);
}

// Move a category down in the order
function moveCategoryDown(categoryId) {
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) return;
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project || !project.productCategories) return;
  
  // Find the category index
  const categoryIndex = project.productCategories.findIndex(c => c.id === categoryId);
  if (categoryIndex === -1 || categoryIndex >= project.productCategories.length - 1) return; // Already at the bottom
  
  // Swap with the next category
  const temp = project.productCategories[categoryIndex];
  project.productCategories[categoryIndex] = project.productCategories[categoryIndex + 1];
  project.productCategories[categoryIndex + 1] = temp;
  
  // Update order values
  project.productCategories.forEach((cat, idx) => {
    cat.order = idx;
  });
  
  // Update the UI
  populateProductsTab(project);
}

// Toggle category expansion
function toggleCategoryExpansion(categoryEl, expanded) {
  const categoryIcon = categoryEl.querySelector('.category-name i');
  const toggleIcon = categoryEl.querySelector('.toggle-category i');
  const productsContainer = categoryEl.querySelector('.category-products');
  
  if (expanded) {
    categoryIcon.className = 'fa fa-folder-open';
    toggleIcon.className = 'fa fa-chevron-up';
    productsContainer.style.display = 'block';
  } else {
    categoryIcon.className = 'fa fa-folder';
    toggleIcon.className = 'fa fa-chevron-down';
    productsContainer.style.display = 'none';
  }
}

// Show modal to add a product
function showAddProductModal(project, categoryId = null) {
  // If project parameter is not provided, get it from the current modal
  if (!project) {
    const detailsModal = document.getElementById('project-details-modal');
    if (detailsModal) {
      const projectId = detailsModal.dataset.projectId;
      project = projects.find(p => p.id === projectId);
      if (!project) {
        showNotification('Could not find project data', 'error');
        return;
      }
    } else {
      showNotification('Project details not found', 'error');
      return;
    }
  }
  
  // We'll reuse project product input for simplicity
  const tempContainer = document.createElement('div');
  tempContainer.id = 'temp-product-container';
  document.body.appendChild(tempContainer);
  
  // Create a product input inside it
  addProjectProductInput(null, tempContainer);
  
  // Create a modal for selecting products
  // Find category name if a category ID is provided
  let categoryName = '';
  if (categoryId && project.productCategories) {
    const category = project.productCategories.find(c => c.id === categoryId);
    if (category) {
      categoryName = category.name;
    }
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Product to Project</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Select a product to add to project: <strong>${project.title}</strong>
        ${categoryId ? `<br><span style="color: var(--accent);">Adding to category: ${categoryName}</span>` : ''}
        </p>
        
        <div id="add-product-container"></div>
        
        ${!categoryId ? `
        <div class="form-group">
          <label for="product-category-select">Add to Category</label>
          <select id="product-category-select">
            <option value="">Uncategorized</option>
            ${project.productCategories ? project.productCategories.map(cat => 
              `<option value="${cat.id}">${cat.name}</option>`).join('') : ''}
          </select>
        </div>
        ` : ''}
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="product-is-option"> Mark as optional
            <span class="optional-text">Optional products are shown as alternatives that can be included</span>
          </label>
        </div>
        
        <div class="modal-actions">
          <button class="button" id="confirm-add-product">Add Product</button>
          <button class="button button-outline" id="cancel-add-product">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  // Add the modal to the page
  document.body.appendChild(modal);
  
  // Move the product input to the modal
  const addProductContainer = document.getElementById('add-product-container');
  const productInput = tempContainer.firstChild;
  addProductContainer.appendChild(productInput);
  tempContainer.remove();
  
  // Setup close button
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Setup cancel button
  const cancelBtn = document.getElementById('cancel-add-product');
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Setup confirm button
  const confirmBtn = document.getElementById('confirm-add-product');
  confirmBtn.addEventListener('click', () => {
    const productSelect = productInput.querySelector('.project-product-select');
    const quantityInput = productInput.querySelector('.project-product-quantity');
    const isOptionalCheckbox = document.getElementById('product-is-option');
    
    if (productSelect && productSelect.value) {
      // Initialize products array if needed
      if (!project.products) {
        project.products = [];
      }
      
      // Determine category ID
      let selectedCategoryId = categoryId;
      if (!selectedCategoryId) {
        const categorySelect = document.getElementById('product-category-select');
        if (categorySelect) {
          selectedCategoryId = categorySelect.value;
        }
      }
      
      // Add the product to the project
      project.products.push({
        productId: productSelect.value,
        quantity: parseInt(quantityInput.value, 10) || 1,
        categoryId: selectedCategoryId || undefined,
        isOption: isOptionalCheckbox && isOptionalCheckbox.checked
      });
      
      // Update the projects tab
      populateProductsTab(project);
      
      // Notify the user
      showNotification('Product added to project', 'success');
    } else {
      showNotification('Please select a product', 'warning');
    }
    
    // Close the modal
    modal.remove();
  });
}

// Remove a product from the current project
function removeProductFromProject(index) {
  // Get current project from the modal
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) {
    showNotification('Project details not found', 'error');
    return;
  }
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    showNotification('Project data not found', 'error');
    return;
  }
  
  if (project.products && index >= 0 && index < project.products.length) {
    // Remove the product
    project.products.splice(index, 1);
    
    // Update the products tab
    populateProductsTab(project);
    
    // Notify the user
    showNotification('Product removed from project', 'info');
  } else {
    console.error('Invalid product index or no products array:', index, project);
  }
}

// Toggle product option status
function toggleProductOptionStatus(index) {
  // Get current project from the modal
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) {
    showNotification('Project details not found', 'error');
    return;
  }
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    showNotification('Project data not found', 'error');
    return;
  }
  
  console.log('Toggle option status for index:', index, 'products length:', project.products?.length);
  
  if (project.products && index >= 0 && index < project.products.length) {
    // Toggle the option status
    project.products[index].isOption = !project.products[index].isOption;
    console.log('Updated product at index', index, 'to isOption:', project.products[index].isOption);
    
    // Update the products tab
    populateProductsTab(project);
    
    // Notify the user
    if (project.products[index].isOption) {
      showNotification('Product marked as optional', 'success');
    } else {
      showNotification('Product marked as regular item', 'success');
    }
  } else {
    console.error('Invalid product index or no products array:', index, project);
  }
}

// Save project product changes
function saveProjectProductChanges() {
  // Get current project from the modal
  const detailsModal = document.getElementById('project-details-modal');
  if (!detailsModal) {
    showNotification('Project details not found', 'error');
    return;
  }
  
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (!project) {
    showNotification('Project data not found', 'error');
    return;
  }
  
  // Add revision for change tracking
  addProjectRevision(project, 'Product Configuration Change', 
    `Modified project products. New total: ${project.products ? project.products.length : 0} products.`);
  
  // Save the project
  saveProjectToDatabase(project)
    .then(() => {
      showNotification('Product changes saved successfully', 'success');
      
      // Update project card in the UI to reflect changes
      refreshProjectsUI();
    })
    .catch(err => {
      console.error('Error saving product changes:', err);
      showNotification('Error saving changes', 'error');
    });
}

// Populate Technical Summary Tab
function populateTechSummaryTab(project) {
  // Get tech summary fields
  const titleInput = document.getElementById('tech-summary-title');
  const scopeInput = document.getElementById('tech-summary-scope');
  const requirementsInput = document.getElementById('tech-summary-requirements');
  const approachInput = document.getElementById('tech-summary-approach');
  const constraintsInput = document.getElementById('tech-summary-constraints');
  const recommendationsInput = document.getElementById('tech-summary-recommendations');
  
  // Check if project has technical summary data
  if (project.technicalSummary) {
    titleInput.value = project.technicalSummary.title || '';
    scopeInput.value = project.technicalSummary.scope || '';
    requirementsInput.value = project.technicalSummary.requirements || '';
    approachInput.value = project.technicalSummary.approach || '';
    constraintsInput.value = project.technicalSummary.constraints || '';
    recommendationsInput.value = project.technicalSummary.recommendations || '';
  } else {
    // Set default values
    titleInput.value = `Technical Summary: ${project.title}`;
    scopeInput.value = '';
    requirementsInput.value = '';
    approachInput.value = '';
    constraintsInput.value = '';
    recommendationsInput.value = '';
  }
  
  // Set up save button
  const saveBtn = document.getElementById('tech-summary-save');
  if (saveBtn) {
    saveBtn.onclick = () => {
      saveTechnicalSummary();
    };
  }
}

// Save Technical Summary
function saveTechnicalSummary() {
  // Get current project from the modal
  const detailsModal = document.getElementById('project-details-modal');
  const projectId = detailsModal.dataset.projectId;
  const project = projects.find(p => p.id === projectId);
  
  if (project) {
    // Get tech summary fields
    const titleInput = document.getElementById('tech-summary-title');
    const scopeInput = document.getElementById('tech-summary-scope');
    const requirementsInput = document.getElementById('tech-summary-requirements');
    const approachInput = document.getElementById('tech-summary-approach');
    const constraintsInput = document.getElementById('tech-summary-constraints');
    const recommendationsInput = document.getElementById('tech-summary-recommendations');
    
    // Create or update technical summary
    project.technicalSummary = {
      title: titleInput.value,
      scope: scopeInput.value,
      requirements: requirementsInput.value,
      approach: approachInput.value,
      constraints: constraintsInput.value,
      recommendations: recommendationsInput.value,
      lastUpdated: new Date().toISOString()
    };
    
    // Add revision for change tracking
    addProjectRevision(project, 'Technical Summary Update', 
      `Updated technical summary: "${titleInput.value}"`);
    
    // Save the project
    saveProjectToDatabase(project)
      .then(() => {
        showNotification('Technical summary saved successfully', 'success');
      })
      .catch(err => {
        console.error('Error saving technical summary:', err);
        showNotification('Error saving technical summary', 'error');
      });
  }
}

// Populate Revisions Tab
function populateRevisionsTab(project) {
  const revisionsEl = document.getElementById('project-revisions');
  revisionsEl.innerHTML = '';
  
  // Hide comparison tools by default
  document.getElementById('revision-comparison-tools').style.display = 'none';
  document.getElementById('comparison-results').style.display = 'none';
  
  if (project.revisions && project.revisions.length > 0) {
    // Sort revisions by date (newest first)
    const sortedRevisions = [...project.revisions].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    sortedRevisions.forEach((revision, index) => {
      const revisionItem = document.createElement('div');
      revisionItem.className = 'revision-item';
      revisionItem.dataset.revisionIndex = index;
      
      // Format date
      const revisionDate = new Date(revision.date);
      const formattedDate = revisionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      revisionItem.innerHTML = `
        <div class="revision-header">
          <div class="revision-title">${revision.title}</div>
          <div class="revision-actions">
            <button class="btn-icon compare-revision" data-index="${index}" title="Compare to Current">
              <i class="fa fa-exchange"></i>
            </button>
            <button class="btn-icon print-revision" data-index="${index}" title="Print Revision">
              <i class="fa fa-print"></i>
            </button>
          </div>
        </div>
        <div class="revision-meta">
          <span class="revision-date">${formattedDate}</span> by 
          <span class="revision-author">${revision.author || 'Unknown'}</span>
        </div>
        <div class="revision-content">${revision.description}</div>
      `;
      
      revisionsEl.appendChild(revisionItem);
      
      // Add event listener for quick comparison button
      const compareBtn = revisionItem.querySelector('.compare-revision');
      if (compareBtn) {
        compareBtn.addEventListener('click', () => {
          quickCompareRevision(project, index);
        });
      }
    });
    
    // Set up comparison dropdowns
    setupComparisonDropdowns(project, sortedRevisions);
  } else {
    revisionsEl.innerHTML = '<div class="empty-message">No revisions saved yet</div>';
  }
  
  // Set up Create Revision button
  const createRevisionBtn = document.getElementById('create-revision-btn');
  if (createRevisionBtn) {
    createRevisionBtn.onclick = () => {
      showCreateRevisionModal();
    };
  }
  
  // Set up Compare Revisions button
  const compareRevisionsBtn = document.getElementById('compare-revisions-btn');
  if (compareRevisionsBtn) {
    compareRevisionsBtn.onclick = () => {
      toggleComparisonTools();
    };
  }
  
  // Set up Close Comparison button
  const closeComparisonBtn = document.getElementById('close-comparison-btn');
  if (closeComparisonBtn) {
    closeComparisonBtn.addEventListener('click', () => {
      document.getElementById('revision-comparison-tools').style.display = 'none';
      document.getElementById('comparison-results').style.display = 'none';
    });
  }
  
  // Set up Run Comparison button
  const runComparisonBtn = document.getElementById('run-comparison-btn');
  if (runComparisonBtn) {
    runComparisonBtn.addEventListener('click', () => {
      runDetailedComparison(project);
    });
  }
}

// Show Create Revision Modal
function showCreateRevisionModal() {
  // Create a modal for creating a revision
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create New Revision</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="revision-title">Revision Title</label>
          <input type="text" id="revision-title" placeholder="Enter a title for this revision">
        </div>
        
        <div class="form-group">
          <label for="revision-description">Description</label>
          <textarea id="revision-description" rows="5" placeholder="Describe the changes in this revision..."></textarea>
        </div>
        
        <div class="modal-actions">
          <button class="button" id="confirm-create-revision">Create Revision</button>
          <button class="button button-outline" id="cancel-create-revision">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  // Add the modal to the page
  document.body.appendChild(modal);
  
  // Setup close button
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Setup cancel button
  const cancelBtn = document.getElementById('cancel-create-revision');
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Setup confirm button
  const confirmBtn = document.getElementById('confirm-create-revision');
  confirmBtn.addEventListener('click', () => {
    const titleInput = document.getElementById('revision-title');
    const descriptionInput = document.getElementById('revision-description');
    
    if (titleInput.value.trim()) {
      // Get current project from the modal
      const detailsModal = document.getElementById('project-details-modal');
      const projectId = detailsModal.dataset.projectId;
      const project = projects.find(p => p.id === projectId);
      
      if (project) {
        addProjectRevision(project, titleInput.value, descriptionInput.value);
        
        // Save the project
        saveProjectToDatabase(project)
          .then(() => {
            showNotification('Revision created successfully', 'success');
            
            // Refresh the revisions tab
            populateRevisionsTab(project);
          })
          .catch(err => {
            console.error('Error creating revision:', err);
            showNotification('Error creating revision', 'error');
          });
      }
    } else {
      showNotification('Please enter a revision title', 'warning');
    }
    
    // Close the modal
    modal.remove();
  });
}

// Add a revision to the project
function addProjectRevision(project, title, description) {
  // Initialize revisions array if needed
  if (!project.revisions) {
    project.revisions = [];
  }
  
  // Get a snapshot of the current project products
  const productSnapshot = [];
  if (project.products && project.products.length > 0) {
    project.products.forEach(product => {
      // Find product details
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        productSnapshot.push({
          productId: product.productId,
          name: productDetails.name,
          price: productDetails.price,
          currency: productDetails.currency,
          quantity: product.quantity,
          categoryId: product.categoryId
        });
      }
    });
  }
  
  // Add the revision with product snapshot
  project.revisions.push({
    title: title,
    description: description,
    date: new Date().toISOString(),
    author: getCurrentUserName(),
    productSnapshot: productSnapshot
  });
}

// Toggle comparison tools visibility
function toggleComparisonTools() {
  const comparisonTools = document.getElementById('revision-comparison-tools');
  const currentDisplay = comparisonTools.style.display;
  
  comparisonTools.style.display = currentDisplay === 'none' ? 'block' : 'none';
  
  // Hide results when toggling tools
  document.getElementById('comparison-results').style.display = 'none';
}

// Setup comparison dropdowns
function setupComparisonDropdowns(project, sortedRevisions) {
  const fromSelect = document.getElementById('compare-from');
  const toSelect = document.getElementById('compare-to');
  
  // Clear existing options except for "Current Version"
  while (fromSelect.options.length > 1) {
    fromSelect.options.remove(1);
  }
  
  while (toSelect.options.length > 1) {
    toSelect.options.remove(1);
  }
  
  // Add options for each revision
  sortedRevisions.forEach((revision, index) => {
    const revisionDate = new Date(revision.date);
    const formattedDate = revisionDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const optionText = `${revision.title} (${formattedDate})`;
    
    // Add to "from" dropdown
    const fromOption = document.createElement('option');
    fromOption.value = index;
    fromOption.textContent = optionText;
    fromSelect.appendChild(fromOption);
    
    // Add to "to" dropdown
    const toOption = document.createElement('option');
    toOption.value = index;
    toOption.textContent = optionText;
    toSelect.appendChild(toOption);
  });
  
  // Set default selections
  if (sortedRevisions.length > 0) {
    fromSelect.value = sortedRevisions.length - 1; // Oldest revision
    toSelect.value = 'current'; // Current version
  }
}

// Quick comparison function (revision to current)
function quickCompareRevision(project, revisionIndex) {
  // Get the revision
  const sortedRevisions = [...project.revisions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  const revision = sortedRevisions[revisionIndex];
  if (!revision) return;
  
  // Show comparison tools
  document.getElementById('revision-comparison-tools').style.display = 'block';
  
  // Set dropdown values
  document.getElementById('compare-from').value = revisionIndex;
  document.getElementById('compare-to').value = 'current';
  
  // Run the comparison
  runDetailedComparison(project);
}

// Run detailed comparison
function runDetailedComparison(project) {
  const fromSelect = document.getElementById('compare-from');
  const toSelect = document.getElementById('compare-to');
  
  const fromValue = fromSelect.value;
  const toValue = toSelect.value;
  
  let fromProducts = [];
  let toProducts = [];
  
  // Get sorted revisions
  const sortedRevisions = [...project.revisions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  // Get "from" products
  if (fromValue === 'current') {
    // Current project products
    fromProducts = getCurrentProjectProducts(project);
  } else {
    const fromRevision = sortedRevisions[parseInt(fromValue)];
    if (fromRevision && fromRevision.productSnapshot) {
      fromProducts = fromRevision.productSnapshot;
    }
  }
  
  // Get "to" products
  if (toValue === 'current') {
    // Current project products
    toProducts = getCurrentProjectProducts(project);
  } else {
    const toRevision = sortedRevisions[parseInt(toValue)];
    if (toRevision && toRevision.productSnapshot) {
      toProducts = toRevision.productSnapshot;
    }
  }
  
  // Generate comparison content
  generateComparisonContent(fromProducts, toProducts, fromValue, toValue, sortedRevisions);
}

// Get current project products with details
function getCurrentProjectProducts(project) {
  const currentProducts = [];
  
  if (project.products && project.products.length > 0) {
    project.products.forEach(product => {
      // Find product details
      const productDetails = findProductById(product.productId);
      if (productDetails) {
        currentProducts.push({
          productId: product.productId,
          name: productDetails.name,
          price: productDetails.price,
          currency: productDetails.currency,
          quantity: product.quantity,
          categoryId: product.categoryId
        });
      }
    });
  }
  
  return currentProducts;
}

// Generate comparison content
function generateComparisonContent(fromProducts, toProducts, fromValue, toValue, sortedRevisions) {
  const comparisonContent = document.getElementById('comparison-content');
  const resultsContainer = document.getElementById('comparison-results');
  
  // Get version names
  let fromName = "Current Version";
  let toName = "Current Version";
  
  if (fromValue !== 'current') {
    const revision = sortedRevisions[parseInt(fromValue)];
    if (revision) {
      const date = new Date(revision.date).toLocaleDateString();
      fromName = `${revision.title} (${date})`;
    }
  }
  
  if (toValue !== 'current') {
    const revision = sortedRevisions[parseInt(toValue)];
    if (revision) {
      const date = new Date(revision.date).toLocaleDateString();
      toName = `${revision.title} (${date})`;
    }
  }
  
  // Start building comparison HTML
  let comparisonHTML = `
    <div class="comparison-summary">
      <p>Comparing <strong>${fromName}</strong> to <strong>${toName}</strong></p>
    </div>
  `;
  
  // Create a map of all products (combining both versions)
  const allProductIds = new Set();
  fromProducts.forEach(product => allProductIds.add(product.productId));
  toProducts.forEach(product => allProductIds.add(product.productId));
  
  if (allProductIds.size === 0) {
    comparisonHTML += `<p>No products found in either version.</p>`;
  } else {
    // Build comparison table
    comparisonHTML += `
      <table class="comparison-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>${fromName}</th>
            <th>${toName}</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // Convert Sets to Arrays for easier processing
    const allProductIdsArray = Array.from(allProductIds);
    
    // Get fromProducts and toProducts as maps for easier lookup
    const fromProductsMap = new Map();
    fromProducts.forEach(product => {
      fromProductsMap.set(product.productId, product);
    });
    
    const toProductsMap = new Map();
    toProducts.forEach(product => {
      toProductsMap.set(product.productId, product);
    });
    
    // Generate rows for each product
    allProductIdsArray.forEach(productId => {
      const fromProduct = fromProductsMap.get(productId);
      const toProduct = toProductsMap.get(productId);
      
      let rowClass = '';
      if (fromProduct && !toProduct) rowClass = 'removed';
      if (!fromProduct && toProduct) rowClass = 'added';
      
      // Calculate price and quantity differences if both exist
      let priceDiffHTML = '';
      let quantityDiffHTML = '';
      
      if (fromProduct && toProduct) {
        // Check for price changes
        if (fromProduct.price !== toProduct.price) {
          rowClass = 'changed';
          const priceDiff = toProduct.price - fromProduct.price;
          const percentChange = ((priceDiff / fromProduct.price) * 100).toFixed(1);
          
          const changeClass = priceDiff > 0 ? 'price-increase' : 'price-decrease';
          const signChar = priceDiff > 0 ? '+' : '';
          
          priceDiffHTML = `
            <span class="price-change-indicator ${changeClass}">
              ${signChar}${percentChange}%
            </span>
          `;
        }
        
        // Check for quantity changes
        if (fromProduct.quantity !== toProduct.quantity) {
          rowClass = 'changed';
          const quantityDiff = toProduct.quantity - fromProduct.quantity;
          
          const changeClass = quantityDiff > 0 ? 'price-increase' : 'price-decrease';
          const signChar = quantityDiff > 0 ? '+' : '';
          
          quantityDiffHTML = `
            <span class="quantity-change-indicator ${changeClass}">
              ${signChar}${quantityDiff}
            </span>
          `;
        }
      }
      
      // Format from product info
      let fromProductInfo = 'Not in this version';
      if (fromProduct) {
        const formattedPrice = formatPrice(fromProduct.price, fromProduct.currency);
        fromProductInfo = `
          <div>${fromProduct.name}</div>
          <div>Price: ${formattedPrice}</div>
          <div>Quantity: ${fromProduct.quantity}</div>
        `;
      }
      
      // Format to product info
      let toProductInfo = 'Not in this version';
      if (toProduct) {
        const formattedPrice = formatPrice(toProduct.price, toProduct.currency);
        toProductInfo = `
          <div>${toProduct.name}</div>
          <div>Price: ${formattedPrice}</div>
          <div>Quantity: ${toProduct.quantity}</div>
        `;
      }
      
      // Format difference column
      let differenceInfo = '';
      if (fromProduct && !toProduct) {
        differenceInfo = '<span class="highlight-removed">Removed</span>';
      } else if (!fromProduct && toProduct) {
        differenceInfo = '<span class="highlight-added">Added</span>';
      } else if (fromProduct && toProduct) {
        const differences = [];
        
        if (fromProduct.price !== toProduct.price) {
          const priceDiff = toProduct.price - fromProduct.price;
          const formattedDiff = formatPrice(Math.abs(priceDiff), toProduct.currency);
          differences.push(`Price ${priceDiff > 0 ? 'increased' : 'decreased'} by ${formattedDiff} ${priceDiffHTML}`);
        }
        
        if (fromProduct.quantity !== toProduct.quantity) {
          const quantityDiff = toProduct.quantity - fromProduct.quantity;
          differences.push(`Quantity ${quantityDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(quantityDiff)} ${quantityDiffHTML}`);
        }
        
        if (differences.length === 0) {
          differenceInfo = 'No changes';
        } else {
          differenceInfo = differences.join('<br>');
        }
      }
      
      // Add the row
      comparisonHTML += `
        <tr class="${rowClass}">
          <td>${productId}</td>
          <td>${fromProductInfo}</td>
          <td>${toProductInfo}</td>
          <td>${differenceInfo}</td>
        </tr>
      `;
    });
    
    comparisonHTML += `
        </tbody>
      </table>
    `;
  }
  
  // Set the content and display the results
  comparisonContent.innerHTML = comparisonHTML;
  resultsContainer.style.display = 'block';
}

// Save project to database
async function saveProjectToDatabase(project) {
  // Find project index
  const projectIndex = projects.findIndex(p => p.id === project.id);
  if (projectIndex === -1) return;
  
  // Update project in array
  projects[projectIndex] = project;
  
  // Save to localStorage
  saveProjectsToStorage();
  
  // Save to database
  return saveProjectsToDatabase();
}

// Format money value
function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Open project edit modal
function openEditProjectModal(project) {
  const projectModal = document.getElementById('project-modal');
  if (!projectModal) return;
  
  // Set form with project data
  const projectForm = document.getElementById('project-form');
  if (projectForm) {
    // Set basic fields
    document.getElementById('project-name').value = project.title || '';
    document.getElementById('project-client').value = project.client || '';
    document.getElementById('project-priority').value = project.priority || 'medium';
    document.getElementById('project-status').value = project.status || 'Active';
    document.getElementById('project-deadline').value = project.deadline || '';
    document.getElementById('project-description').value = project.description || '';
    
    // Set completion percentage
    const completionSlider = document.getElementById('project-completion');
    const completionValue = document.querySelector('.completion-value');
    if (completionSlider && completionValue) {
      const completion = project.completion || 0;
      completionSlider.value = completion;
      completionValue.textContent = `${completion}%`;
    }
    
    // Set currency if available, or default to USD
    const currencySelect = document.getElementById('project-currency');
    if (currencySelect) {
      currencySelect.value = project.currency || 'USD';
    }
    
    // Clear and populate tasks
    const tasksContainer = document.getElementById('tasks-container');
    if (tasksContainer) {
      tasksContainer.innerHTML = '';
      if (project.tasks && project.tasks.length > 0) {
        project.tasks.forEach(task => {
          addTaskInput(task.text);
        });
      }
    }
    
    // Products are now managed separately
    // So we don't need to populate product inputs in the main project form
  }
  
  // Set form title
  const modalTitle = document.getElementById('project-modal-title');
  if (modalTitle) {
    modalTitle.textContent = `Edit Project: ${project.title}`;
  }
  
  // Update submit button
  const saveButton = document.getElementById('save-project');
  if (saveButton) {
    saveButton.textContent = 'Save Changes';
    
    // Store the project ID for later use
    saveButton.dataset.projectId = project.id;
  }
  
  // Show the modal
  projectModal.classList.add('active');
}

// Initialize project form event listeners
function initializeProjectForm() {
  const projectForm = document.getElementById('project-form');
  const cancelProjectBtn = document.getElementById('cancel-project');
  const addTaskBtn = document.getElementById('add-task');
  const projectModalCloseBtn = document.querySelector('#project-modal .modal-close');
  const completionSlider = document.getElementById('project-completion');
  const completionValue = document.querySelector('.completion-value');
  
  // Initialize completion slider behavior
  if (completionSlider && completionValue) {
    // Update completion value display when slider changes
    completionSlider.addEventListener('input', () => {
      completionValue.textContent = `${completionSlider.value}%`;
    });
  }
  
  // Form submission
  if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form data
      const name = document.getElementById('project-name').value;
      const client = document.getElementById('project-client').value;
      const priority = document.getElementById('project-priority').value;
      const status = document.getElementById('project-status').value;
      const deadline = document.getElementById('project-deadline').value;
      const description = document.getElementById('project-description').value;
      const currency = document.getElementById('project-currency').value || 'USD';
      const completion = parseInt(document.getElementById('project-completion').value, 10) || 0;
      
      // Get tasks
      const taskInputs = document.querySelectorAll('#tasks-container .task-input');
      const tasks = Array.from(taskInputs).map(input => ({
        text: input.value.trim(),
        completed: false
      })).filter(task => task.text !== '');
      
      // Get existing products if we're editing an existing project
      let products = [];
      
      // Check if we're editing an existing project or creating a new one
      const saveButton = document.getElementById('save-project');
      const existingProjectId = saveButton ? saveButton.dataset.projectId : null;
      
      if (existingProjectId) {
        const existingProject = projects.find(p => p.id === existingProjectId);
        if (existingProject && existingProject.products) {
          // Keep the existing products when editing
          products = existingProject.products;
        }
      }
      let projectData;
      
      if (existingProjectId) {
        // Find existing project
        const existingProject = projects.find(p => p.id === existingProjectId);
        if (existingProject) {
          // Update existing project
          projectData = {
            ...existingProject,
            title: name,
            client,
            priority,
            status,
            deadline,
            description,
            currency,
            tasks,
            products,
            completion: completion,
            updatedAt: new Date().toISOString(),
            updatedBy: getCurrentUserName()
          };
        } else {
          // Project not found, create new
          projectData = createNewProject();
        }
      } else {
        // Create new project
        projectData = createNewProject();
      }
      
      // Function to create new project data
      function createNewProject() {
        return {
          id: generateProjectId(),
          title: name,
          client,
          priority,
          status,
          deadline,
          description,
          currency,
          tasks,
          products,
          completion: completion,
          createdAt: new Date().toISOString(),
          createdBy: getCurrentUserName()
        };
      }
      
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
  
  // "Add product to project" button removed from UI
  // const addProjectProductBtn = document.getElementById('add-project-product');
  // if (addProjectProductBtn) {
  //   addProjectProductBtn.addEventListener('click', () => {
  //     addProjectProductInput();
  //   });
  // }
  
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
// This file contains the code that runs in the renderer process

document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
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
  
  // Animation for project cards
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
  
  // Simulate project data from the backend
  // In a real app, this would come from your Electron main process via IPC
  const projectData = {
    activeProjects: 12,
    upcomingProjects: 5,
    completedProjects: 24,
    overdueProjects: 3,
    
    // Project task data could be used for more detailed visualizations
    projectTasks: {
      'Website Redesign': { completed: 18, total: 24 },
      'Mobile App Development': { completed: 24, total: 53 },
      'CRM Integration': { completed: 12, total: 40 },
      'Content Strategy': { completed: 17, total: 20 }
    }
  };
  
  // Button interactions for table action buttons
  const actionButtons = document.querySelectorAll('.actions .btn-icon');
  actionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const action = button.querySelector('i').className;
      
      if (action.includes('eye')) {
        console.log('View project details');
      } else if (action.includes('edit')) {
        console.log('Edit project');
      } else if (action.includes('share')) {
        console.log('Share project');
      }
    });
  });
  
  // In a real app, you might initialize charts for project progress visualization
  console.log('Project data ready:', projectData);
  
  // Example of communicating with the main process (for real data)
  if (window.electron) {
    window.electron.sendToMain('getData', { type: 'projects' });
    
    window.electron.receiveFromMain('dataResult', (data) => {
      console.log('Received data from main process:', data);
      // Update UI with the data
    });
  }
});
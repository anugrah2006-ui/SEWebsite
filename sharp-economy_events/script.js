function filterEvents(type) {
  const events = document.querySelectorAll('.event-card');
  const buttons = document.querySelectorAll('.filter-btn');

  // Update active button state
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(type === 'all' ? 'all' : type)) {
      btn.classList.add('active');
    }
  });

  // Filter events
  events.forEach(event => {
    if (type === 'all' || event.classList.contains(type)) {
      event.style.display = 'flex';
      // Add a small animation effect
      event.style.animation = 'fadeIn 0.5s ease forwards';
    } else {
      event.style.display = 'none';
    }
  });
}

// Add simple fade in animation keyframes dynamically if not present
if (!document.getElementById('dynamic-styles')) {
  const style = document.createElement('style');
  style.id = 'dynamic-styles';
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}
// admin.js

let portfolioData = null;
let currentToken = localStorage.getItem('chef_john_admin_token') || '';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const msgCountBadge = document.getElementById('msg-count-badge');
const toastEl = document.getElementById('toast');

// Mobile Sidebar Navigation elements
const sidebar = document.getElementById('sidebar');
const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

// Modal Elements
const editorModal = document.getElementById('editor-modal');
const modalTitle = document.getElementById('modal-title');
const modalForm = document.getElementById('modalForm');
const modalFieldsContainer = document.getElementById('modal-fields-container');
const editIdInput = document.getElementById('edit-id');
const editTypeInput = document.getElementById('edit-type');
const closeModalBtn = document.querySelector('.close-modal');
const cancelModalBtn = document.querySelector('.cancel-modal-btn');

// Start up checking
document.addEventListener('DOMContentLoaded', () => {
    if (currentToken) {
        showDashboard();
    } else {
        showLogin();
    }
});

// Password visibility toggle
const togglePassword = document.getElementById('togglePassword');
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            togglePassword.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
}

// Show Login
function showLogin() {
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
}

// Show Dashboard
function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'grid';
    loadDashboardData();
}

// Toast Messages helper
function showToast(message, isError = false) {
    toastEl.textContent = message;
    toastEl.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => {
        toastEl.classList.remove('show');
    }, 4000);
}

// API helper fetch wrapper with Auth header
async function apiRequest(url, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${currentToken}`
    };
    
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        method,
        headers
    };

    if (body) {
        config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    try {
        const res = await fetch(url, config);
        
        if (res.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('chef_john_admin_token');
            currentToken = '';
            showLogin();
            throw new Error('Session expired. Please log in again.');
        }

        const storageHeader = res.headers.get('X-Storage-Mode');
        if (storageHeader) {
            updateStorageBadge(storageHeader);
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error(`API Request failed on ${url}:`, err);
        throw err;
    }
}

function updateStorageBadge(mode) {
    const badges = document.querySelectorAll('.storage-badge-el');
    badges.forEach(badge => {
        badge.textContent = mode === 'PostgreSQL' ? 'PostgreSQL DB' : 'JSON File';
        badge.className = 'badge storage-badge-el ' + (mode === 'PostgreSQL' ? 'postgres-mode' : 'json-mode');
    });
}

// Load Portfolio Data
async function loadDashboardData() {
    try {
        portfolioData = await apiRequest('/api/portfolio-data');
        
        // Detect storage type dynamically (fallback check based on response headers or local data)
        // Since we didn't update server.js to send header yet, let's look for clues
        // Or we can just guess. The server.js will handle the backend storage.
        if (portfolioData) {
            populateGeneralTab(portfolioData);
            populateSectionsTab(portfolioData);
            renderDishes(portfolioData.dishes || []);
            renderExperience(portfolioData.experience || []);
            renderGallery(portfolioData.gallery || []);
            renderTestimonials(portfolioData.testimonials || []);
            populateContactTab(portfolioData);
            loadMessages();
        }
    } catch (err) {
        showToast(err.message, true);
    }
}

// Load messages log
async function loadMessages() {
    try {
        const messages = await apiRequest('/api/admin/messages');
        renderMessages(messages || []);
    } catch (err) {
        console.error("Failed to load messages logs:", err);
    }
}

// Submit Login Form
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (!res.ok) {
            throw new Error('Invalid security password');
        }

        const data = await res.json();
        currentToken = data.token;
        localStorage.setItem('chef_john_admin_token', currentToken);
        document.getElementById('password').value = '';
        showToast('Access Granted. Welcome!');
        showDashboard();
    } catch (err) {
        showToast(err.message, true);
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('chef_john_admin_token');
    currentToken = '';
    showToast('Logged out successfully.');
    showLogin();
});

// Tab Switching Navigation
const menuItems = document.querySelectorAll('.menu-item');
const tabPanels = document.querySelectorAll('.tab-panel');

menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = item.getAttribute('data-tab');

        menuItems.forEach(mi => mi.classList.remove('active'));
        tabPanels.forEach(tp => tp.classList.remove('active'));

        item.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Close sidebar on mobile after clicking item
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            sidebarBackdrop.classList.remove('active');
        }
    });
});

// Mobile Hamburger & Backdrop Navigation Toggle
if (sidebarToggleBtn && sidebar && sidebarBackdrop) {
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        sidebarBackdrop.classList.toggle('active');
    });

    sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
    });
}

// 1. General & About Section populator
function populateGeneralTab(data) {
    if (data.hero) {
        document.getElementById('hero-subtitle').value = data.hero.subtitle || '';
        document.getElementById('hero-title').value = data.hero.title || '';
        document.getElementById('hero-tagline').value = data.hero.tagline || '';
        document.getElementById('hero-bg-url').value = data.hero.bg_image || '';
    }
    if (data.about) {
        document.getElementById('about-name').value = data.about.name || '';
        document.getElementById('about-bio').value = data.about.bio || '';
        document.getElementById('about-philosophy').value = data.about.philosophy || '';
        document.getElementById('about-img-url').value = data.about.image_url || '';
    }
    if (data.counters && data.counters.length >= 3) {
        document.getElementById('counter-0-count').value = data.counters[0].count || 0;
        document.getElementById('counter-0-label').value = data.counters[0].label || '';
        document.getElementById('counter-1-count').value = data.counters[1].count || 0;
        document.getElementById('counter-1-label').value = data.counters[1].label || '';
        document.getElementById('counter-2-count').value = data.counters[2].count || 0;
        document.getElementById('counter-2-label').value = data.counters[2].label || '';
    }
}

// Save General & About settings
document.querySelector('.save-general-btn').addEventListener('click', async () => {
    const payload = {
        hero: {
            subtitle: document.getElementById('hero-subtitle').value.trim(),
            title: document.getElementById('hero-title').value.trim(),
            tagline: document.getElementById('hero-tagline').value.trim(),
            bg_image: document.getElementById('hero-bg-url').value.trim()
        },
        about: {
            name: document.getElementById('about-name').value.trim(),
            bio: document.getElementById('about-bio').value.trim(),
            philosophy: document.getElementById('about-philosophy').value.trim(),
            image_url: document.getElementById('about-img-url').value.trim()
        },
        counters: [
            {
                count: parseInt(document.getElementById('counter-0-count').value) || 0,
                label: document.getElementById('counter-0-label').value.trim()
            },
            {
                count: parseInt(document.getElementById('counter-1-count').value) || 0,
                label: document.getElementById('counter-1-label').value.trim()
            },
            {
                count: parseInt(document.getElementById('counter-2-count').value) || 0,
                label: document.getElementById('counter-2-label').value.trim()
            }
        ]
    };

    try {
        await apiRequest('/api/admin/save-general', 'PUT', payload);
        showToast('General and About settings updated successfully!');
    } catch (err) {
        showToast(err.message, true);
    }
});

// 2. Sections Visibility Tab populator
function populateSectionsTab(data) {
    const container = document.getElementById('visibility-toggles-container');
    if (!container || !data.sections) return;

    container.innerHTML = '';
    data.sections.forEach(sec => {
        const item = document.createElement('div');
        item.className = 'visibility-item';
        item.innerHTML = `
            <div class="visibility-info">
                <h4>${sec.title}</h4>
                <p>Section ID: #${sec.id}</p>
            </div>
            <label class="switch">
                <input type="checkbox" class="section-visibility-toggle" data-section-id="${sec.id}" ${sec.is_visible ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        `;
        container.appendChild(item);
    });
}

// Save Sections Visibility settings
document.querySelector('.save-sections-btn').addEventListener('click', async () => {
    const toggles = document.querySelectorAll('.section-visibility-toggle');
    const sections = Array.from(toggles).map(toggle => ({
        id: toggle.getAttribute('data-section-id'),
        title: toggle.closest('.visibility-item').querySelector('.visibility-info h4').textContent,
        is_visible: toggle.checked
    }));

    try {
        await apiRequest('/api/admin/save-sections', 'PUT', { sections });
        showToast('Sections visibility settings saved successfully!');
    } catch (err) {
        showToast(err.message, true);
    }
});

// 3. Contact & Socials populator
function populateContactTab(data) {
    if (data.contact) {
        document.getElementById('contact-email').value = data.contact.email || '';
        document.getElementById('contact-phone').value = data.contact.phone || '';
        document.getElementById('contact-location').value = data.contact.location || '';
    }
    if (data.socials) {
        document.getElementById('social-instagram').value = data.socials.instagram || '';
        document.getElementById('social-twitter').value = data.socials.twitter || '';
        document.getElementById('social-linkedin').value = data.socials.linkedin || '';
        document.getElementById('social-youtube').value = data.socials.youtube || '';
    }
    if (data.footer) {
        document.getElementById('footer-logo').value = data.footer.logo || '';
        document.getElementById('footer-tagline').value = data.footer.tagline || '';
        document.getElementById('footer-copyright').value = data.footer.copyright || '';
    }
}

// Save Contact Tab
document.querySelector('.save-contact-btn').addEventListener('click', async () => {
    const payload = {
        contact: {
            email: document.getElementById('contact-email').value.trim(),
            phone: document.getElementById('contact-phone').value.trim(),
            location: document.getElementById('contact-location').value.trim()
        },
        socials: {
            instagram: document.getElementById('social-instagram').value.trim() || '#',
            twitter: document.getElementById('social-twitter').value.trim() || '#',
            linkedin: document.getElementById('social-linkedin').value.trim() || '#',
            youtube: document.getElementById('social-youtube').value.trim() || '#'
        },
        footer: {
            logo: document.getElementById('footer-logo').value.trim(),
            tagline: document.getElementById('footer-tagline').value.trim(),
            copyright: document.getElementById('footer-copyright').value.trim()
        }
    };

    try {
        await apiRequest('/api/admin/save-general', 'PUT', payload);
        showToast('Contact, Socials, and Footer details saved!');
    } catch (err) {
        showToast(err.message, true);
    }
});

// 4. Render Dishes Manager
function renderDishes(dishes) {
    const container = document.getElementById('dishes-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (dishes.length === 0) {
        container.innerHTML = '<p class="no-messages col-span-2">No signature dishes found. Add some above!</p>';
        return;
    }

    dishes.forEach(dish => {
        const card = document.createElement('div');
        card.className = 'dish-admin-card';
        card.innerHTML = `
            <img src="${dish.image_url}" class="dish-admin-img" alt="${dish.title}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
            <div class="dish-admin-body">
                <h4 class="dish-admin-title">${dish.title}</h4>
                <p class="dish-admin-desc">${dish.description}</p>
                <div class="dish-admin-actions">
                    <button class="btn btn-secondary btn-sm edit-dish-btn" data-id="${dish.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-danger btn-sm delete-dish-btn" data-id="${dish.id}"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.edit-dish-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const dish = dishes.find(d => d.id === id);
            openEditModal('dish', dish);
        });
    });

    document.querySelectorAll('.delete-dish-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this signature dish?')) {
                const id = btn.getAttribute('data-id');
                try {
                    await apiRequest(`/api/admin/dishes/${id}`, 'DELETE');
                    showToast('Dish deleted successfully.');
                    loadDashboardData();
                } catch (err) {
                    showToast(err.message, true);
                }
            }
        });
    });
}

// 5. Render Experience Manager
function renderExperience(expItems) {
    const container = document.getElementById('experience-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (expItems.length === 0) {
        container.innerHTML = '<p class="no-messages">No experience items found. Add some above!</p>';
        return;
    }

    expItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'timeline-admin-item';
        card.innerHTML = `
            <div class="timeline-admin-content">
                <span class="timeline-admin-date">${item.date}</span>
                <h3>${item.title}</h3>
                <h4>${item.subtitle}</h4>
                <p class="timeline-admin-desc">${item.description}</p>
            </div>
            <div class="timeline-admin-actions">
                <button class="btn btn-secondary btn-sm edit-exp-btn" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-danger btn-sm delete-exp-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
        `;
        container.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.edit-exp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const item = expItems.find(e => e.id === id);
            openEditModal('experience', item);
        });
    });

    document.querySelectorAll('.delete-exp-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this experience timeline item?')) {
                const id = btn.getAttribute('data-id');
                try {
                    await apiRequest(`/api/admin/experience/${id}`, 'DELETE');
                    showToast('Timeline item deleted.');
                    loadDashboardData();
                } catch (err) {
                    showToast(err.message, true);
                }
            }
        });
    });
}

// 6. Render Culinary Gallery Manager
function renderGallery(gallery) {
    const container = document.getElementById('gallery-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (gallery.length === 0) {
        container.innerHTML = '<p class="no-messages col-span-3">No gallery images found. Add some above!</p>';
        return;
    }

    gallery.forEach(img => {
        const card = document.createElement('div');
        card.className = 'gallery-admin-card';
        card.innerHTML = `
            <img src="${img.image_url}" alt="${img.alt}" onerror="this.src='https://placehold.co/300x200?text=No+Image'">
            <div class="gallery-admin-overlay">
                <p class="gallery-admin-caption">${img.alt}</p>
                <button class="btn btn-danger btn-sm delete-gallery-btn" data-id="${img.id}"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
        `;
        container.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.delete-gallery-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Delete this image from the gallery?')) {
                const id = btn.getAttribute('data-id');
                try {
                    await apiRequest(`/api/admin/gallery/${id}`, 'DELETE');
                    showToast('Gallery image deleted.');
                    loadDashboardData();
                } catch (err) {
                    showToast(err.message, true);
                }
            }
        });
    });
}

// 7. Render Testimonials Manager
function renderTestimonials(testimonials) {
    const container = document.getElementById('testimonials-list-container');
    if (!container) return;
    container.innerHTML = '';

    if (testimonials.length === 0) {
        container.innerHTML = '<p class="no-messages col-span-2">No testimonials found. Add some above!</p>';
        return;
    }

    testimonials.forEach(item => {
        const card = document.createElement('div');
        card.className = 'testimonial-admin-card';
        card.innerHTML = `
            <p class="testimonial-admin-text">"${item.text}"</p>
            <div class="testimonial-admin-author">
                <h4>${item.author}</h4>
                <p>${item.role}</p>
            </div>
            <div class="testimonial-admin-actions">
                <button class="btn btn-secondary btn-sm edit-testimonial-btn" data-id="${item.id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-danger btn-sm delete-testimonial-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Delete</button>
            </div>
        `;
        container.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.edit-testimonial-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const item = testimonials.find(t => t.id === id);
            openEditModal('testimonial', item);
        });
    });

    document.querySelectorAll('.delete-testimonial-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this testimonial?')) {
                const id = btn.getAttribute('data-id');
                try {
                    await apiRequest(`/api/admin/testimonials/${id}`, 'DELETE');
                    showToast('Testimonial deleted.');
                    loadDashboardData();
                } catch (err) {
                    showToast(err.message, true);
                }
            }
        });
    });
}

// 8. Render Message Inquiries
function renderMessages(messages) {
    const container = document.getElementById('messages-list-container');
    const clearAllBtn = document.getElementById('clearAllMessagesBtn');
    if (!container) return;
    container.innerHTML = '';

    if (msgCountBadge) {
        msgCountBadge.textContent = messages.length;
        msgCountBadge.style.display = messages.length > 0 ? 'inline-block' : 'none';
    }

    if (messages.length === 0) {
        container.innerHTML = '<p class="no-messages">No customer messages found. Keep up the good work!</p>';
        if (clearAllBtn) clearAllBtn.style.display = 'none';
        return;
    }

    if (clearAllBtn) clearAllBtn.style.display = 'none'; // We don't have a direct clear-all endpoint, so we can delete one by one.

    messages.forEach(msg => {
        const dateStr = new Date(msg.created_at).toLocaleString();
        const card = document.createElement('div');
        card.className = 'message-card';
        card.innerHTML = `
            <div class="message-card-header">
                <div class="message-sender">
                    <h4>${msg.name}</h4>
                    <p>Email: <span>${msg.email}</span></p>
                </div>
                <div class="message-meta">
                    <span class="message-date">${dateStr}</span>
                    <button class="btn btn-danger btn-sm delete-message-btn" data-id="${msg.id}"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            </div>
            <div class="message-subject">Subject: ${msg.subject}</div>
            <p class="message-text">${msg.message}</p>
        `;
        container.appendChild(card);
    });

    // Wire up events
    document.querySelectorAll('.delete-message-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Delete this message inquire?')) {
                const id = btn.getAttribute('data-id');
                try {
                    await apiRequest(`/api/admin/messages/${id}`, 'DELETE');
                    showToast('Message deleted.');
                    loadMessages();
                } catch (err) {
                    showToast(err.message, true);
                }
            }
        });
    });
}

// 9. Dynamic Reusable Modal Editor Setup
function openEditModal(type, data = null) {
    editTypeInput.value = type;
    editIdInput.value = data ? data.id : '';
    
    // Reset fields container
    modalFieldsContainer.innerHTML = '';
    
    if (type === 'dish') {
        modalTitle.textContent = data ? 'Edit Signature Dish' : 'Add Signature Dish';
        modalFieldsContainer.innerHTML = `
            <div class="form-group">
                <label>Dish Title</label>
                <input type="text" id="modal-dish-title" value="${data ? data.title : ''}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="modal-dish-desc" rows="3" required>${data ? data.description : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Dish Image</label>
                <div class="image-upload-wrapper">
                    <input type="text" id="modal-dish-img-url" value="${data ? data.image_url : ''}" placeholder="Image URL or upload below..." required>
                    <div class="upload-btn-row">
                        <input type="file" id="modal-dish-img-file" accept="image/*" class="file-input">
                        <button type="button" class="btn btn-secondary upload-trigger" data-target="modal-dish-img"><i class="fas fa-upload"></i> Upload Image</button>
                    </div>
                </div>
            </div>
        `;
    } 
    else if (type === 'experience') {
        modalTitle.textContent = data ? 'Edit Experience Item' : 'Add Experience Item';
        modalFieldsContainer.innerHTML = `
            <div class="form-group">
                <label>Date Period</label>
                <input type="text" id="modal-exp-date" value="${data ? data.date : ''}" placeholder="e.g. 2021 - Present" required>
            </div>
            <div class="form-group">
                <label>Role Title</label>
                <input type="text" id="modal-exp-title" value="${data ? data.title : ''}" placeholder="e.g. Executive Chef" required>
            </div>
            <div class="form-group">
                <label>Subtitle / Company</label>
                <input type="text" id="modal-exp-subtitle" value="${data ? data.subtitle : ''}" placeholder="e.g. La Belle Époque • Paris" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="modal-exp-desc" rows="4" required>${data ? data.description : ''}</textarea>
            </div>
        `;
    } 
    else if (type === 'gallery') {
        modalTitle.textContent = 'Add Gallery Image';
        modalFieldsContainer.innerHTML = `
            <div class="form-group">
                <label>Gallery Image</label>
                <div class="image-upload-wrapper">
                    <input type="text" id="modal-gallery-url" placeholder="Image URL or upload below..." required>
                    <div class="upload-btn-row">
                        <input type="file" id="modal-gallery-file" accept="image/*" class="file-input">
                        <button type="button" class="btn btn-secondary upload-trigger" data-target="modal-gallery-img"><i class="fas fa-upload"></i> Upload Image</button>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Image Caption / Alt Text</label>
                <input type="text" id="modal-gallery-alt" placeholder="e.g. Preparing Truffle Sauce" required>
            </div>
        `;
    } 
    else if (type === 'testimonial') {
        modalTitle.textContent = data ? 'Edit Testimonial' : 'Add Testimonial';
        modalFieldsContainer.innerHTML = `
            <div class="form-group">
                <label>Review / Testimonial Text</label>
                <textarea id="modal-test-text" rows="4" required>${data ? data.text : ''}</textarea>
            </div>
            <div class="form-group">
                <label>Reviewer Name</label>
                <input type="text" id="modal-test-author" value="${data ? data.author : ''}" required>
            </div>
            <div class="form-group">
                <label>Reviewer Role / Title</label>
                <input type="text" id="modal-test-role" value="${data ? data.role : ''}" placeholder="e.g. Event Client" required>
            </div>
        `;
    }

    // Bind dynamic upload handlers for the modal fields
    bindUploadHandlers();

    // Show modal
    editorModal.classList.add('active');
}

// Close Modal
function closeModal() {
    editorModal.classList.remove('active');
    modalForm.reset();
}

closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
editorModal.addEventListener('click', (e) => {
    if (e.target === editorModal) closeModal();
});

// Modal Form Submission
modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = editTypeInput.value;
    const id = editIdInput.value;
    
    let url = '';
    let method = 'POST';
    let payload = {};

    if (type === 'dish') {
        url = id ? `/api/admin/dishes/${id}` : '/api/admin/dishes';
        method = id ? 'PUT' : 'POST';
        payload = {
            title: document.getElementById('modal-dish-title').value.trim(),
            description: document.getElementById('modal-dish-desc').value.trim(),
            image_url: document.getElementById('modal-dish-img-url').value.trim()
        };
    } 
    else if (type === 'experience') {
        url = id ? `/api/admin/experience/${id}` : '/api/admin/experience';
        method = id ? 'PUT' : 'POST';
        payload = {
            date: document.getElementById('modal-exp-date').value.trim(),
            title: document.getElementById('modal-exp-title').value.trim(),
            subtitle: document.getElementById('modal-exp-subtitle').value.trim(),
            description: document.getElementById('modal-exp-desc').value.trim()
        };
    } 
    else if (type === 'gallery') {
        url = '/api/admin/gallery';
        method = 'POST';
        payload = {
            image_url: document.getElementById('modal-gallery-url').value.trim(),
            alt: document.getElementById('modal-gallery-alt').value.trim()
        };
    } 
    else if (type === 'testimonial') {
        url = id ? `/api/admin/testimonials/${id}` : '/api/admin/testimonials';
        method = id ? 'PUT' : 'POST';
        payload = {
            text: document.getElementById('modal-test-text').value.trim(),
            author: document.getElementById('modal-test-author').value.trim(),
            role: document.getElementById('modal-test-role').value.trim()
        };
    }

    try {
        await apiRequest(url, method, payload);
        showToast('Changes saved successfully!');
        closeModal();
        loadDashboardData();
    } catch (err) {
        showToast(err.message, true);
    }
});

// Setup triggers to click corresponding Add buttons
document.getElementById('addDishBtn').addEventListener('click', () => openEditModal('dish'));
document.getElementById('addExpBtn').addEventListener('click', () => openEditModal('experience'));
document.getElementById('addGalleryBtn').addEventListener('click', () => openEditModal('gallery'));
document.getElementById('addTestimonialBtn').addEventListener('click', () => openEditModal('testimonial'));

// 10. Image Uploading API Integrations
function bindUploadHandlers() {
    // We bind trigger clicks for both the static page and dynamic modals
    const triggers = document.querySelectorAll('.upload-trigger');
    triggers.forEach(trigger => {
        // Remove existing listener to prevent double clicks if re-running
        const newTrigger = trigger.cloneNode(true);
        trigger.parentNode.replaceChild(newTrigger, trigger);
        
        newTrigger.addEventListener('click', () => {
            const wrapper = newTrigger.closest('.image-upload-wrapper');
            const fileInput = wrapper.querySelector('.file-input');
            fileInput.click();
        });
    });

    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('change', async () => {
            if (newInput.files.length === 0) return;
            
            const file = newInput.files[0];
            const formData = new FormData();
            formData.append('image', file);
            
            const wrapper = newInput.closest('.image-upload-wrapper');
            const urlInput = wrapper.querySelector('input[type="text"]');
            const button = wrapper.querySelector('.upload-trigger');
            
            const originalHTML = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            
            try {
                const res = await apiRequest('/api/admin/upload', 'POST', formData);
                urlInput.value = res.url;
                showToast('Image uploaded successfully!');
            } catch (err) {
                showToast('Upload failed: ' + err.message, true);
            } finally {
                button.disabled = false;
                button.innerHTML = originalHTML;
                newInput.value = ''; // Reset file input
            }
        });
    });
}

// Initial bind for the static page inputs (Hero background, Chef profile image)
bindUploadHandlers();

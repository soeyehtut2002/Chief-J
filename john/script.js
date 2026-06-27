// script.js

let currentSlide = 0;
let activeDishIndex = 0;

// Fetch and Render Dynamic Content
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/portfolio-data')
        .then(res => {
            if (!res.ok) throw new Error('Failed to fetch portfolio data');
            return res.json();
        })
        .then(data => {
            renderPortfolio(data);
            initializeInteractions();
        })
        .catch(err => {
            console.error('Error loading portfolio data:', err);
            // Fallback: Just run interactions on the static fallback HTML
            initializeInteractions();
        });
});

function renderPortfolio(data) {
    if (!data) return;

    // 1. Navbar & Footer Logo/Text
    if (data.footer && data.footer.logo) {
        const logoWords = data.footer.logo.split(' ');
        let logoHTML = data.footer.logo;
        if (logoWords.length > 1) {
            const last = logoWords.pop();
            logoHTML = logoWords.join(' ') + ` <span>${last}</span>`;
        } else {
            logoHTML = `<span>${data.footer.logo}</span>`;
        }
        
        const navbarLogo = document.querySelector('.navbar .logo');
        if (navbarLogo) navbarLogo.innerHTML = logoHTML;
        
        const footerLogo = document.querySelector('.footer-logo');
        if (footerLogo) footerLogo.innerHTML = logoHTML;
    }

    // 2. Hero Section
    if (data.hero) {
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) heroSubtitle.textContent = data.hero.subtitle;

        if (data.hero.title) {
            const titleWords = data.hero.title.split(' ');
            let titleHTML = data.hero.title;
            if (titleWords.length > 1) {
                const last = titleWords.pop();
                titleHTML = titleWords.join(' ') + ` <span>${last}</span>`;
            }
            const heroTitle = document.querySelector('.hero-title');
            if (heroTitle) heroTitle.innerHTML = titleHTML;
        }

        const heroTagline = document.querySelector('.hero-tagline');
        if (heroTagline) heroTagline.textContent = data.hero.tagline;

        if (data.hero.bg_image) {
            const heroSection = document.querySelector('.hero');
            if (heroSection) {
                heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('${data.hero.bg_image}')`;
            }
        }
    }

    // 3. About Section
    if (data.about) {
        const aboutName = document.querySelector('.about-name');
        if (aboutName) aboutName.textContent = data.about.name;

        const aboutBio = document.querySelector('.about-bio');
        if (aboutBio) aboutBio.textContent = data.about.bio;

        const aboutPhilosophy = document.querySelector('.about-philosophy');
        if (aboutPhilosophy) aboutPhilosophy.textContent = data.about.philosophy;

        if (data.about.image_url) {
            const aboutImg = document.querySelector('.about-image img');
            if (aboutImg) aboutImg.setAttribute('src', data.about.image_url);
        }
    }

    // 4. Counters
    if (data.counters && data.counters.length >= 3) {
        const counterElements = document.querySelectorAll('.counter');
        data.counters.forEach((counter, idx) => {
            if (counterElements[idx]) {
                const numEl = counterElements[idx].querySelector('.counter-number');
                const labelEl = counterElements[idx].querySelector('.counter-label');
                if (numEl) {
                    numEl.setAttribute('data-count', counter.count);
                    numEl.textContent = '0';
                }
                if (labelEl) {
                    labelEl.textContent = counter.label;
                }
            }
        });
    }

    // 5. Signature Dishes (Specialties)
    if (data.dishes) {
        const dishesSlider = document.getElementById('dishesSlider');
        const dotsContainer = document.getElementById('dishesSliderDots');
        if (dishesSlider) {
            dishesSlider.innerHTML = '';
            if (dotsContainer) dotsContainer.innerHTML = '';
            
            data.dishes.forEach((dish, idx) => {
                const slide = document.createElement('div');
                slide.className = 'dish-slide';
                slide.innerHTML = `
                    <div class="dish-image">
                        <img src="${dish.image_url}" alt="${dish.title}" />
                        <div class="dish-overlay">
                            <h3 class="dish-name">${dish.title}</h3>
                            <p class="dish-desc">${dish.description}</p>
                        </div>
                    </div>
                `;
                dishesSlider.appendChild(slide);
                
                if (dotsContainer) {
                    const dot = document.createElement('span');
                    dot.className = `dot ${idx === 0 ? 'active' : ''}`;
                    dot.addEventListener('click', () => {
                        activeDishIndex = idx;
                        updateDishesSlider();
                    });
                    dotsContainer.appendChild(dot);
                }
            });
            
            updateDishesSlider();
        }
    }

    // 6. Experience Timeline
    if (data.experience) {
        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.innerHTML = '';
            data.experience.forEach((item, index) => {
                const isLeft = index % 2 === 0;
                const itemEl = document.createElement('div');
                itemEl.className = `timeline-item ${isLeft ? 'animate-on-scroll-left' : 'animate-on-scroll-right'}`;
                itemEl.innerHTML = `
                    <div class="timeline-date">${item.date}</div>
                    <div class="timeline-content">
                        <h3 class="timeline-title">${item.title}</h3>
                        <h4 class="timeline-subtitle">${item.subtitle}</h4>
                        <p class="timeline-desc">${item.description}</p>
                    </div>
                `;
                timeline.appendChild(itemEl);
            });
        }
    }

    // 7. Gallery Section
    if (data.gallery) {
        const galleryGrid = document.querySelector('.gallery-grid');
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
            data.gallery.forEach(img => {
                const item = document.createElement('div');
                item.className = 'gallery-item animate-on-scroll';
                item.innerHTML = `
                    <img src="${img.image_url}" alt="${img.alt}" />
                    <div class="gallery-overlay">
                        <i class="fas fa-search-plus"></i>
                    </div>
                `;
                galleryGrid.appendChild(item);
            });
        }
    }

    // 8. Testimonials (Reviews)
    if (data.testimonials) {
        const sliderContainer = document.querySelector('.slider-container');
        const sliderDots = document.querySelector('.slider-dots');
        if (sliderContainer && sliderDots) {
            sliderContainer.innerHTML = '';
            sliderDots.innerHTML = '';
            data.testimonials.forEach((test, index) => {
                const slide = document.createElement('div');
                slide.className = `testimonial-slide ${index === 0 ? 'active' : ''}`;
                slide.innerHTML = `
                    <div class="testimonial-content">
                        <p class="testimonial-text">"${test.text}"</p>
                        <div class="testimonial-author">
                            <h4>${test.author}</h4>
                            <p>${test.role}</p>
                        </div>
                    </div>
                `;
                sliderContainer.appendChild(slide);

                const dot = document.createElement('span');
                dot.className = `dot ${index === 0 ? 'active' : ''}`;
                sliderDots.appendChild(dot);
            });
        }
    }

    // 9. Contact Info & Socials
    if (data.contact) {
        const contactItems = document.querySelectorAll('.contact-item');
        if (contactItems[0]) contactItems[0].querySelector('p').textContent = data.contact.email;
        if (contactItems[1]) contactItems[1].querySelector('p').textContent = data.contact.phone;
        if (contactItems[2]) contactItems[2].querySelector('p').textContent = data.contact.location;
    }

    if (data.socials) {
        const socialIcons = document.querySelectorAll('.social-icon');
        if (socialIcons[0]) socialIcons[0].setAttribute('href', data.socials.instagram || '#');
        if (socialIcons[1]) socialIcons[1].setAttribute('href', data.socials.twitter || '#');
        if (socialIcons[2]) socialIcons[2].setAttribute('href', data.socials.linkedin || '#');
        if (socialIcons[3]) socialIcons[3].setAttribute('href', data.socials.youtube || '#');
    }

    // 10. Footer info
    if (data.footer) {
        const footerTagline = document.querySelector('.footer-tagline');
        if (footerTagline) footerTagline.textContent = data.footer.tagline;

        const footerCopyright = document.querySelector('.footer-copyright');
        if (footerCopyright) footerCopyright.innerHTML = `&copy; ${data.footer.copyright}`;
    }

    // 11. Section Visibility Config (Crucial Requirement!)
    if (data.sections) {
        data.sections.forEach(sec => {
            const secElement = document.getElementById(sec.id);
            const navLink = document.querySelector(`.nav-link[href="#${sec.id}"]`);
            
            if (sec.is_visible) {
                if (secElement) secElement.style.display = '';
                if (navLink) {
                    navLink.style.display = '';
                    if (navLink.parentElement) navLink.parentElement.style.display = '';
                }
            } else {
                if (secElement) secElement.style.display = 'none';
                if (navLink) {
                    navLink.style.display = 'none';
                    if (navLink.parentElement) navLink.parentElement.style.display = 'none';
                }
            }
        });
    }
}

function initializeInteractions() {
    // 1. Page Load Animation
    const pageLoader = document.querySelector('.page-loader');
    if (pageLoader) {
        setTimeout(() => {
            pageLoader.classList.add('fade-out');
            
            // Hero animations
            const sub = document.querySelector('.hero-subtitle');
            const title = document.querySelector('.hero-title');
            const tag = document.querySelector('.hero-tagline');
            const btn = document.querySelector('.btn-hero');
            
            if (sub) sub.style.animationPlayState = 'running';
            if (title) title.style.animationPlayState = 'running';
            if (tag) tag.style.animationPlayState = 'running';
            if (btn) btn.style.animationPlayState = 'running';
        }, 1000); // reduced loader delay slightly for snappier experience
    }

    // 2. Navigation Scroll Effect
    window.addEventListener('scroll', handleNavbarScroll);
    handleNavbarScroll(); // Initial run

    // 3. Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // 4. Scroll Animations
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Initial run

    // 5. Achievement Counters Intersection Observer
    const aboutSection = document.querySelector('#about');
    if (aboutSection) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.3
        };

        let countAnimated = false;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !countAnimated) {
                    countAnimated = true;
                    setTimeout(animateCounters, 500);
                }
            });
        }, observerOptions);

        observer.observe(aboutSection);
    }

    // 6. Image Gallery Lightbox
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.querySelector('.lightbox');
    const lightboxImg = document.querySelector('.lightbox-img');
    const lightboxCaption = document.querySelector('.lightbox-caption');
    const lightboxClose = document.querySelector('.lightbox-close');

    if (galleryItems.length > 0 && lightbox && lightboxImg) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) {
                    const imgSrc = img.getAttribute('src');
                    const imgAlt = img.getAttribute('alt');
                    
                    lightboxImg.setAttribute('src', imgSrc);
                    if (lightboxCaption) lightboxCaption.textContent = imgAlt;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        if (lightboxClose) {
            lightboxClose.addEventListener('click', () => {
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        }

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Specialties (Signature Dishes) 3D Slider Controls
    const dishesPrevBtn = document.getElementById('dishesPrevBtn');
    const dishesNextBtn = document.getElementById('dishesNextBtn');
    const dishesSlider = document.getElementById('dishesSlider');

    if (dishesPrevBtn && dishesNextBtn && dishesSlider) {
        dishesNextBtn.addEventListener('click', () => {
            const slides = document.querySelectorAll('.dish-slide');
            if (slides.length <= 1) return;
            activeDishIndex = (activeDishIndex + 1) % slides.length;
            updateDishesSlider();
        });

        dishesPrevBtn.addEventListener('click', () => {
            const slides = document.querySelectorAll('.dish-slide');
            if (slides.length <= 1) return;
            activeDishIndex = (activeDishIndex - 1 + slides.length) % slides.length;
            updateDishesSlider();
        });

        // Swipe gestures for touch screens
        let dishTouchStart = 0;
        let dishTouchEnd = 0;
        
        dishesSlider.addEventListener('touchstart', e => {
            dishTouchStart = e.changedTouches[0].clientX;
        }, { passive: true });
        
        dishesSlider.addEventListener('touchend', e => {
            dishTouchEnd = e.changedTouches[0].clientX;
            const threshold = 50;
            const slides = document.querySelectorAll('.dish-slide');
            if (slides.length <= 1) return;
            
            if (dishTouchStart - dishTouchEnd > threshold) {
                activeDishIndex = (activeDishIndex + 1) % slides.length;
                updateDishesSlider();
            } else if (dishTouchEnd - dishTouchStart > threshold) {
                activeDishIndex = (activeDishIndex - 1 + slides.length) % slides.length;
                updateDishesSlider();
            }
        }, { passive: true });
    }

    // 7. Testimonial Slider Controls
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (prevBtn && nextBtn) {
        nextBtn.addEventListener('click', () => {
            const slides = document.querySelectorAll('.testimonial-slide');
            if (slides.length === 0) return;
            let nextIndex = currentSlide + 1;
            if (nextIndex >= slides.length) {
                nextIndex = 0;
            }
            showSlide(nextIndex);
        });

        prevBtn.addEventListener('click', () => {
            const slides = document.querySelectorAll('.testimonial-slide');
            if (slides.length === 0) return;
            let prevIndex = currentSlide - 1;
            if (prevIndex < 0) {
                prevIndex = slides.length - 1;
            }
            showSlide(prevIndex);
        });

        // Set up click for dots dynamically (since dots were rendered dynamically)
        setupDotClicks();
    }

    // Testimonial Auto slide timer
    setInterval(() => {
        const slides = document.querySelectorAll('.testimonial-slide');
        if (slides.length <= 1) return;
        let nextIndex = currentSlide + 1;
        if (nextIndex >= slides.length) {
            nextIndex = 0;
        }
        showSlide(nextIndex);
    }, 5000);

    // 8. Contact Form API Submission & Client Validation
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const subjectInput = document.getElementById('subject');
        const messageInput = document.getElementById('message');
        const formSuccess = document.getElementById('formSuccess');

        const nameError = document.getElementById('nameError');
        const emailError = document.getElementById('emailError');
        const subjectError = document.getElementById('subjectError');
        const messageError = document.getElementById('messageError');

        const validateName = () => {
            const nameValue = nameInput.value.trim();
            if (nameValue === '') {
                if (nameError) nameError.textContent = 'Name is required';
                return false;
            } else if (nameValue.length < 2) {
                if (nameError) nameError.textContent = 'Name must be at least 2 characters';
                return false;
            } else {
                if (nameError) nameError.textContent = '';
                return true;
            }
        };

        const validateEmail = () => {
            const emailValue = emailInput.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailValue === '') {
                if (emailError) emailError.textContent = 'Email is required';
                return false;
            } else if (!emailRegex.test(emailValue)) {
                if (emailError) emailError.textContent = 'Please enter a valid email';
                return false;
            } else {
                if (emailError) emailError.textContent = '';
                return true;
            }
        };

        const validateSubject = () => {
            const subjectValue = subjectInput.value.trim();
            if (subjectValue === '') {
                if (subjectError) subjectError.textContent = 'Subject is required';
                return false;
            } else if (subjectValue.length < 5) {
                if (subjectError) subjectError.textContent = 'Subject must be at least 5 characters';
                return false;
            } else {
                if (subjectError) subjectError.textContent = '';
                return true;
            }
        };

        const validateMessage = () => {
            const messageValue = messageInput.value.trim();
            if (messageValue === '') {
                if (messageError) messageError.textContent = 'Message is required';
                return false;
            } else if (messageValue.length < 10) {
                if (messageError) messageError.textContent = 'Message must be at least 10 characters';
                return false;
            } else {
                if (messageError) messageError.textContent = '';
                return true;
            }
        };

        if (nameInput) nameInput.addEventListener('input', validateName);
        if (emailInput) emailInput.addEventListener('input', validateEmail);
        if (subjectInput) subjectInput.addEventListener('input', validateSubject);
        if (messageInput) messageInput.addEventListener('input', validateMessage);

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const isNameValid = validateName();
            const isEmailValid = validateEmail();
            const isSubjectValid = validateSubject();
            const isMessageValid = validateMessage();
            
            if (isNameValid && isEmailValid && isSubjectValid && isMessageValid) {
                const payload = {
                    name: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    subject: subjectInput.value.trim(),
                    message: messageInput.value.trim()
                };

                // Submit to backend Express API
                fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => {
                    if (!res.ok) throw new Error('Could not deliver message.');
                    return res.json();
                })
                .then(() => {
                    if (formSuccess) {
                        formSuccess.textContent = 'Thank you for your message! I will get back to you soon.';
                        formSuccess.classList.add('active');
                        formSuccess.style.color = '#D4AF37';
                    }
                    contactForm.reset();
                    setTimeout(() => {
                        if (formSuccess) formSuccess.classList.remove('active');
                    }, 5000);
                })
                .catch(err => {
                    if (formSuccess) {
                        formSuccess.textContent = 'Error: ' + err.message;
                        formSuccess.classList.add('active');
                        formSuccess.style.color = '#ff6b6b';
                    }
                    setTimeout(() => {
                        if (formSuccess) formSuccess.classList.remove('active');
                    }, 5000);
                });
            }
        });
    }

    // 9. Smooth scrolling for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Update active nav link based on scroll position
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        if (section.style.display !== 'none') {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

function animateOnScroll() {
    const elements = document.querySelectorAll('.animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right');
    elements.forEach(element => {
        if (element.getBoundingClientRect().top < window.innerHeight - 150) {
            element.classList.add('appear');
        }
    });
}

function animateCounters() {
    const counters = document.querySelectorAll('.counter-number');
    const speed = 200;
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-count');
        const updateCount = () => {
            const count = +counter.innerText;
            const increment = target / speed;
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 1);
            } else {
                counter.innerText = target.toLocaleString();
            }
        };
        updateCount();
    });
}

function showSlide(index) {
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    currentSlide = index;
}

function setupDotClicks() {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
        });
    });
}

function updateDishesSlider() {
    const slides = document.querySelectorAll('.dish-slide');
    const dots = document.querySelectorAll('.dishes-slider-dots .dot');
    if (slides.length === 0) return;
    
    slides.forEach((slide, idx) => {
        slide.classList.remove('active', 'prev', 'next', 'prev-hidden', 'next-hidden');
        
        let offset = idx - activeDishIndex;
        const total = slides.length;
        if (offset < -1 && offset < -total / 2) offset += total;
        if (offset > 1 && offset > total / 2) offset -= total;
        
        if (offset === 0) {
            slide.classList.add('active');
        } else if (offset === -1) {
            slide.classList.add('prev');
        } else if (offset === 1) {
            slide.classList.add('next');
        } else if (offset < 0) {
            slide.classList.add('prev-hidden');
        } else if (offset > 0) {
            slide.classList.add('next-hidden');
        }
    });
    
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === activeDishIndex);
    });
}
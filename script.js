// script.js
// Page Load Animation
window.addEventListener('load', () => {
    const pageLoader = document.querySelector('.page-loader');
    setTimeout(() => {
        pageLoader.classList.add('fade-out');
        
        // Hero animations
        document.querySelector('.hero-subtitle').style.animationPlayState = 'running';
        document.querySelector('.hero-title').style.animationPlayState = 'running';
        document.querySelector('.hero-tagline').style.animationPlayState = 'running';
        document.querySelector('.btn-hero').style.animationPlayState = 'running';
    }, 2000);
});

// Navigation Scroll Effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Update active nav link
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

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

// Scroll Animations
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.animate-on-scroll, .animate-on-scroll-left, .animate-on-scroll-right');
    
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('appear');
        }
    });
};

window.addEventListener('scroll', animateOnScroll);

// Initialize scroll animations on page load
window.addEventListener('load', animateOnScroll);

// Achievement Counters
const animateCounters = () => {
    const counters = document.querySelectorAll('.counter-number');
    const speed = 200;
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-count');
        const count = +counter.innerText;
        const increment = target / speed;
        
        if (count < target) {
            counter.innerText = Math.ceil(count + increment);
            setTimeout(animateCounters, 1);
        } else {
            counter.innerText = target.toLocaleString();
        }
    });
};

// Trigger counters when section is in view
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.3
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            if (entry.target.id === 'about') {
                setTimeout(animateCounters, 500);
            }
        }
    });
}, observerOptions);

observer.observe(document.querySelector('#about'));

// Image Gallery Lightbox
const galleryItems = document.querySelectorAll('.gallery-item');
const lightbox = document.querySelector('.lightbox');
const lightboxImg = document.querySelector('.lightbox-img');
const lightboxCaption = document.querySelector('.lightbox-caption');
const lightboxClose = document.querySelector('.lightbox-close');

galleryItems.forEach(item => {
    item.addEventListener('click', () => {
        const imgSrc = item.querySelector('img').getAttribute('src');
        const imgAlt = item.querySelector('img').getAttribute('alt');
        
        lightboxImg.setAttribute('src', imgSrc);
        lightboxCaption.textContent = imgAlt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

lightboxClose.addEventListener('click', () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
});

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// Testimonial Slider
const slides = document.querySelectorAll('.testimonial-slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

let currentSlide = 0;

const showSlide = (index) => {
    // Hide all slides
    slides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Remove active class from all dots
    dots.forEach(dot => {
        dot.classList.remove('active');
    });
    
    // Show current slide and activate corresponding dot
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
};

// Next slide
nextBtn.addEventListener('click', () => {
    let nextIndex = currentSlide + 1;
    if (nextIndex >= slides.length) {
        nextIndex = 0;
    }
    showSlide(nextIndex);
});

// Previous slide
prevBtn.addEventListener('click', () => {
    let prevIndex = currentSlide - 1;
    if (prevIndex < 0) {
        prevIndex = slides.length - 1;
    }
    showSlide(prevIndex);
});

// Dot click events
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
    });
});

// Auto slide change every 5 seconds
setInterval(() => {
    let nextIndex = currentSlide + 1;
    if (nextIndex >= slides.length) {
        nextIndex = 0;
    }
    showSlide(nextIndex);
}, 5000);

// Contact Form Validation
const contactForm = document.getElementById('contactForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const subjectInput = document.getElementById('subject');
const messageInput = document.getElementById('message');
const formSuccess = document.getElementById('formSuccess');

// Error elements
const nameError = document.getElementById('nameError');
const emailError = document.getElementById('emailError');
const subjectError = document.getElementById('subjectError');
const messageError = document.getElementById('messageError');

// Validation functions
const validateName = () => {
    const nameValue = nameInput.value.trim();
    if (nameValue === '') {
        nameError.textContent = 'Name is required';
        return false;
    } else if (nameValue.length < 2) {
        nameError.textContent = 'Name must be at least 2 characters';
        return false;
    } else {
        nameError.textContent = '';
        return true;
    }
};

const validateEmail = () => {
    const emailValue = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailValue === '') {
        emailError.textContent = 'Email is required';
        return false;
    } else if (!emailRegex.test(emailValue)) {
        emailError.textContent = 'Please enter a valid email';
        return false;
    } else {
        emailError.textContent = '';
        return true;
    }
};

const validateSubject = () => {
    const subjectValue = subjectInput.value.trim();
    if (subjectValue === '') {
        subjectError.textContent = 'Subject is required';
        return false;
    } else if (subjectValue.length < 5) {
        subjectError.textContent = 'Subject must be at least 5 characters';
        return false;
    } else {
        subjectError.textContent = '';
        return true;
    }
};

const validateMessage = () => {
    const messageValue = messageInput.value.trim();
    if (messageValue === '') {
        messageError.textContent = 'Message is required';
        return false;
    } else if (messageValue.length < 10) {
        messageError.textContent = 'Message must be at least 10 characters';
        return false;
    } else {
        messageError.textContent = '';
        return true;
    }
};

// Real-time validation
nameInput.addEventListener('input', validateName);
emailInput.addEventListener('input', validateEmail);
subjectInput.addEventListener('input', validateSubject);
messageInput.addEventListener('input', validateMessage);

// Form submission
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isSubjectValid = validateSubject();
    const isMessageValid = validateMessage();
    
    if (isNameValid && isEmailValid && isSubjectValid && isMessageValid) {
        // In a real application, you would send the form data to a server here
        // For demo purposes, we'll just show a success message
        
        formSuccess.textContent = 'Thank you for your message! I will get back to you soon.';
        formSuccess.classList.add('active');
        
        // Reset form
        contactForm.reset();
        
        // Hide success message after 5 seconds
        setTimeout(() => {
            formSuccess.classList.remove('active');
        }, 5000);
    }
});

// Smooth scrolling for anchor links
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
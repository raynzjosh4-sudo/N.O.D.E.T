// Initialize Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let legalDocuments = [];
let activeDocId = null;

// Configure Marked.js
marked.setOptions({
    headerIds: true,
    gfm: true,
    breaks: true
});

async function fetchLegalDocs() {
    try {
        const { data, error } = await supabaseClient
            .from('legal_terms')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            legalDocuments = data.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                updatedAt: new Date(doc.updated_at).toLocaleDateString()
            }));
            return true;
        }
        return false;
    } catch (err) {
        console.error('Error fetching from Supabase:', err.message);
        return false;
    }
}

function renderSidebar(contentHtml) {
    const sidebarList = document.getElementById('sidebar-list');
    sidebarList.innerHTML = '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentHtml;
    
    // N.O.D.E documents use H3 for sub-sections
    const headers = tempDiv.querySelectorAll('h3');
    
    headers.forEach(header => {
        const text = header.innerText;
        const id = header.id || text.toLowerCase().replace(/[^\w]+/g, '-');
        header.id = id;

        const li = document.createElement('li');
        li.className = 'sidebar-item';
        
        const a = document.createElement('a');
        a.href = '#' + id;
        a.className = 'sidebar-link';
        a.textContent = text;
        
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const targetEl = document.getElementById(id);
            if (targetEl) {
                const offset = 160;
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = targetEl.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;

                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
                a.classList.add('active');
            }
        });

        li.appendChild(a);
        sidebarList.appendChild(li);
    });

    return tempDiv.innerHTML; // Return HTML with IDs injected
}

function updateContent(docId) {
    const doc = legalDocuments.find(d => d.id === docId);
    if (!doc) return;

    activeDocId = docId;
    const contentArticle = document.getElementById('content-article');
    
    // Parse Markdown to HTML
    const rawHtml = marked.parse(doc.content);
    
    // Render Sidebar and inject IDs into HTML
    const finalHtml = renderSidebar(rawHtml);
    
    contentArticle.innerHTML = finalHtml;
    
    // Update active state in nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.id === docId);
    });

    window.scrollTo(0, 0);
}

function buildNavigation() {
    const navContainer = document.getElementById('nav-container');
    navContainer.innerHTML = '';

    legalDocuments.forEach((doc, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-item';
        btn.dataset.id = doc.id;
        btn.textContent = doc.title;
        
        btn.addEventListener('click', () => updateContent(doc.id));
        
        navContainer.appendChild(btn);

        // Set first one as default if none active
        if (index === 0 && !activeDocId) {
            updateContent(doc.id);
        }
    });

    // If an active ID exists but navigation was rebuilt, ensure UI matches
    if (activeDocId) {
        updateContent(activeDocId);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    const success = await fetchLegalDocs();
    
    if (success) {
        buildNavigation();
    } else {
        document.getElementById('nav-container').innerHTML = '<div class="loading">Please check database connection.</div>';
        document.getElementById('content-article').innerHTML = '<h1>Connection Error</h1><p>Unable to load legal documents. Please ensure your Supabase keys are correct and the <code>legal_terms</code> table is populated.</p>';
    }
});

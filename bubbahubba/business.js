// business.js
// Dynamically renders company details and jobs based on ?name= query

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch ' + url);
  return response.json();
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function renderCompanyPage() {
  const name = getQueryParam('name');
  const [businesses, jobs] = await Promise.all([
    fetchJSON('json/business.json'),
    fetchJSON('json/jobs.json')
  ]);
  // Calculate jobs per business
  businesses.forEach(biz => {
    biz.jobs = jobs.filter(job => job.business === biz.name).length;
  });
  if (!name) {
    // Show blurb, search bar, location filters and all company thumbnails
    let html = `
      <section class="container section-gap">
        <p id="biz-blurb"><strong>Browse high-fidelity companies</strong> and explore promising careers or your next step with our trusted partner companies below.</p>
      </section>
      <section class="centered-container">
        <input type="text" id="searchBar" class="search-input" placeholder="Search companies...">
      </section>
      <section class="container">
        <div id="location-filters" class="location-filters"></div>
      </section>
      <section id="gallery" class="gallery"></section>`;
    document.getElementById('company-main').innerHTML = html;

    // Build unique location list (case-insensitive)
    const locMap = new Map();
    businesses.forEach(b => {
      const raw = (b.location || '').trim();
      const key = raw.toLowerCase();
      if (!locMap.has(key) && raw) locMap.set(key, raw);
    });
    const locations = Array.from(locMap.values());

    const filtersContainer = document.getElementById('location-filters');
    // Add 'All' button
    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.className = 'loc-btn active';
    allBtn.dataset.location = '';
    filtersContainer.appendChild(allBtn);

    locations.forEach(loc => {
      const btn = document.createElement('button');
      btn.textContent = loc;
      btn.className = 'loc-btn';
      btn.dataset.location = loc.toLowerCase();
      filtersContainer.appendChild(btn);
    });

    let selectedLocation = '';

    function setActiveButton(clicked) {
      document.querySelectorAll('#location-filters .loc-btn').forEach(b => b.classList.remove('active'));
      clicked.classList.add('active');
    }

    // Gallery renderer accepts search and location filter
    function renderGallery(search = '', location = '') {
      const gallery = document.getElementById('gallery');
      gallery.innerHTML = '';
      businesses.filter(biz => {
        const matchesSearch = !search || biz.name.toLowerCase().includes(search) || biz.industry?.toLowerCase().includes(search);
        const bizLocKey = (biz.location || '').trim().toLowerCase();
        const matchesLocation = !location || bizLocKey === location;
        return matchesSearch && matchesLocation;
      }).forEach(biz => gallery.appendChild(createBusinessThumb(biz)));
    }
    function createBusinessThumb(biz) {
      const div = document.createElement('div');
      div.className = 'thumb business-thumb';
      div.innerHTML = `
        <strong>🏢 ${biz.name}</strong>
        <span class="muted">${biz.industry}</span>
        <span class="muted">${biz.employees} employees</span>
        <span class="muted">${biz.location}</span>
        <span><strong>${biz.jobs}</strong> jobs</span>
      `;
      div.onclick = () => window.location.href = `business.html?name=${encodeURIComponent(biz.name)}`;
      return div;
    }
    // Wire up location buttons
    document.querySelectorAll('#location-filters .loc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const loc = btn.dataset.location || '';
        selectedLocation = loc;
        setActiveButton(btn);
        const q = document.getElementById('searchBar').value.toLowerCase();
        renderGallery(q, selectedLocation);
      });
    });

    // Wire up search to work with location filter
    document.getElementById('searchBar').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      renderGallery(q, selectedLocation);
    };

    // Initial render
    renderGallery();
    return;
  }
  // Show selected company details and jobs
  const biz = businesses.find(b => b.name === name);
  if (!biz) {
    document.getElementById('company-main').innerHTML = `<h2>Company not found: ${name}</h2>`;
    return;
  }
  let html = `<h1>🏢 ${biz.name}</h1>`;
  html += `<p><strong>Industry:</strong> <span>${biz.industry}</span></p>`;
  html += `<p><strong>Employees:</strong> <span>${biz.employees}</span></p>`;
  html += `<p><strong>Location:</strong> <span>${biz.location}</span></p>`;
  html += `<p><strong>Description:</strong> <span>${biz.description || 'No description provided.'}</span></p>`;
  const bizJobs = jobs.filter(j => j.business === biz.name);
  html += `<h2>Jobs at 🏢 ${biz.name}</h2>`;
  
  if (bizJobs.length === 0) {
    html += '<p>No jobs listed for this company.</p>';
  } else {
    html += '<ul class="job-list">';
    bizJobs.forEach(job => {
      html += `<li>
        <div class="thumb job-thumb" onclick="window.location.href='jobs.html?name=${encodeURIComponent(job.name)}'">
          <strong>💼 ${job.name}</strong>
          <span class="muted">${job.location}</span>
        </div>
      </li>`;
    });
    html += '</ul>';
  }

  document.getElementById('company-main').innerHTML = html;
}

window.onload = renderCompanyPage;

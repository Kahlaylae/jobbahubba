// jobs.js
// Dynamically renders job details and job gallery based on ?name= query

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch ' + url);
  return response.json();
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function renderJobPage() {
  const name = getQueryParam('name');
  const [jobs, businesses] = await Promise.all([
    fetchJSON('json/jobs.json'),
    fetchJSON('json/business.json')
  ]);
  // Normalize fulltime values across the file: accept boolean true, string 'true' (case-insensitive), or number 1 as true
  function isFullTime(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    if (typeof val === 'number') return val === 1;
    return false;
  }
  if (!name) {
    // Show blurb, filters, search bar and all job thumbnails
    let html = `
      <section class="container section-gap">
        <p id="job-blurb"><strong>Find your next opportunity</strong> — browse curated roles from trusted partner companies and discover positions that match your skills and ambitions.</p>
      </section>
      <section class="centered-container">
        <input type="text" id="searchBar" class="search-input" placeholder="Search jobs...">
      </section>
      <section class="container">
        <div class="filter-toggle-row location-filters">
          <button id="filterLocationBtn" class="filter-toggle loc-btn">Location</button>
          <button id="filterPriceBtn" class="filter-toggle loc-btn">Price Range</button>
          <button id="filterTypeBtn" class="filter-toggle loc-btn">Job Type</button>
          <button id="filterFullTimeBtn" class="filter-toggle loc-btn">Full Time</button>
          <button id="filterPartTimeBtn" class="filter-toggle loc-btn">Part Time</button>
        </div>
        <div id="filter-panels">
          <div id="location-panel" class="filter-panel horizontal-scroll hidden"></div>
          <div id="price-panel" class="filter-panel hidden">
            <label>Max salary: <span id="priceValue">—</span></label>
            <input id="priceRange" type="range" min="0" max="10000" step="50">
          </div>
          <div id="type-panel" class="filter-panel horizontal-scroll hidden"></div>
        </div>
      </section>
      <section id="gallery" class="gallery"></section>`;
    document.getElementById('job-main').innerHTML = html;

    // Helpers to collate unique values (case-insensitive)
    const uniq = (arr) => Array.from(new Map(arr.map(v => [v.toLowerCase(), v])).values());
    const locations = uniq(jobs.map(j => (j.location || '').trim()).filter(Boolean));
    const types = uniq(jobs.map(j => (j.type || '').trim()).filter(Boolean));

    // Price parsing: extract numbers from salary strings
    function parseSalary(s) {
      if (!s) return NaN;
      const digits = s.replace(/[^0-9,\.]/g, '').replace(/,/g, '');
      const n = parseFloat(digits);
      return isNaN(n) ? NaN : n;
    }
    const salaries = jobs.map(j => parseSalary(j.salary)).filter(n => !isNaN(n));
    const minSalary = salaries.length ? Math.min(...salaries) : 0;
    const maxSalary = salaries.length ? Math.max(...salaries) : 10000;

    // populate location and type panels
    const locPanel = document.getElementById('location-panel');
    const typePanel = document.getElementById('type-panel');

    const makeAllBtn = (cls) => { const b = document.createElement('button'); b.textContent = 'All'; b.className = cls + ' loc-btn active'; b.dataset.value = ''; return b; };

    // Location buttons
    locPanel.appendChild(makeAllBtn('loc-btn'));
    locations.forEach(loc => {
      const btn = document.createElement('button'); btn.textContent = loc; btn.className = 'loc-btn'; btn.dataset.value = loc.toLowerCase(); locPanel.appendChild(btn);
    });

    // Type buttons
    typePanel.appendChild(makeAllBtn('type-btn'));
    types.forEach(t => {
      const btn = document.createElement('button'); btn.textContent = t; btn.className = 'type-btn loc-btn'; btn.dataset.value = t.toLowerCase(); typePanel.appendChild(btn);
    });

    // Price slider setup
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    priceRange.min = Math.floor(minSalary);
    priceRange.max = Math.ceil(maxSalary || 10000);
    priceRange.value = priceRange.max;
    priceValue.textContent = priceRange.value;

  // state
  let selectedLocation = '';
  let selectedType = '';
  let selectedMaxPrice = Number(priceRange.value);
  let selectedFullTime = null; // null -> no filter, true -> only full-time

    // toggle panels using .hidden class
    function hideAllPanels() { document.querySelectorAll('.filter-panel').forEach(p => p.classList.add('hidden')); }
    const filterLocationBtn = document.getElementById('filterLocationBtn');
    const filterPriceBtn = document.getElementById('filterPriceBtn');
    const filterTypeBtn = document.getElementById('filterTypeBtn');
    document.getElementById('filterLocationBtn').onclick = () => { hideAllPanels(); locPanel.classList.toggle('hidden'); };
    document.getElementById('filterPriceBtn').onclick = () => { hideAllPanels(); document.getElementById('price-panel').classList.toggle('hidden'); };
    // If a type is currently selected, clicking the filterTypeBtn will clear the type filter; otherwise toggle the panel
    document.getElementById('filterTypeBtn').onclick = () => {
      if (selectedType) {
        // clear selection
        selectedType = '';
        filterTypeBtn.classList.remove('active');
        typePanel.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        renderGallery(document.getElementById('searchBar').value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
      } else {
        hideAllPanels(); typePanel.classList.toggle('hidden');
      }
    };
    // Full Time / Part Time toggles (no panels) — tri-state filter: true = full-time, false = part-time, null = all
    const fullTimeBtn = document.getElementById('filterFullTimeBtn');
    const partTimeBtn = document.getElementById('filterPartTimeBtn');
    fullTimeBtn.addEventListener('click', () => {
      if (selectedFullTime === true) {
        // turn off
        selectedFullTime = null;
        fullTimeBtn.classList.remove('active');
      } else {
        // set to only full-time
        selectedFullTime = true;
        fullTimeBtn.classList.add('active');
        partTimeBtn.classList.remove('active');
      }
      renderGallery(document.getElementById('searchBar').value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
    });
    partTimeBtn.addEventListener('click', () => {
      if (selectedFullTime === false) {
        // turn off
        selectedFullTime = null;
        partTimeBtn.classList.remove('active');
      } else {
        // set to only part-time
        selectedFullTime = false;
        partTimeBtn.classList.add('active');
        fullTimeBtn.classList.remove('active');
      }
      renderGallery(document.getElementById('searchBar').value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
    });

    function setActive(containerSelector, clicked) {
      document.querySelectorAll(containerSelector + ' .loc-btn').forEach(b => b.classList.remove('active'));
      if (clicked) clicked.classList.add('active');
    }

    // wire location buttons
    locPanel.querySelectorAll('.loc-btn').forEach(b => b.addEventListener('click', (e) => {
      selectedLocation = b.dataset.value || '';
      setActive('#location-panel', b);
      // mark the Location filter toggle as active when a specific location is chosen
      filterLocationBtn.classList.toggle('active', selectedLocation !== '');
      renderGallery(document.getElementById('searchBar').value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
    }));

    // wire type buttons
    typePanel.querySelectorAll('.type-btn').forEach(b => b.addEventListener('click', () => {
      selectedType = b.dataset.value || '';
      setActive('#type-panel', b);
      // mark the Job Type toggle as active when a specific type is chosen
      filterTypeBtn.classList.toggle('active', selectedType !== '');
      renderGallery(document.getElementById('searchBar').value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
    }));

    // wire price slider
    priceRange.addEventListener('input', (e) => {
      selectedMaxPrice = Number(e.target.value);
      priceValue.textContent = selectedMaxPrice;
      // indicate active state on price filter when slider is not at max
      filterPriceBtn.classList.toggle('active', selectedMaxPrice < Number(priceRange.max));
      renderGallery(document.getElementById('searchBar').value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
    });

    // gallery renderer accepts search, location, type, and maxPrice
    function renderGallery(search = '', location = '', type = '', maxPrice = Infinity) {
      const gallery = document.getElementById('gallery');
      gallery.innerHTML = '';
        const results = jobs.filter(job => {
        const matchesSearch = !search || job.name.toLowerCase().includes(search) || job.business?.toLowerCase().includes(search);
        const matchesLocation = !location || (job.location || '').trim().toLowerCase() === location;
        const matchesType = !type || (job.type || '').trim().toLowerCase() === type;
        const salaryNum = parseSalary(job.salary);
        const matchesPrice = !isFinite(maxPrice) || isNaN(salaryNum) ? true : salaryNum <= maxPrice;
        return matchesSearch && matchesLocation && matchesType && matchesPrice;
      });
  // if full-time filter active, filter results accordingly (use normalized check)
  let finalResults = results;
  if (selectedFullTime === true) {
    finalResults = results.filter(r => isFullTime(r.fulltime));
  } else if (selectedFullTime === false) {
    finalResults = results.filter(r => !isFullTime(r.fulltime));
  }
  if (finalResults.length === 0) {
        const no = document.createElement('div');
        no.className = 'no-results';
        no.innerHTML = `<p>No jobs match your search or filters.</p><p>Try clearing filters or broadening your search.</p>`;
        gallery.appendChild(no);
        return;
      }
      finalResults.forEach(job => gallery.appendChild(createJobThumb(job)));
    }

    function createJobThumb(job) {
      const div = document.createElement('div');
      div.className = 'thumb job-thumb';
      div.innerHTML = `
        <strong>💼 ${job.name}</strong>
        <span class="muted"><strong>${job.business}</strong></span>
        <span class="muted">${job.location}</span>
        <span class="muted">${job.salary || ''}</span>
        <span class="muted">${isFullTime(job.fulltime) ? 'Full-time' : 'Part-time'}</span>
      `;
      div.onclick = () => window.location.href = `jobs.html?name=${encodeURIComponent(job.name)}`;
      return div;
    }

    // initial render
    renderGallery();
    // wire search input
    document.getElementById('searchBar').oninput = (e) => {
      renderGallery(e.target.value.toLowerCase(), selectedLocation, selectedType, selectedMaxPrice);
    };
    return;
  }
  // Show selected job details
  const job = jobs.find(j => j.name === name);
  if (!job) {
    document.getElementById('job-main').innerHTML = `<h2>Job not found: ${name}</h2>`;
    return;
  }
  // Find linked company
  const biz = businesses.find(b => b.name === job.business);
  let html = `<h1>💼 ${job.name}</h1>`;
  html += `<p><strong>Company:</strong> <a href="business.html?name=${encodeURIComponent(job.business)}">🏢 ${job.business}</a></p>`;
  html += `<p><strong>Location:</strong> <span>${job.location}</span></p>`;
  html += `<p><strong>Type:</strong> <span>${job.type || 'N/A'}</span></p>`;
  html += `<p><strong>Full-time:</strong> <span>${isFullTime(job.fulltime) ? 'Yes' : 'No (Part-time)'}</span></p>`;
  html += `<p><strong>Description:</strong> <span>${job.description || 'No description provided.'}</span></p>`;
  if (biz) {
  html += `<h2>About 🏢 ${biz.name}</h2>`;
    html += `<p><strong>Industry:</strong> <span>${biz.industry}</span></p>`;
    html += `<p><strong>Employees:</strong> <span>${biz.employees}</span></p>`;
    html += `<p><strong>Location:</strong> <span>${biz.location}</span></p>`;
    html += `<p><strong>Description:</strong> <span>${biz.description || 'No description provided.'}</span></p>`;
  }
  // Similar jobs by type
  const similarJobs = jobs.filter(j => j.type === job.type && j.name !== job.name);
  if (similarJobs.length > 0) {
    html += `<h2>Similar ${job.type} Jobs</h2>`;
    html += `<div class="horizontal-scroll">`;
    similarJobs.forEach(simJob => {
      html += `<div class="thumb job-thumb" onclick="window.location.href='jobs.html?name=${encodeURIComponent(simJob.name)}'">
        <strong>💼 ${simJob.name}</strong>
  <span class="muted"><strong>${simJob.business}</strong></span>
        <span class="muted">${simJob.location}</span>
        <span class="muted">${isFullTime(simJob.fulltime) ? 'Full-time' : 'Part-time'}</span>
      </div>`;
    });
    html += `</div>`;
  }
  document.getElementById('job-main').innerHTML = html;
}

window.onload = renderJobPage;

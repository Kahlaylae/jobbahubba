// filemanager.js
// Handles loading and linking business.json and jobs.json, and populates landing page

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch ' + url);
  return response.json();
}

async function loadData() {
  const [businesses, jobs] = await Promise.all([
    fetchJSON('json/business.json'),
    fetchJSON('json/jobs.json')
  ]);

  // Calculate jobs per business
  businesses.forEach(biz => {
    biz.jobs = jobs.filter(job => job.business === biz.name).length;
  });

  // Stats
  document.getElementById('jobsCount').textContent = jobs.length;
  document.getElementById('companiesCount').textContent = businesses.length;
  document.getElementById('placementsCount').textContent = jobs.filter(j => j.placement).length;

  // Initial gallery
  renderGallery(businesses, jobs, 'all');

  // Toggle buttons
  document.getElementById('toggleAll').onclick = () => renderGallery(businesses, jobs, 'all');
  document.getElementById('toggleCompanies').onclick = () => renderGallery(businesses, jobs, 'companies');
  document.getElementById('toggleJobs').onclick = () => renderGallery(businesses, jobs, 'jobs');

  // Search
  document.getElementById('searchBar').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    renderGallery(businesses, jobs, 'all', query);
  };
}

function renderGallery(businesses, jobs, mode = 'all', search = '') {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';
  let items = [];
  if (mode === 'companies') {
    items = businesses.filter(biz =>
      biz.name.toLowerCase().includes(search) ||
      biz.industry?.toLowerCase().includes(search)
    ).slice(0, 10);
    items.forEach(biz => gallery.appendChild(createBusinessThumb(biz)));
  } else if (mode === 'jobs') {
    items = jobs.filter(job =>
      job.name.toLowerCase().includes(search) ||
      job.business?.toLowerCase().includes(search)
    ).slice(0, 10);
    items.forEach(job => gallery.appendChild(createJobThumb(job)));
  } else {
    // Show both, first 10 each
    businesses.filter(biz =>
      biz.name.toLowerCase().includes(search) ||
      biz.industry?.toLowerCase().includes(search)
    ).slice(0, 10).forEach(biz => gallery.appendChild(createBusinessThumb(biz)));
    jobs.filter(job =>
      job.name.toLowerCase().includes(search) ||
      job.business?.toLowerCase().includes(search)
    ).slice(0, 10).forEach(job => gallery.appendChild(createJobThumb(job)));
  }
}

function createBusinessThumb(biz) {
  const div = document.createElement('div');
  div.className = 'thumb business-thumb';
  div.innerHTML = `
    <strong>🏢 ${biz.name}</strong><br>
    <span>${biz.industry}</span><br>
    <span>${biz.employees} employees</span><br>
    <span>${biz.location}</span><br>
    <span><strong>${biz.jobs}</strong> jobs</span>
  `;
  div.onclick = () => window.location.href = `business.html?name=${encodeURIComponent(biz.name)}`;
  return div;
}

function createJobThumb(job) {
  const div = document.createElement('div');
  div.className = 'thumb job-thumb';
  div.innerHTML = `
    <strong>💼 ${job.name}</strong><br>
    <strong class="muted">${job.business}</strong><br>
    <span>${job.location}</span>
  `;
  div.onclick = () => window.location.href = `jobs.html?name=${encodeURIComponent(job.name)}`;
  return div;
}

window.onload = loadData;

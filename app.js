const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M4 12h16"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.7 1.2c-.9 1.3-2.3 1.6-2.3 3.3M12 17h.01"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
  spark: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
};

function icon(name, className = '') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.grid}</svg>`;
}

function formatCheckedAt(val) {
  if (!val) return '';
  const s = String(val).trim();
  // If string already contains a date (like '11 Nov', '12 Nov', or a year/dash/slash)
  if (/[a-zA-Z]{3}|\d{4}|\/|-/.test(s.replace(/AM|PM/i, ''))) {
    return s;
  }
  // Otherwise it's only a time like '8:39 AM' from the event day (11 Nov 2026)
  return `11 Nov, ${s}`;
}

// Global Application State connected to MySQL API
let attendees = [];
let feedbackRecords = [];
let teams = [];
let registrations = 0;
let checkins = 0;
let feedbackCount = 0;
let avgRating = 4.8;
let avgSessionRating = 4.8;

let activePage = 'overview';
let attendeeSearch = '';
let attendeeFilter = 'all';
let attendeeTeamFilter = 'all';
let attendanceCategoryFilter = 'all';
let teamSearch = '';
let teamFilter = 'all';
let teamAttendanceFilter = 'all';
let feedbackSearch = '';
let feedbackFilter = 'all';
let recentCheckins = [];

// API helper functions
async function fetchAPI(endpoint, options = {}) {
  try {
    // Dynamic path detection: supports /snd26/ subfolder on localhost as well as root / on production domain
    const basePath = window.location.pathname.startsWith('/snd26') ? '/snd26/api/' : 'api/';
    const res = await fetch(`${basePath}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API call to ${endpoint} failed:`, err);
    return null;
  }
}

let isSyncing = false;

async function loadInitialData(isBackgroundSync = false) {
  if (isBackgroundSync && isSyncing) return;
  isSyncing = true;

  try {
    const [statsRes, attendeesRes, feedbackRes, teamsRes] = await Promise.all([
      fetchAPI('stats.php'),
      fetchAPI('attendees.php'),
      fetchAPI('feedback.php'),
      fetchAPI('teams.php')
    ]);

    let changed = false;

    if (statsRes && statsRes.success) {
      if (registrations !== statsRes.data.registrations || checkins !== statsRes.data.checkins || feedbackCount !== statsRes.data.feedbackCount) {
        changed = true;
      }
      registrations = statsRes.data.registrations;
      checkins = statsRes.data.checkins;
      feedbackCount = statsRes.data.feedbackCount;
      avgRating = statsRes.data.avgRating;
      avgSessionRating = statsRes.data.avgSessionRating;
    }
    if (attendeesRes && attendeesRes.success) {
      if (JSON.stringify(attendees) !== JSON.stringify(attendeesRes.data)) {
        changed = true;
      }
      attendees = attendeesRes.data;
    }
    if (feedbackRes && feedbackRes.success) {
      if (JSON.stringify(feedbackRecords) !== JSON.stringify(feedbackRes.data)) {
        changed = true;
      }
      feedbackRecords = feedbackRes.data;
    }
    if (teamsRes && teamsRes.success) {
      teams = teamsRes.data;
    }

    // If this is a background auto-refresh:
    // Only update DOM if changes detected, AND user does not have a modal or input actively focused
    if (isBackgroundSync) {
      const modalOpen = document.getElementById('modal-container').classList.contains('active');
      const activeElement = document.activeElement;
      const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');

      if (changed) {
        if (!modalOpen && !isTyping) {
          render();
        } else {
          // Update navigation counts and counters softly without touching active form
          const navCount = document.getElementById('nav-attendee-count');
          if (navCount) navCount.textContent = registrations.toLocaleString();
        }
      }
    } else {
      render();
    }
  } catch (err) {
    console.warn('Background sync error:', err);
  } finally {
    isSyncing = false;
  }
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function percent(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function toast(message) {
  const region = document.getElementById('toast-region');
  const item = document.createElement('div');
  item.className = 'toast';
  item.innerHTML = `<span class="toast-check">✓</span><span>${escapeHTML(message)}</span>`;
  region.append(item);
  window.setTimeout(() => item.remove(), 3400);
}

function statusBadge(type, label) {
  const className = type === 'checked' ? 'checked' : type === 'received' ? 'received' : type === 'pending' ? 'pending' : 'scheduled';
  return `<span class="status-badge ${className}"><span class="status-dot"></span>${escapeHTML(label)}</span>`;
}

function teamBadge(teamId, teamName) {
  let styleClass = 'team-pill-grey';
  if (teamId === 'TEAM-1' || /pink/i.test(teamName)) styleClass = 'team-pill-pink';
  else if (teamId === 'TEAM-2' || /purple/i.test(teamName)) styleClass = 'team-pill-purple';
  else if (teamId === 'TEAM-3' || /orange/i.test(teamName)) styleClass = 'team-pill-orange';
  
  return `<span class="team-pill ${styleClass}"><span class="team-pill-dot"></span>${escapeHTML(teamName || teamId || 'Unassigned')}</span>`;
}

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function personCell(person) {
  let toneClass = '';
  if (person.team === 'TEAM-1') toneClass = ' style="background:#fdf2f8;color:#be185d;"';
  else if (person.team === 'TEAM-2') toneClass = ' style="background:#f5f3ff;color:#6d28d9;"';
  else if (person.team === 'TEAM-3') toneClass = ' style="background:#fff7ed;color:#c2410c;"';
  else if (person.team === 'TEAM-4') toneClass = ' style="background:#f8fafc;color:#334155;"';

  return `<div class="person-cell"><span class="person-avatar"${toneClass}>${escapeHTML(person.initials || initials(person.name))}</span><span class="person-copy"><strong>${escapeHTML(person.name)}</strong><small>${escapeHTML(person.email)}</small></span></div>`;
}

function pageHeading(eyebrow, title, description, actions = '') {
  return `<div class="page-heading"><div><span class="page-eyebrow">${escapeHTML(eyebrow)}</span><h1 class="page-title">${escapeHTML(title)}</h1><p class="page-description">${escapeHTML(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}

function statCard(label, value, delta, context, iconName, tone = '') {
  const toneClass = tone ? ` ${tone}` : '';
  const deltaMarkup = delta ? `<span class="stat-delta${delta.includes('-') ? ' down' : ''}">${escapeHTML(delta)}</span>` : '';
  return `<article class="stat-card"><div class="stat-card-header"><span class="stat-label">${escapeHTML(label)}</span><span class="stat-icon${toneClass}">${icon(iconName)}</span></div><div class="stat-card-body"><div class="stat-value-row"><span class="stat-value">${escapeHTML(value)}</span>${deltaMarkup}</div><span class="stat-context">${escapeHTML(context)}</span></div></article>`;
}

// ----------------- OVERVIEW MODULE -----------------
function renderOverview() {
  const attendanceRate = percent(checkins, registrations);
  const feedbackRate = percent(feedbackCount, registrations);

  return `<div class="overview-page">
    ${pageHeading('ISN SPORTS NUTRITION DAY 2026', 'Event Overview', 'Live event operations dashboard powered by MySQL.', `
      <button class="button button-dark" type="button" data-action="scan-checkin">${icon('scan','button-icon')}Open check-in desk</button>
      <button class="button button-primary" type="button" data-action="create-attendee">${icon('plus','button-icon')}Register attendee</button>
    `)}

    <section class="event-hero" aria-label="Event summary">
      <div class="event-hero-copy">
        <div class="event-pill-row">
          <span class="hero-badge"><span class="pulse-dot"></span> 11 NOV 2026 · LIVE EVENT</span>
          <span class="hero-subbadge">ORGANISER: ISN MALAYSIA</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin:8px 0;">
          <img src="assets/brand/perform-snd-lockup.png" alt="PERFORM SND" style="height:36px;object-fit:contain;filter:brightness(0) invert(1);" />
          <img src="assets/brand/isn-organiser-lockup.png" alt="ISN Organiser" style="height:32px;object-fit:contain;filter:brightness(0) invert(1);opacity:0.9;" />
        </div>
        <h2>Hydration and Performance Nutrition: Strategies and Practices</h2>
        <p class="hero-desc">Connecting elite athletes, coaches, dietitians, and sports scientists for cutting-edge sports nutrition strategies.</p>
        <div class="hero-meta">
          <span>${icon('calendar')} 11 November 2026</span>
          <span>${icon('building')} Institut Sukan Negara (ISN)</span>
          <span>${icon('users')} 4 Teams Active</span>
        </div>
      </div>
      <div class="poster-frame">
        <img class="poster-image" src="event-poster.png" alt="Official event poster" />
      </div>
    </section>

    <!-- Key Metrics -->
    <section class="stats-grid" aria-label="Key operational metrics">
      ${statCard('Total Registrations', registrations.toLocaleString(), '+100%', 'Registered participants', 'users')}
      ${statCard('Checked in', checkins.toLocaleString(), `${attendanceRate}%`, 'Arrival confirmation rate', 'check', 'green')}
      ${statCard('Feedback Received', feedbackCount.toLocaleString(), `${feedbackRate}%`, 'Completed attendee evaluations', 'chat', 'green')}
      ${statCard('Average Rating', `${avgRating} / 5.0`, '★ ★ ★ ★ ★', 'Attendee satisfaction score', 'star', 'orange')}
    </section>

    <!-- 4 Teams Distribution Preview -->
    <section class="panel" style="margin-bottom:24px;">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Pre-Event Team Rosters</h2>
          <p class="panel-description">Headcount and check-in distribution across 4 teams</p>
        </div>
        <button class="button button-outline" type="button" data-nav="teams">${icon('arrow','button-icon')}View All Teams</button>
      </div>
      <div class="panel-body">
        <div class="teams-grid">
          ${teams.map((t) => `
            <div class="team-card">
              <div class="team-card-bar" style="background:${t.color_code};"></div>
              <div class="team-card-head">
                <h3 class="team-card-title">${escapeHTML(t.name)}</h3>
                <span class="team-card-badge" style="background:${t.bg_tint};color:${t.color_code};">${escapeHTML(t.id)}</span>
              </div>
              <p style="font-size:12px;color:var(--muted);margin:0 0 10px;">${escapeHTML(t.description)}</p>
              <div class="team-stats-row">
                <div class="team-stat-item">
                  <span class="team-stat-label">Members</span>
                  <span class="team-stat-num">${t.totalMembers}</span>
                </div>
                <div class="team-stat-item">
                  <span class="team-stat-label">Checked In</span>
                  <span class="team-stat-num" style="color:var(--green-deep);">${t.checkedInCount}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Quick Operations Panels -->
    <div class="content-grid">
      <article class="panel">
        <div class="panel-header">
          <div><h2 class="panel-title">Recent Arrivals</h2><p class="panel-description">Live check-in stream</p></div>
          <button class="button button-outline" type="button" data-nav="attendance">View directory</button>
        </div>
        <div class="panel-body">
          ${attendees.filter(a => a.checkedIn).slice(0, 5).map(a => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);">
              ${personCell(a)}
              <div style="text-align:right;">
                ${teamBadge(a.team, a.teamName)}
                <div style="font-size:11px;color:var(--muted);margin-top:4px;">${escapeHTML(formatCheckedAt(a.checkedAt) || 'Just now')}</div>
              </div>
            </div>
          `).join('') || '<div class="no-results">No check-ins yet today.</div>'}
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div><h2 class="panel-title">Feedback Highlights</h2><p class="panel-description">Recent participant reviews</p></div>
          <button class="button button-outline" type="button" data-nav="feedback">All feedback</button>
        </div>
        <div class="panel-body">
          ${feedbackRecords.slice(0, 4).map(f => `
            <div style="padding:10px 0;border-bottom:1px solid var(--line);">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <strong>${escapeHTML(f.label || 'Participant')}</strong>
                <span style="color:#e8a633;font-size:12px;">${'★'.repeat(f.rating)}</span>
              </div>
              <p style="margin:0;font-size:13px;color:#4a4e69;">"${escapeHTML(f.comment)}"</p>
            </div>
          `).join('') || '<div class="no-results">No feedback recorded yet.</div>'}
        </div>
      </article>
    </div>

    <!-- Quick Action Bar -->
    <section class="panel" style="margin-top:24px;">
      <div class="panel-header">
        <div><h2 class="panel-title">Quick Administrative Actions</h2><p class="panel-description">Common event operations</p></div>
      </div>
      <div class="panel-body">
        <div class="quick-actions">
          <div class="quick-action-card" data-action="scan-checkin">
            <span class="quick-action-icon">${icon('scan')}</span>
            <div class="quick-action-copy"><strong>Open Check-In Desk</strong><p>Scan registration ID or search participant arrivals.</p></div>
          </div>
          <div class="quick-action-card" data-action="create-attendee">
            <span class="quick-action-icon">${icon('plus')}</span>
            <div class="quick-action-copy"><strong>Add New Attendee</strong><p>Register an on-site participant and assign team.</p></div>
          </div>
          <div class="quick-action-card" data-action="open-feedback-form">
            <span class="quick-action-icon">${icon('chat')}</span>
            <div class="quick-action-copy"><strong>Submit Feedback Form</strong><p>Record attendee review & trigger E-Certificate.</p></div>
          </div>
          <div class="quick-action-card" data-action="export-attendees">
            <span class="quick-action-icon">${icon('download')}</span>
            <div class="quick-action-copy"><strong>Export Data (CSV)</strong><p>Download full roster with team allocations.</p></div>
          </div>
        </div>
      </div>
    </section>
  </div>`;
}

// ----------------- ATTENDANCE MODULE -----------------
function filteredAttendees() {
  const query = attendeeSearch.trim().toLowerCase();
  return attendees.filter((attendee) => {
    const matchesQuery = !query || [attendee.name, attendee.email, attendee.id, attendee.phone, attendee.category, attendee.teamName, attendee.remarks || ''].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = attendeeFilter === 'all' || (attendeeFilter === 'checked' && attendee.checkedIn) || (attendeeFilter === 'pending' && !attendee.checkedIn);
    const matchesTeam = attendeeTeamFilter === 'all' || attendee.team === attendeeTeamFilter;
    return matchesQuery && matchesStatus && matchesTeam;
  });
}

function attendeeRows() {
  const rows = filteredAttendees();
  if (!rows.length) return '<tr><td colspan="10"><div class="no-results">No attendee records match this search.</div></td></tr>';
  return rows.map((attendee) => `
    <tr class="clickable-attendee-row" data-action="edit-attendee-row" data-id="${escapeHTML(attendee.id)}" title="Click to edit participant info">
      <td>${personCell(attendee)}</td>
      <td><strong style="color:var(--navy);font-size:12px;">${escapeHTML(attendee.phone || '—')}</strong></td>
      <td>${escapeHTML(attendee.id)}</td>
      <td>${escapeHTML(attendee.category)}</td>
      <td>${teamBadge(attendee.team, attendee.teamName)}</td>
      <td>${escapeHTML(attendee.registered)}</td>
      <td><span style="font-size:11px;color:${attendee.remarks ? '#b45309' : '#94a3b8'};background:${attendee.remarks ? '#fef3c7' : 'transparent'};padding:${attendee.remarks ? '2px 6px' : '0'};border-radius:4px;display:inline-block;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(attendee.remarks || '')}">${escapeHTML(attendee.remarks || '—')}</span></td>
      <td>${attendee.checkedIn ? statusBadge('checked', `Checked in${attendee.checkedAt ? ` · ${formatCheckedAt(attendee.checkedAt)}` : ''}`) : statusBadge('pending', 'Awaiting arrival')}</td>
      <td>
        ${attendee.checkedIn ? `<button class="row-action muted" type="button" data-action="toggle-checkin" data-id="${escapeHTML(attendee.id)}">Undo</button>` : `<button class="row-action" type="button" data-action="toggle-checkin" data-id="${escapeHTML(attendee.id)}">Check in ${icon('check')}</button>`}
      </td>
      <td style="text-align:center;">
        <button class="row-delete-btn" type="button" data-action="delete-attendee-row" data-id="${escapeHTML(attendee.id)}" title="Delete participant record" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;width:28px;height:28px;cursor:pointer;font-weight:900;font-size:13px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s ease;">
          &times;
        </button>
      </td>
    </tr>
  `).join('');
}

function updateAttendeeRows() {
  const body = document.getElementById('attendee-rows');
  if (!body) return;
  const rows = filteredAttendees();
  body.innerHTML = attendeeRows();
  const footer = document.getElementById('attendee-table-footer');
  if (footer) footer.textContent = `Showing ${rows.length} participants · ${registrations.toLocaleString()} total in database`;
}

function renderAttendance() {
  const attendanceRate = percent(checkins, registrations);
    // Category-specific Attendance Card calculations
    let catAttendees = attendees;
    if (attendanceCategoryFilter === 'invited') {
      catAttendees = attendees.filter(a => /invited|vip/i.test(a.category || ''));
    } else if (attendanceCategoryFilter === 'participant') {
      catAttendees = attendees.filter(a => /participant/i.test(a.category || '') && !/invited|vip|sponsor/i.test(a.category || ''));
    } else if (attendanceCategoryFilter === 'sponsor') {
      catAttendees = attendees.filter(a => /sponsor/i.test(a.category || ''));
    }

    const catTotal = catAttendees.length;
    const catChecked = catAttendees.filter(a => a.checkedIn).length;
    const catPct = percent(catChecked, catTotal);

    const categoryCardHtml = `
      <article class="stat-card" style="display:flex;flex-direction:column;justify-content:space-between;border:1.5px solid #c7d2fe;background:linear-gradient(135deg, #ffffff 0%, #f8faff 100%);">
        <div class="stat-card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="stat-label" style="color:#1e40af;font-weight:700;">Category Check-In</span>
            <span class="stat-icon" style="background:#e0e7ff;color:#4338ca;width:22px;height:22px;border-radius:6px;">${icon('users')}</span>
          </div>
          <select id="attendance-category-filter" class="select-control" style="font-size:11px;padding:2px 8px;min-height:26px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;color:#1e293b;font-weight:600;cursor:pointer;">
            <option value="all" ${attendanceCategoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            <option value="participant" ${attendanceCategoryFilter === 'participant' ? 'selected' : ''}>Paid Participant</option>
            <option value="invited" ${attendanceCategoryFilter === 'invited' ? 'selected' : ''}>Invited Guest (VIP)</option>
            <option value="sponsor" ${attendanceCategoryFilter === 'sponsor' ? 'selected' : ''}>Sponsor</option>
          </select>
        </div>
        <div class="stat-card-body" style="margin-top:6px;">
          <div class="stat-value-row" style="margin-top:2px;display:flex;align-items:baseline;gap:8px;">
            <span class="stat-value" style="font-size:24px;color:#0f172a;">${catChecked} <span style="font-size:16px;color:#64748b;font-weight:600;">/ ${catTotal}</span></span>
            <span class="stat-delta" style="background:#dcfce7;color:#15803d;font-weight:800;padding:2px 6px;border-radius:5px;font-size:11px;">${catPct}%</span>
          </div>
          <span class="stat-context" style="font-size:11px;color:#64748b;display:block;margin-top:4px;">
            checked in (${attendanceCategoryFilter === 'all' ? 'overall' : (attendanceCategoryFilter === 'participant' ? 'participants' : (attendanceCategoryFilter === 'invited' ? 'VIP guests' : 'sponsors'))})
          </span>
        </div>
      </article>
    `;

    return `<div class="attendance-page">
    ${pageHeading('ATTENDANCE', 'Attendee Check-In', 'Find registrations, record arrivals, and track real-time attendance.', `
      <button class="button button-outline" type="button" data-action="export-attendees">${icon('download','button-icon')}Export CSV</button>
      <button class="button button-dark" type="button" data-action="scan-checkin">${icon('scan','button-icon')}Check-in desk</button>
      <button class="button button-primary" type="button" data-action="create-attendee">${icon('plus','button-icon')}Add attendee</button>
    `)}

    <div class="module-banner">
      <span class="module-banner-icon">${icon('check')}</span>
      <div class="module-banner-copy">
        <strong>Check-in desk connected to MySQL</strong>
        <p>Real-time check-in updates are synced with XAMPP MySQL database.</p>
      </div>
      <span class="status-badge checked"><span class="status-dot"></span>Database Live</span>
    </div>

    <section class="stats-grid" aria-label="Attendance summary">
      ${statCard('Total Roster', registrations.toLocaleString(), '', 'registered attendees', 'users')}
      ${statCard('Checked in', checkins.toLocaleString(), `${attendanceRate}%`, 'of registered attendees', 'check', 'green')}
      ${statCard('Remaining', Math.max(0, registrations - checkins).toLocaleString(), '', 'not checked in yet', 'clock', 'orange')}
      ${categoryCardHtml}
    </section>

    <div class="toolbar">
      <div class="toolbar-group">
        <label class="search-field">
          <span class="search-icon">${icon('search')}</span>
          <input id="attendee-search" type="search" placeholder="Search name, phone, email, ID, or team" value="${escapeHTML(attendeeSearch)}" aria-label="Search attendees" />
        </label>
        <label class="select-wrap">
          <select class="select-control" id="attendee-filter" aria-label="Filter status">
            <option value="all" ${attendeeFilter === 'all' ? 'selected' : ''}>All statuses</option>
            <option value="checked" ${attendeeFilter === 'checked' ? 'selected' : ''}>Checked in</option>
            <option value="pending" ${attendeeFilter === 'pending' ? 'selected' : ''}>Awaiting arrival</option>
          </select>
        </label>
        <label class="select-wrap">
          <select class="select-control" id="attendee-team-filter" aria-label="Filter by team">
            <option value="all" ${attendeeTeamFilter === 'all' ? 'selected' : ''}>All 4 Teams</option>
            <option value="TEAM-1" ${attendeeTeamFilter === 'TEAM-1' ? 'selected' : ''}>Team Pink</option>
            <option value="TEAM-2" ${attendeeTeamFilter === 'TEAM-2' ? 'selected' : ''}>Team Purple</option>
            <option value="TEAM-3" ${attendeeTeamFilter === 'TEAM-3' ? 'selected' : ''}>Team Orange</option>
            <option value="TEAM-4" ${attendeeTeamFilter === 'TEAM-4' ? 'selected' : ''}>Team Grey</option>
          </select>
        </label>
      </div>
    </div>

    <section class="table-shell">
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Participant</th><th>Phone Number</th><th>Reg. ID</th><th>Category</th><th>Team</th><th>Registered</th><th>Remarks</th><th>Status</th><th>Check-In Action</th><th style="width:40px;text-align:center;">Del</th></tr>
          </thead>
          <tbody id="attendee-rows">${attendeeRows()}</tbody>
        </table>
      </div>
      <div class="table-footer" id="attendee-table-footer">Showing ${filteredAttendees().length} participants · ${registrations.toLocaleString()} total in database</div>
    </section>
  </div>`;
}

// ----------------- TEAMS MODULE -----------------
function filteredTeamAttendees() {
  const query = teamSearch.trim().toLowerCase();
  return attendees.filter((a) => {
    const matchesQuery = !query || [a.name, a.email, a.id, a.phone, a.institution, a.category, a.teamName].some((val) => String(val || '').toLowerCase().includes(query));
    const matchesTeam = teamFilter === 'all' || a.team === teamFilter;
    const matchesAttendance = teamAttendanceFilter === 'all' || 
      (teamAttendanceFilter === 'checked' && a.checkedIn) || 
      (teamAttendanceFilter === 'pending' && !a.checkedIn);
    return matchesQuery && matchesTeam && matchesAttendance;
  });
}

function teamMemberRows() {
  const rows = filteredTeamAttendees();
  if (!rows.length) return '<tr><td colspan="7"><div class="no-results">No team members match your search or filter.</div></td></tr>';
  return rows.map((a) => `
    <tr>
      <td>${personCell(a)}</td>
      <td><strong style="color:var(--navy);font-size:12px;">${escapeHTML(a.phone || '—')}</strong></td>
      <td>${escapeHTML(a.id)}</td>
      <td>${escapeHTML(a.category)}</td>
      <td>${teamBadge(a.team, a.teamName)}</td>
      <td>${a.checkedIn ? statusBadge('checked', 'Checked in') : statusBadge('pending', 'Awaiting')}</td>
      <td>
        <select class="select-control" style="padding:4px 8px;font-size:12px;" onchange="reassignTeam('${escapeHTML(a.id)}', this.value)">
          <option value="TEAM-1" ${a.team === 'TEAM-1' ? 'selected' : ''}>Team Pink</option>
          <option value="TEAM-2" ${a.team === 'TEAM-2' ? 'selected' : ''}>Team Purple</option>
          <option value="TEAM-3" ${a.team === 'TEAM-3' ? 'selected' : ''}>Team Orange</option>
          <option value="TEAM-4" ${a.team === 'TEAM-4' ? 'selected' : ''}>Team Grey</option>
        </select>
      </td>
    </tr>
  `).join('');
}

function updateTeamMemberRows() {
  const body = document.getElementById('team-member-rows');
  if (!body) return;
  body.innerHTML = teamMemberRows();
  const footer = document.getElementById('team-table-footer');
  if (footer) footer.textContent = `Showing ${filteredTeamAttendees().length} members · ${attendees.length} total participants across 4 teams`;
}

function renderTeams() {
  const filtered = filteredTeamAttendees();
  return `<div class="teams-page">
    ${pageHeading('PRE-EVENT TEAMS', '4 Pre-Event Teams', 'Balanced participant teams for sports nutrition interactive workshops and competitions.', `
      <button class="button button-outline" type="button" data-action="autobalance-teams">${icon('spark','button-icon')}Auto-Balance Teams</button>
      <button class="button button-primary" type="button" data-action="create-attendee">${icon('plus','button-icon')}Add Member</button>
    `)}

    <div class="module-banner">
      <span class="module-banner-icon">${icon('spark')}</span>
      <div class="module-banner-copy">
        <strong>Interactive Team Competitions</strong>
        <p>Participants are pre-assigned to Pink, Purple, Orange, or Grey teams. Search, filter and reassign anytime below.</p>
      </div>
    </div>

    <!-- Team Cards Grid -->
    <div class="teams-grid">
      ${teams.map((t) => `
        <div class="team-card">
          <div class="team-card-bar" style="background:${t.color_code};"></div>
          <div class="team-card-head">
            <h3 class="team-card-title">${escapeHTML(t.name)}</h3>
            <span class="team-card-badge" style="background:${t.bg_tint};color:${t.color_code};">${escapeHTML(t.id)}</span>
          </div>
          <p style="font-size:13px;color:var(--muted);margin:0 0 14px;">${escapeHTML(t.description)}</p>
          <div class="team-stats-row">
            <div class="team-stat-item">
              <span class="team-stat-label">Total Roster</span>
              <span class="team-stat-num">${t.totalMembers}</span>
            </div>
            <div class="team-stat-item">
              <span class="team-stat-label">Checked In</span>
              <span class="team-stat-num" style="color:var(--green-deep);">${t.checkedInCount}</span>
            </div>
            <div class="team-stat-item">
              <span class="team-stat-label">Rate</span>
              <span class="team-stat-num">${percent(t.checkedInCount, t.totalMembers)}%</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Team Search & Filter Toolbar -->
    <div class="toolbar" style="margin-top:20px;">
      <div class="toolbar-group">
        <label class="search-field">
          <span class="search-icon">${icon('search')}</span>
          <input id="team-search" type="search" placeholder="Search member name, phone, ID, or institution..." value="${escapeHTML(teamSearch)}" aria-label="Search team members" />
        </label>
        <label class="select-wrap">
          <select class="select-control" id="team-filter-select" aria-label="Filter by team">
            <option value="all" ${teamFilter === 'all' ? 'selected' : ''}>All 4 Teams</option>
            <option value="TEAM-1" ${teamFilter === 'TEAM-1' ? 'selected' : ''}>Team Pink</option>
            <option value="TEAM-2" ${teamFilter === 'TEAM-2' ? 'selected' : ''}>Team Purple</option>
            <option value="TEAM-3" ${teamFilter === 'TEAM-3' ? 'selected' : ''}>Team Orange</option>
            <option value="TEAM-4" ${teamFilter === 'TEAM-4' ? 'selected' : ''}>Team Grey</option>
          </select>
        </label>
        <label class="select-wrap">
          <select class="select-control" id="team-attendance-filter-select" aria-label="Filter by attendance">
            <option value="all" ${teamAttendanceFilter === 'all' ? 'selected' : ''}>All statuses</option>
            <option value="checked" ${teamAttendanceFilter === 'checked' ? 'selected' : ''}>Checked in</option>
            <option value="pending" ${teamAttendanceFilter === 'pending' ? 'selected' : ''}>Awaiting arrival</option>
          </select>
        </label>
      </div>
    </div>

    <!-- Team Members Table with Reassignment -->
    <section class="table-shell">
      <div class="panel-header" style="border-bottom:1px solid var(--line);">
        <div><h2 class="panel-title">Team Member Allocations</h2><p class="panel-description">Manage and reassign members across teams</p></div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr><th>Participant</th><th>Phone Number</th><th>Reg. ID</th><th>Role / Category</th><th>Assigned Team</th><th>Attendance</th><th>Reassign Team</th></tr>
          </thead>
          <tbody id="team-member-rows">${teamMemberRows()}</tbody>
        </table>
      </div>
      <div class="table-footer" id="team-table-footer">Showing ${filtered.length} members · ${attendees.length} total participants across 4 teams</div>
    </section>
  </div>`;
}

// ----------------- FEEDBACK MODULE -----------------
function feedbackFor(attendeeId) {
  return feedbackRecords.find((record) => record.attendeeId === attendeeId);
}

function filteredFeedbackAttendees() {
  const query = feedbackSearch.trim().toLowerCase();
  return attendees.filter((attendee) => {
    const feedback = feedbackFor(attendee.id);
    const matchesQuery = !query || [attendee.name, attendee.email, attendee.id, feedback?.comment || '', attendee.teamName].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesFilter = feedbackFilter === 'all' || (feedbackFilter === 'received' && Boolean(feedback)) || (feedbackFilter === 'pending' && !feedback);
    return matchesQuery && matchesFilter;
  });
}

function feedbackRows() {
  const rows = filteredFeedbackAttendees();
  if (!rows.length) return '<tr><td colspan="7"><div class="no-results">No feedback records match this search.</div></td></tr>';
  return rows.map((attendee) => {
    const feedback = feedbackFor(attendee.id);
    return `<tr>
      <td>${personCell(attendee)}</td>
      <td>${teamBadge(attendee.team, attendee.teamName)}</td>
      <td>${attendee.checkedIn ? statusBadge('checked', 'Attended') : statusBadge('scheduled', 'Registered')}</td>
      <td>${feedback ? escapeHTML(feedback.date) : '—'}</td>
      <td>${feedback ? `<span style="color:#d89d2c;letter-spacing:1px">${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}</span><span style="color:#777b91;margin-left:6px">${feedback.rating}.0</span>` : '—'}</td>
      <td>${feedback ? statusBadge('received', 'Received') : statusBadge('pending', 'Awaiting response')}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="row-action" type="button" data-action="preview-cert" data-id="${escapeHTML(attendee.id)}" title="Preview participant certificate PDF">Preview Certificate</button>
          ${!feedback ? `<button class="row-action" type="button" data-action="remind-feedback" data-id="${escapeHTML(attendee.id)}" title="Send reminder to complete feedback">Reminder ${icon('arrow')}</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function updateFeedbackRows() {
  const body = document.getElementById('feedback-rows');
  if (!body) return;
  const rows = filteredFeedbackAttendees();
  body.innerHTML = feedbackRows();
  const footer = document.getElementById('feedback-table-footer');
  if (footer) footer.textContent = `Showing ${rows.length} participants · ${feedbackCount.toLocaleString()} responses recorded in MySQL`;
}

function renderFeedback() {
  const responseRate = percent(feedbackCount, registrations);
  const recent = [...feedbackRecords].slice(-3).reverse();
  const recentMarkup = recent.length ? recent.map((record) => `
    <div class="feedback-record">
      <div class="feedback-record-header">
        <span class="feedback-record-name">${escapeHTML(record.label || 'Attendee')}</span>
        <span class="feedback-record-date">${escapeHTML(record.date)}</span>
      </div>
      <div class="feedback-record-stars" aria-label="${record.q1_overall || record.rating} out of 5 stars">${'★'.repeat(record.q1_overall || record.rating)}${'☆'.repeat(5 - (record.q1_overall || record.rating))}</div>
      <p style="font-weight:600;margin-bottom:3px;color:var(--navy);">${escapeHTML(record.q4_valuable || record.comment || '')}</p>
      ${record.q5_suggestions ? `<p style="font-size:11px;color:#6b7280;margin:0;"><em>Suggestions:</em> ${escapeHTML(record.q5_suggestions)}</p>` : ''}
    </div>
  `).join('') : '<div class="no-results">No feedback responses recorded yet.</div>';

  return `<div class="feedback-page">
    ${pageHeading('FEEDBACK & E-CERTIFICATE', 'Attendee Feedback & Certification', 'Review responses, monitor session satisfaction, and issue personalized E-Certificates.', `
      <button class="button button-outline" type="button" data-action="export-feedback">${icon('download','button-icon')}Export responses</button>
      <button class="button button-primary" type="button" data-action="open-feedback-form">${icon('chat','button-icon')}Submit feedback form</button>
    `)}

    <div class="module-banner">
      <span class="module-banner-icon">${icon('chat')}</span>
      <div class="module-banner-copy">
        <strong>Automatic E-Certificate Generation</strong>
        <p>Submitting a feedback form instantly unlocks the official personalized ISN E-Certificate of Participation.</p>
      </div>
      <span class="status-badge received"><span class="status-dot"></span>${responseRate}% response rate</span>
    </div>

    <section class="stats-grid" aria-label="Feedback summary">
      ${statCard('Responses in DB', feedbackCount.toLocaleString(), `${responseRate}%`, 'evaluation submissions', 'chat', 'green')}
      ${statCard('Overall Satisfaction', `${avgRating} / 5`, '★ ★ ★ ★ ★', 'overall event rating', 'star', 'orange')}
      ${statCard('Session Usefulness', `${avgSessionRating} / 5`, 'Hydration & Nutrition', 'strategies and practices', 'spark', 'green')}
      ${statCard('Awaiting response', Math.max(0, registrations - feedbackCount).toLocaleString(), '', 'registered attendees', 'clock')}
    </section>

    <section class="feedback-layout">
      <div>
        <div class="toolbar">
          <div class="toolbar-group">
            <label class="search-field">
              <span class="search-icon">${icon('search')}</span>
              <input id="feedback-search" type="search" placeholder="Search participant or comment" value="${escapeHTML(feedbackSearch)}" aria-label="Search feedback" />
            </label>
            <label class="select-wrap">
              <select class="select-control" id="feedback-filter" aria-label="Filter feedback status">
                <option value="all" ${feedbackFilter === 'all' ? 'selected' : ''}>All statuses</option>
                <option value="received" ${feedbackFilter === 'received' ? 'selected' : ''}>Feedback received</option>
                <option value="pending" ${feedbackFilter === 'pending' ? 'selected' : ''}>Awaiting response</option>
              </select>
            </label>
          </div>
        </div>

        <section class="table-shell">
          <div class="table-scroll">
            <table>
              <thead>
                <tr><th>Participant</th><th>Team</th><th>Attendance</th><th>Submitted</th><th>Rating</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody id="feedback-rows">${feedbackRows()}</tbody>
            </table>
          </div>
          <div class="table-footer" id="feedback-table-footer">Showing ${filteredFeedbackAttendees().length} participants · ${feedbackCount.toLocaleString()} responses recorded in MySQL</div>
        </section>
      </div>

      <aside class="feedback-side-grid">
        <article class="panel">
          <div class="panel-header">
            <div><h2 class="panel-title">Rating Snapshot</h2><p class="panel-description">Live satisfaction breakdown</p></div>
            <span class="stat-icon orange">${icon('star')}</span>
          </div>
          <div class="panel-body">
            <div class="big-rating">${avgRating}<span style="font-size:13px;color:#85889c"> / 5.0</span></div>
            <div class="stars">★★★★★ <span class="small-muted" style="display:inline;margin-left:5px">${feedbackRecords.length} submissions</span></div>
            <div class="mini-divider"></div>
            <div class="feedback-breakdown">
              <div class="breakdown-row"><strong>5 ★</strong><span class="breakdown-track"><span style="width:75%"></span></span><span>75%</span></div>
              <div class="breakdown-row"><strong>4 ★</strong><span class="breakdown-track"><span style="width:25%"></span></span><span>25%</span></div>
              <div class="breakdown-row"><strong>3 ★</strong><span class="breakdown-track"><span style="width:0%"></span></span><span>0%</span></div>
            </div>
            <div class="feedback-callout">
              <h3>Issue E-Certificates</h3>
              <p>Gather feedback and preview or print high-res certificates on demand.</p>
              <button class="button button-primary" type="button" data-action="open-feedback-form">Open feedback form ${icon('arrow','button-icon')}</button>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div><h2 class="panel-title">Recent Comments</h2><p class="panel-description">Direct from participants</p></div>
          </div>
          <div class="panel-body">${recentMarkup}</div>
        </article>
      </aside>
    </section>
  </div>`;
}

// ----------------- MODALS & DIALOGS -----------------
window.closeModal = function() {
  const root = document.getElementById('dialog-root');
  if (root) root.innerHTML = '';
};

function openModal(content, isWide = false) {
  const root = document.getElementById('dialog-root');
  const wideClass = isWide ? ' wide' : '';
  root.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target === this) closeModal()">
      <div class="modal${wideClass}">
        ${content}
      </div>
    </div>
  `;
  const firstInput = root.querySelector('input:not([type="hidden"]), select, textarea, button');
  if (firstInput) window.setTimeout(() => firstInput.focus(), 60);
}

function openEditAttendeeModal(attendee) {
  if (!attendee) return;
  openModal(`
    <div class="modal-header">
      <div>
        <h2 class="modal-title">Edit Attendee Information</h2>
        <p class="modal-description">Update registration details for <strong>${escapeHTML(attendee.name)}</strong> (${escapeHTML(attendee.id)})</p>
      </div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <form data-form="edit-attendee">
      <input type="hidden" name="id" value="${escapeHTML(attendee.id)}" />
      <div class="modal-body">
        <div id="edit-form-error"></div>
        <div class="form-grid">
          <div class="form-field full">
            <label class="form-label">Full Name *</label>
            <input class="form-input" name="name" required value="${escapeHTML(attendee.name)}" placeholder="e.g. Dr. Siti Aminah" />
          </div>
          <div class="form-field full">
            <label class="form-label">Email Address</label>
            <input class="form-input" name="email" type="email" value="${escapeHTML(attendee.email || '')}" placeholder="name@example.com" />
          </div>
          <div class="form-field">
            <label class="form-label">Phone Number</label>
            <input class="form-input" name="phone" value="${escapeHTML(attendee.phone || '')}" placeholder="012-3456789" />
          </div>
          <div class="form-field">
            <label class="form-label">Category *</label>
            <select class="select-control form-input" name="category" required>
              <option value="Participant" ${attendee.category === 'Participant' ? 'selected' : ''}>Participant</option>
              <option value="Invited Guest" ${attendee.category === 'Invited Guest' || attendee.category === 'Invited Guest (VIP)' ? 'selected' : ''}>Invited Guest</option>
              <option value="Sponsor" ${attendee.category === 'Sponsor' ? 'selected' : ''}>Sponsor</option>
            </select>
          </div>
          <div class="form-field full">
            <label class="form-label">Institution / Organization</label>
            <input class="form-input" name="institution" value="${escapeHTML(attendee.institution || '')}" placeholder="e.g. UCSI University / ISN" />
          </div>
          <div class="form-field full">
            <label class="form-label">Assigned Team *</label>
            <select class="select-control form-input" name="team" required>
              <option value="TEAM-1" ${attendee.team === 'TEAM-1' ? 'selected' : ''}>Team Pink</option>
              <option value="TEAM-2" ${attendee.team === 'TEAM-2' ? 'selected' : ''}>Team Purple</option>
              <option value="TEAM-3" ${attendee.team === 'TEAM-3' ? 'selected' : ''}>Team Orange</option>
              <option value="TEAM-4" ${attendee.team === 'TEAM-4' ? 'selected' : ''}>Team Grey</option>
            </select>
          </div>
          <div class="form-field full">
            <label class="form-label">Remarks (In case someone replaces someone)</label>
            <textarea class="form-input" name="remarks" rows="2" style="resize:vertical;" placeholder="e.g. Replaced original attendee John Doe due to emergency">${escapeHTML(attendee.remarks || '')}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between;">
        <button class="button button-outline" type="button" onclick="closeModal()">Cancel</button>
        <button class="button button-primary" type="submit">Update Participant &rarr;</button>
      </div>
    </form>
  `);
}

function openDeleteConfirmationModal(attendee) {
  if (!attendee) return;
  openModal(`
    <div class="modal-header" style="border-bottom:1px solid #fee2e2;background:#fff5f5;">
      <div>
        <h2 class="modal-title" style="color:#b91c1c;">Confirm Delete Participant</h2>
        <p class="modal-description" style="color:#7f1d1d;">Permanent removal from event database</p>
      </div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="padding:24px 22px;">
      <div style="background:#fef2f2;border:1.5px solid #f87171;border-radius:10px;padding:16px 18px;margin-bottom:18px;">
        <p style="font-size:14px;color:#991b1b;font-weight:700;margin:0 0 6px;">
          Are you sure you want to delete the whole row of data?
        </p>
        <p style="font-size:12.5px;color:#7f1d1d;margin:0;">
          Participant: <strong>${escapeHTML(attendee.name)}</strong> (ID: <code>${escapeHTML(attendee.id)}</code>)<br />
          Assigned: <strong>${escapeHTML(attendee.teamName || attendee.team)}</strong> &bull; Phone: <strong>${escapeHTML(attendee.phone || 'N/A')}</strong>
        </p>
      </div>
      <p style="font-size:12px;color:#6b7280;margin:0;">
        ⚠️ This action will permanently remove this participant and any associated records from the MySQL database.
      </p>
    </div>
    <div class="modal-footer" style="background:#f9fafb;justify-content:flex-end;gap:10px;">
      <button class="button button-outline" type="button" onclick="closeModal()">No, Cancel</button>
      <button class="button" type="button" onclick="confirmDeleteAttendee('${escapeHTML(attendee.id)}')" style="background:#dc2626;color:#ffffff;border:none;min-height:38px;padding:0 20px;font-weight:800;border-radius:8px;cursor:pointer;">
        Yes, Delete
      </button>
    </div>
  `);
}

window.confirmDeleteAttendee = async function(id) {
  const res = await fetchAPI(`attendees.php?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ id })
  });

  if (res && res.success) {
    await loadInitialData();
    closeModal();
    toast(`Participant ${id} deleted successfully.`);
  } else {
    toast(`Error: ${res?.error || 'Failed to delete participant.'}`);
  }
};

function openAddAttendeeModal() {
  openModal(`
    <div class="modal-header">
      <div><h2 class="modal-title">Register Attendee</h2><p class="modal-description">Add a participant to the live MySQL database and assign a team.</p></div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <form data-form="attendee">
      <div class="modal-body">
        <div id="form-error"></div>
        <div class="form-grid">
          <div class="form-field full"><label class="form-label">Full Name *</label><input class="form-input" name="name" required placeholder="e.g. Dr. Siti Aminah" /></div>
          <div class="form-field full"><label class="form-label">Email Address *</label><input class="form-input" name="email" type="email" required placeholder="siti.aminah@example.com" /></div>
          <div class="form-field"><label class="form-label">Phone Number</label><input class="form-input" name="phone" placeholder="012-3456789" /></div>
          <div class="form-field"><label class="form-label">Category *</label>
            <select class="select-control form-input" name="category" required>
              <option value="Participant">Participant</option>
              <option value="Invited Guest">Invited Guest</option>
              <option value="Sponsor">Sponsor</option>
            </select>
          </div>
          <div class="form-field full"><label class="form-label">Assign Team *</label>
            <select class="select-control form-input" name="team" required>
              <option value="TEAM-1">Team Pink</option>
              <option value="TEAM-2">Team Purple</option>
              <option value="TEAM-3">Team Orange</option>
              <option value="TEAM-4">Team Grey</option>
            </select>
          </div>
          <div class="form-field full"><label class="form-label">Remarks (In case someone replaces someone)</label>
            <textarea class="form-input" name="remarks" rows="2" style="resize:vertical;" placeholder="e.g. Replaced original attendee John Doe due to emergency"></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="button button-outline" type="button" onclick="closeModal()">Cancel</button>
        <button class="button button-primary" type="submit">Save to MySQL Database</button>
      </div>
    </form>
  `);
}

function openCheckInDeskModal() {
  openModal(`
    <div class="modal-header">
      <div><h2 class="modal-title">Check-In Desk</h2><p class="modal-description">Lookup attendee by full name, phone number, or registration ID.</p></div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div id="scan-error"></div>
      
      <!-- Live search with distinct matching list -->
      <div class="autocomplete-wrap" style="position:relative;margin-bottom:16px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">Type Name or Phone Number to Search & Check In *</label>
        <div style="display:flex;gap:10px;">
          <input class="form-input" style="flex:1;" id="desk-search-input" placeholder="e.g. 013-8878990, 0138878990, or Name..." autocomplete="off" autofocus />
          <button class="button button-outline" type="button" onclick="document.getElementById('desk-search-input').value=''; filterDeskResults('');">Clear</button>
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:4px;">
          Supports phone numbers with dashes (<code>013-8878990</code>), without dashes (<code>0138878990</code>), or participant names.
        </div>
        <div id="desk-autocomplete-dropdown" class="autocomplete-list" style="display:none;max-height:260px;"></div>
      </div>
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px;">
        <h4 style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:0;">
          All Registrations (<span id="desk-results-count">${attendees.length}</span>)
        </h4>
        <span style="font-size:11px;color:#6b7280;">Click <strong>Check In</strong> to confirm arrival</span>
      </div>
      
      <div id="desk-lookup-results" style="max-height:240px;overflow-y:auto;border:1.5px solid var(--line);border-radius:10px;padding:6px 12px;background:#fafbfe;">
        ${renderDeskAttendeeList(attendees)}
      </div>
    </div>
    <div class="modal-footer">
      <button class="button button-outline" type="button" onclick="closeModal()">Close</button>
    </div>
  `, true);

  // Bind live debounce input for check-in desk
  const deskInput = document.getElementById('desk-search-input');
  const dropdown = document.getElementById('desk-autocomplete-dropdown');
  let deskTimer = null;

  deskInput.addEventListener('input', function() {
    const raw = this.value.trim().toLowerCase();
    const cleanDigits = raw.replace(/[^0-9]/g, '');
    clearTimeout(deskTimer);
    if (!raw) {
      dropdown.style.display = 'none';
      filterDeskResults('');
      return;
    }

    deskTimer = setTimeout(async () => {
      // Robust format-insensitive matching for name, phone, email, and ID
      const matches = attendees.filter(a => {
        const aPhoneDigits = String(a.phone || '').replace(/[^0-9]/g, '');
        const phoneMatch = cleanDigits.length >= 3 && aPhoneDigits.includes(cleanDigits);
        return phoneMatch ||
          a.name.toLowerCase().includes(raw) || 
          a.id.toLowerCase().includes(raw) || 
          a.email.toLowerCase().includes(raw) ||
          String(a.phone || '').toLowerCase().includes(raw);
      });

      filterDeskResults(raw);

      if (matches.length > 0) {
        dropdown.innerHTML = `
          <div style="padding:6px 12px;background:#f3f4f8;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:700;color:#4b5278;">
            CHOOSE ATTENDEE (${matches.length} matches):
          </div>
        ` + matches.map(a => `
          <div class="autocomplete-item" onclick="selectDeskAttendee('${a.id}')" style="padding:10px 14px;border-bottom:1px solid #f0f1f5;cursor:pointer;">
            <div>
              <strong style="color:var(--navy);font-size:13px;letter-spacing:.02em;">${a.name.toUpperCase()}</strong>
              <small style="color:#6b7280;font-size:11px;">Phone: <strong>${a.phone || 'N/A'}</strong> &bull; ${a.email} &bull; Reg ID: <strong>${a.id}</strong></small>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              ${teamBadge(a.team, a.teamName)}
              ${a.checkedIn 
                ? `<span class="status-badge checked"><span class="status-dot"></span>Checked In</span>` 
                : `<button class="button button-primary" type="button" style="min-height:28px;padding:0 10px;font-size:11px;">Check In</button>`}
            </div>
          </div>
        `).join('');
        dropdown.style.display = 'block';
      } else {
        dropdown.innerHTML = '<div style="padding:12px;font-size:12px;color:#7d8199;text-align:center;">No participant found matching "' + escapeHTML(raw) + '"</div>';
        dropdown.style.display = 'block';
      }
    }, 120);
  });
}

function renderDeskAttendeeList(list) {
  if (!list.length) return '<div class="no-results" style="padding:18px;">No participants match your search.</div>';
  return list.map(a => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);">
      <div class="person-cell">
        <span class="person-avatar">${escapeHTML(a.initials || initials(a.name))}</span>
        <span class="person-copy">
          <strong>${escapeHTML(a.name)}</strong>
          <small>Phone: <strong>${escapeHTML(a.phone || 'N/A')}</strong> &bull; ${escapeHTML(a.email)}</small>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${teamBadge(a.team, a.teamName)}
        ${a.checkedIn 
          ? `<span class="status-badge checked"><span class="status-dot"></span>Checked In</span>` 
          : `<button class="button button-primary" type="button" style="min-height:28px;padding:0 10px;font-size:11px;" onclick="directCheckIn('${a.id}')">Check In</button>`}
      </div>
    </div>
  `).join('');
}

window.filterDeskResults = function(query) {
  const container = document.getElementById('desk-lookup-results');
  const countSpan = document.getElementById('desk-results-count');
  if (!container) return;
  const cleanDigits = query.replace(/[^0-9]/g, '');
  const filtered = !query ? attendees : attendees.filter(a => {
    const aPhoneDigits = String(a.phone || '').replace(/[^0-9]/g, '');
    const phoneMatch = cleanDigits.length >= 3 && aPhoneDigits.includes(cleanDigits);
    return phoneMatch ||
      a.name.toLowerCase().includes(query) || 
      a.id.toLowerCase().includes(query) || 
      a.email.toLowerCase().includes(query) ||
      String(a.phone || '').toLowerCase().includes(query);
  });
  if (countSpan) countSpan.textContent = filtered.length;
  container.innerHTML = renderDeskAttendeeList(filtered);
};

window.selectDeskAttendee = async function(id) {
  const dropdown = document.getElementById('desk-autocomplete-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const attendee = attendees.find(a => a.id === id);
  if (attendee) {
    if (!attendee.checkedIn) {
      await directCheckIn(id);
    } else {
      openCheckInVerificationModal(attendee);
    }
  }
};

window.directCheckIn = async function(id) {
  const attendee = attendees.find(a => a.id === id);
  if (attendee) {
    await checkInAttendee(attendee);
    const updated = attendees.find(a => a.id === id) || attendee;
    openCheckInVerificationModal(updated);
  }
};

// Requirement 1: Huge Verification Popup Modal on Admin Check-In
function openCheckInVerificationModal(att) {
  let teamColor = '#8b5cf6';
  let teamBg = '#f5f3ff';
  if (att.team === 'TEAM-1') { teamColor = '#ec4899'; teamBg = '#fdf2F8'; }
  else if (att.team === 'TEAM-2') { teamColor = '#8b5cf6'; teamBg = '#f5f3ff'; }
  else if (att.team === 'TEAM-3') { teamColor = '#f97316'; teamBg = '#fff7ed'; }
  else if (att.team === 'TEAM-4') { teamColor = '#64748b'; teamBg = '#f8fafc'; }

  openModal(`
    <div class="modal-header" style="background:#11133f;color:#fff;border-bottom:3px solid var(--green);border-radius:14px 14px 0 0;padding:24px 28px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--green);color:#11133f;font-size:22px;font-weight:900;">
          ✓
        </span>
        <div>
          <h2 style="color:#ffffff;font-size:22px;margin:0 0 4px;font-family:'Manrope',sans-serif;font-weight:800;">
            Check-In Confirmed &bull; Verification Details
          </h2>
          <p style="color:#c5c8e4;font-size:12px;margin:0;">
            ISN Sports Nutrition Day 2026 Attendance Desk
          </p>
        </div>
      </div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModalAndResumeDesk()" style="background:rgba(255,255,255,.15);color:#fff;font-size:22px;width:38px;height:38px;">
        &times;
      </button>
    </div>

    <div class="modal-body" style="padding:28px 28px 24px;">
      <!-- Big Name Headline -->
      <div style="text-align:center;padding:12px 0 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;font-weight:800;letter-spacing:.1em;color:#64748b;text-transform:uppercase;">Verified Participant</span>
        <h1 style="color:var(--navy);font-size:28px;font-weight:900;margin:6px 0 10px;text-transform:uppercase;letter-spacing:.02em;">
          ${escapeHTML(att.name)}
        </h1>
        <div>
          <span class="team-pill" style="background:${teamBg};color:${teamColor};border:2px solid ${teamColor};font-size:14px;padding:6px 18px;font-weight:800;">
            <span class="team-pill-dot" style="background:${teamColor};width:10px;height:10px;"></span>
            ${escapeHTML(att.teamName || att.team)}
          </span>
        </div>
      </div>

      <!-- Detail Attribute Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px;">
        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Category / Role</div>
          <div style="font-size:15px;font-weight:700;color:var(--navy);">${escapeHTML(att.category)}</div>
        </div>

        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Registration ID</div>
          <div style="font-size:15px;font-weight:800;color:var(--navy);">${escapeHTML(att.id)}</div>
        </div>

        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Phone Number</div>
          <div style="font-size:15px;font-weight:800;color:#1e40af;">${escapeHTML(att.phone || 'N/A')}</div>
        </div>

        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 16px;">
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Arrival Check-In Date & Time</div>
          <div style="font-size:15px;font-weight:700;color:#15803d;">${escapeHTML(formatCheckedAt(att.checkedAt) || 'Recorded')}</div>
        </div>

        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 16px;grid-column:1/-1;">
          <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Email Address</div>
          <div style="font-size:15px;font-weight:700;color:var(--navy);">${escapeHTML(att.email)}</div>
        </div>
      </div>

      <!-- Action notice -->
      <div style="background:#f0faf2;border:1px solid #86efac;border-radius:10px;padding:12px 16px;margin-top:16px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">🏷️</span>
        <span style="font-size:12px;color:#166534;font-weight:600;">
          Please issue the attendee their <strong>Name Tag</strong> and <strong>${escapeHTML(att.teamName || 'Team')} Wristband</strong>.
        </span>
      </div>
    </div>

    <div class="modal-footer" style="padding:16px 28px;background:#f8fafc;justify-content:space-between;">
      <span style="font-size:12px;color:#64748b;">Close this popup before proceeding to check in another staff.</span>
      <button class="button button-primary" type="button" onclick="closeModalAndResumeDesk()" style="min-height:42px;padding:0 24px;font-size:13px;font-weight:800;">
        Close (X) &amp; Proceed &rarr;
      </button>
    </div>
  `, true);
}

window.closeModalAndResumeDesk = function() {
  closeModal();
  openCheckInDeskModal();
};

function openQRCodeModal(initialTab = 'checkin') {
  const host = window.location.host;
  const protocol = window.location.protocol;
  const rootPath = window.location.pathname.startsWith('/snd26') ? '/snd26/' : '/';
  const checkinUrl = `${protocol}//${host}${rootPath}checkin.html`;
  const feedbackUrl = `${protocol}//${host}${rootPath}feedback.html`;

  openModal(`
    <div class="modal-header">
      <div><h2 class="modal-title">Event QR Signage</h2><p class="modal-description">Print or display QR codes for attendee self check-in and session feedback.</p></div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="text-align:center;">
      <!-- Tab Switcher -->
      <div style="display:flex;justify-content:center;gap:10px;margin-bottom:18px;">
        <button type="button" id="tab-qr-checkin" class="button ${initialTab === 'checkin' ? 'button-primary' : 'button-outline'}" onclick="switchQRTab('checkin')">
          1. Self Check-In QR
        </button>
        <button type="button" id="tab-qr-feedback" class="button ${initialTab === 'feedback' ? 'button-primary' : 'button-outline'}" onclick="switchQRTab('feedback')">
          2. Feedback &amp; E-Cert QR
        </button>
      </div>

      <!-- QR Display Target -->
      <div id="qr-code-target" style="padding:15px;background:#fff;display:inline-block;"></div>
      <p style="margin:14px 0 6px;font-size:12px;color:var(--muted);" id="qr-url-label">Participant URL:</p>
      <code id="qr-url-code" style="background:#f4f5f8;padding:6px 12px;border-radius:6px;font-size:12px;color:var(--navy);display:inline-block;word-break:break-all;">
        ${initialTab === 'checkin' ? checkinUrl : feedbackUrl}
      </code>
      <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;">
        <a id="qr-open-link" href="${initialTab === 'checkin' ? checkinUrl : feedbackUrl}" target="_blank" class="button button-outline">Open Page ↗</a>
        <button class="button button-primary" type="button" onclick="window.print()">Print QR Standee</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="button button-outline" type="button" onclick="closeModal()">Done</button>
    </div>
  `);

  renderQRImage(initialTab === 'checkin' ? checkinUrl : feedbackUrl);
}

window.switchQRTab = function(tab) {
  const host = window.location.host;
  const protocol = window.location.protocol;
  const rootPath = window.location.pathname.startsWith('/snd26') ? '/snd26/' : '/';
  const checkinUrl = `${protocol}//${host}${rootPath}checkin.html`;
  const feedbackUrl = `${protocol}//${host}${rootPath}feedback.html`;
  const targetUrl = tab === 'checkin' ? checkinUrl : feedbackUrl;

  const btnCheckin = document.getElementById('tab-qr-checkin');
  const btnFeedback = document.getElementById('tab-qr-feedback');
  const urlCode = document.getElementById('qr-url-code');
  const openLink = document.getElementById('qr-open-link');

  if (tab === 'checkin') {
    btnCheckin.className = 'button button-primary';
    btnFeedback.className = 'button button-outline';
  } else {
    btnCheckin.className = 'button button-outline';
    btnFeedback.className = 'button button-primary';
  }

  if (urlCode) urlCode.textContent = targetUrl;
  if (openLink) openLink.href = targetUrl;

  renderQRImage(targetUrl);
};

function renderQRImage(url) {
  const target = document.getElementById('qr-code-target');
  if (!target) return;
  target.innerHTML = '';
  if (window.QRCode) {
    new QRCode(target, {
      text: url,
      width: 200,
      height: 200
    });
  } else {
    target.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" alt="QR" style="border-radius:8px;" />`;
  }
}

function openFeedbackFormModal() {
  openModal(`
    <div class="modal-header">
      <div><h2 class="modal-title">Workshop Feedback Evaluation</h2><p class="modal-description">Record participant workshop evaluation and issue official E-Certificate.</p></div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <form data-form="feedback">
      <div class="modal-body">
        <div id="feedback-error"></div>
        <div class="form-grid">
          <!-- Autocomplete Type & Select Participant -->
          <div class="form-field full autocomplete-wrap" style="position:relative;">
            <label class="form-label">Type &amp; Choose Participant *</label>
            <input type="text" id="feedback-modal-attendee-input" class="form-input" placeholder="Type participant name or phone..." autocomplete="off" required />
            <input type="hidden" id="feedback-modal-attendee-id" name="attendeeId" required />
            <div id="feedback-modal-autocomplete-dropdown" class="autocomplete-list" style="display:none;max-height:220px;"></div>
            <div id="feedback-modal-selected-badge" style="display:none;margin-top:8px;"></div>
          </div>

          <!-- Q1: Overall Experience -->
          <div class="form-field full" style="background:#fafbfe;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
            <label class="form-label" style="font-size:12px;color:var(--navy);margin-bottom:6px;display:block;">
              1) How would you rate your overall experience at the workshop? *
            </label>
            <div class="star-picker" data-group="q1_overall">
              ${[1,2,3,4,5].map(v => `<button type="button" class="star-choice ${v <= 5 ? 'selected' : ''}" data-action="pick-star" data-group="q1_overall" data-value="${v}">★</button>`).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;font-weight:700;">
              <span>1 – Very Poor</span><span id="caption-q1_overall" style="color:var(--navy);">5 – Excellent</span><span>5 – Excellent</span>
            </div>
            <input type="hidden" name="q1_overall" value="5" />
          </div>

          <!-- Q2: Hydration Understanding -->
          <div class="form-field full" style="background:#fafbfe;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
            <label class="form-label" style="font-size:12px;color:var(--navy);margin-bottom:6px;display:block;">
              2) To what extent did the workshop improve your understanding of hydration assessment and planning for athletes? *
            </label>
            <div class="star-picker" data-group="q2_hydration">
              ${[1,2,3,4,5].map(v => `<button type="button" class="star-choice ${v <= 5 ? 'selected' : ''}" data-action="pick-star" data-group="q2_hydration" data-value="${v}">★</button>`).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;font-weight:700;">
              <span>1 – Not at all</span><span id="caption-q2_hydration" style="color:var(--navy);">5 – To a great extent</span><span>5 – To a great extent</span>
            </div>
            <input type="hidden" name="q2_hydration" value="5" />
          </div>

          <!-- Q3: Station Learning Activities -->
          <div class="form-field full" style="background:#fafbfe;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
            <label class="form-label" style="font-size:12px;color:var(--navy);margin-bottom:6px;display:block;">
              3) How would you rate the learning activities at each station, including demonstrations, case studies and practical tasks? *
            </label>
            <div class="star-picker" data-group="q3_stations">
              ${[1,2,3,4,5].map(v => `<button type="button" class="star-choice ${v <= 5 ? 'selected' : ''}" data-action="pick-star" data-group="q3_stations" data-value="${v}">★</button>`).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;font-weight:700;">
              <span>1 – Very Poor</span><span id="caption-q3_stations" style="color:var(--navy);">5 – Excellent</span><span>5 – Excellent</span>
            </div>
            <input type="hidden" name="q3_stations" value="5" />
          </div>

          <!-- Q4: Valuable -->
          <div class="form-field full">
            <label class="form-label">4) What did you find most valuable or enjoyable about the workshop?</label>
            <textarea class="form-input" name="q4_valuable" rows="2" maxlength="600" placeholder="Key takeaways, practical stations..."></textarea>
          </div>

          <!-- Q5: Suggestions -->
          <div class="form-field full">
            <label class="form-label">5) Do you have any suggestions for improving future workshops? 😊</label>
            <textarea class="form-input" name="q5_suggestions" rows="2" maxlength="600" placeholder="Future topics, recommendations..."></textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="button button-outline" type="button" onclick="closeModal()">Cancel</button>
        <button class="button button-primary" type="submit">Submit & Generate E-Certificate ${icon('spark','button-icon')}</button>
      </div>
    </form>
  `, true);

  // Bind live autocomplete search inside modal
  const input = document.getElementById('feedback-modal-attendee-input');
  const hiddenId = document.getElementById('feedback-modal-attendee-id');
  const dropdown = document.getElementById('feedback-modal-autocomplete-dropdown');
  const badgeContainer = document.getElementById('feedback-modal-selected-badge');
  let modalTimer = null;

  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    clearTimeout(modalTimer);
    if (!q) {
      dropdown.style.display = 'none';
      return;
    }

    modalTimer = setTimeout(() => {
      const matches = attendees.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.id.toLowerCase().includes(q) || 
        a.email.toLowerCase().includes(q) ||
        String(a.phone || '').includes(q)
      );

      if (matches.length > 0) {
        dropdown.innerHTML = `
          <div style="padding:6px 12px;background:#f3f4f8;border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:700;color:#4b5278;">
            CHOOSE PARTICIPANT (${matches.length} matches):
          </div>
        ` + matches.map(a => `
          <div class="autocomplete-item" onclick="selectFeedbackModalAttendee('${a.id}')" style="padding:10px 14px;border-bottom:1px solid #f0f1f5;cursor:pointer;">
            <div>
              <strong style="color:var(--navy);font-size:13px;">${a.name.toUpperCase()}</strong>
              <small style="color:#6b7280;font-size:11px;">
                ${a.institution ? a.institution + ' &bull; ' : ''}Phone: <strong>${a.phone || 'N/A'}</strong> &bull; ${a.id}
              </small>
            </div>
            <div>${teamBadge(a.team, a.teamName)}</div>
          </div>
        `).join('');
        dropdown.style.display = 'block';
      } else {
        dropdown.innerHTML = '<div style="padding:12px;font-size:12px;color:#7d8199;text-align:center;">No participant found matching "' + escapeHTML(q) + '"</div>';
        dropdown.style.display = 'block';
      }
    }, 120);
  });
}

window.selectFeedbackModalAttendee = function(id) {
  const attendee = attendees.find(a => a.id === id);
  const input = document.getElementById('feedback-modal-attendee-input');
  const hiddenId = document.getElementById('feedback-modal-attendee-id');
  const dropdown = document.getElementById('feedback-modal-autocomplete-dropdown');
  const badgeContainer = document.getElementById('feedback-modal-selected-badge');

  if (attendee && input && hiddenId) {
    hiddenId.value = attendee.id;
    input.value = attendee.name;
    if (dropdown) dropdown.style.display = 'none';

    if (badgeContainer) {
      badgeContainer.innerHTML = `
        <div class="attendee-badge-selected" style="background:#f0faf2;border:1.5px solid #1fd75a;border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong style="color:var(--navy);font-size:13px;display:block;">${escapeHTML(attendee.name)}</strong>
            <small style="color:#575b77;">${escapeHTML(attendee.email)} &bull; ${escapeHTML(attendee.id)} &bull; ${escapeHTML(attendee.category)}</small>
          </div>
          <span class="team-pill" style="background:#eaf8ed;color:#13ae48;font-size:10px;font-weight:700;">Verified</span>
        </div>
      `;
      badgeContainer.style.display = 'block';
    }
  }
};

// ----------------- E-CERTIFICATE DISPLAY MODAL -----------------
function openCertificateModal(attendee, feedback) {
  const certUrl = `cert_generator.php?name=${encodeURIComponent(attendee.name)}`;
  const downloadUrl = (feedback && feedback.certUrl) ? feedback.certUrl : certUrl;
  
  openModal(`
    <div class="modal-header" style="border-bottom:0;padding-bottom:0;">
      <div>
        <h2 class="modal-title" style="margin-bottom:4px;">Official Certificate Preview</h2>
        <p class="modal-description" style="margin:0;">ISN Sports Nutrition Day 2026 Certificate &bull; <strong>${escapeHTML(attendee.name)}</strong></p>
      </div>
      <button class="modal-close" type="button" aria-label="Close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body" style="padding:16px 20px;">
      <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12px;color:#1e40af;display:flex;justify-content:space-between;align-items:center;">
        <span>Recipient: <strong>${escapeHTML(attendee.name)}</strong> (${escapeHTML(attendee.id)}) &bull; Signed by DR VELLAPANDIAN A/L PONNUSAMY</span>
        <a href="${certUrl}" target="_blank" download="Certificate_${escapeHTML(attendee.id)}.pdf" class="button button-primary" style="min-height:28px;padding:2px 10px;font-size:11px;">Open in New Tab ↗</a>
      </div>
      <div style="width:100%;height:580px;border:1px solid var(--border-color);border-radius:8px;overflow:hidden;background:#525659;">
        <iframe src="${certUrl}" style="width:100%;height:100%;border:none;" title="Certificate PDF Preview"></iframe>
      </div>
      <div class="cert-actions" style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">
        <a href="${certUrl}" target="_blank" download="Certificate_${escapeHTML(attendee.id)}.pdf" class="button button-primary" style="display:inline-flex;align-items:center;gap:6px;">${icon('download','button-icon')}Download Official PDF</a>
        <button class="button button-outline" type="button" onclick="closeModal()">Close</button>
      </div>
    </div>
  `, true);
}

// ----------------- EVENT DISPATCHERS & HANDLERS -----------------
function navigate(page) {
  activePage = page;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function checkInAttendee(attendee) {
  const res = await fetchAPI('checkin.php', {
    method: 'POST',
    body: JSON.stringify({ id: attendee.id, action: 'checkin' })
  });
  if (res && res.success) {
    await loadInitialData();
    toast(`${attendee.name} checked in successfully.`);
  }
}

async function undoCheckIn(attendee) {
  const res = await fetchAPI('checkin.php', {
    method: 'POST',
    body: JSON.stringify({ id: attendee.id, action: 'undo' })
  });
  if (res && res.success) {
    await loadInitialData();
    toast(`Check-in undone for ${attendee.name}.`);
  }
}

window.reassignTeam = async function(attendeeId, newTeamId) {
  const res = await fetchAPI('teams.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'reassign', attendeeId, teamId: newTeamId })
  });
  if (res && res.success) {
    await loadInitialData();
    toast(`Reassigned to ${newTeamId}`);
  }
};

async function autoBalanceTeams() {
  const res = await fetchAPI('teams.php', {
    method: 'POST',
    body: JSON.stringify({ action: 'autobalance' })
  });
  if (res && res.success) {
    await loadInitialData();
    toast('Participants evenly distributed across 4 teams!');
  }
}

function exportCSV(filename, rows) {
  const processRow = (row) => row.map((val) => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(processRow).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast(`Exported ${filename}`);
}

async function handleClick(event) {
  const nav = event.target.closest('[data-nav]');
  if (nav) {
    event.preventDefault();
    navigate(nav.dataset.nav);
    return;
  }

  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  const action = trigger.dataset.action;

  if (action === 'create-attendee') openAddAttendeeModal();
  if (action === 'scan-checkin') openCheckInDeskModal();
  if (action === 'open-feedback-form') openFeedbackFormModal();
  if (action === 'show-qr') openQRCodeModal();
  if (action === 'close-modal' || action === 'backdrop-close') closeModal();
  if (action === 'autobalance-teams') autoBalanceTeams();

  if (action === 'toggle-checkin') {
    event.stopPropagation();
    const id = trigger.dataset.id;
    const attendee = attendees.find((a) => a.id === id);
    if (!attendee) return;
    if (attendee.checkedIn) await undoCheckIn(attendee);
    else await checkInAttendee(attendee);
    return;
  }

  if (action === 'delete-attendee-row') {
    event.stopPropagation();
    const id = trigger.dataset.id;
    const attendee = attendees.find((a) => a.id === id);
    if (attendee) openDeleteConfirmationModal(attendee);
    return;
  }

  if (action === 'preview-cert' || action === 'view-feedback') {
    const id = trigger.dataset.id;
    const attendee = attendees.find((a) => a.id === id);
    const feedback = feedbackFor(id);
    if (attendee) openCertificateModal(attendee, feedback);
    return;
  }

  if (action === 'edit-attendee-row') {
    // If the click happened on or inside a button, do not open the edit modal
    if (event.target.closest('button')) return;
    const id = trigger.dataset.id;
    const attendee = attendees.find((a) => a.id === id);
    if (attendee) openEditAttendeeModal(attendee);
    return;
  }

  if (action === 'remind-feedback') {
    const id = trigger.dataset.id;
    const attendee = attendees.find((a) => a.id === id);
    toast(`Reminder notification queued for ${attendee.name} (${attendee.email})`);
  }

  if (action === 'pick-star') {
    const group = trigger.dataset.group;
    const val = Number(trigger.dataset.value);
    const picker = trigger.closest('.star-picker');
    picker.querySelectorAll('.star-choice').forEach((b) => b.classList.toggle('selected', Number(b.dataset.value) <= val));
    picker.parentElement.querySelector(`input[name="${group}"]`).value = String(val);
  }

  if (action === 'export-attendees') {
    const header = ['ID', 'Full Name', 'Phone', 'Institution', 'Email', 'Category', 'Remarks', 'Team ID', 'Team Name', 'Checked In', 'Check In Date & Time', 'Registration Date'];
    const data = attendees.map(a => [a.id, a.name, a.phone || '', a.institution || '', a.email, a.category, a.remarks || '', a.team, a.teamName, a.checkedIn ? 'Yes' : 'No', formatCheckedAt(a.checkedAt), a.registered]);
    exportCSV('ISN_SND26_Attendees_MySQL.csv', [header, ...data]);
  }

  if (action === 'export-feedback') {
    const header = ['Feedback ID', 'Attendee ID', 'Name', 'Category', 'Institution', 'Phone', 'Email', 'Team', 'Q1 Overall Experience (1-5)', 'Q2 Hydration Understanding (1-5)', 'Q3 Station Activities (1-5)', 'Q4 Most Valuable / Enjoyable', 'Q5 Future Suggestions', 'Submitted Date'];
    const data = feedbackRecords.map(f => [
      f.id, 
      f.attendeeId, 
      f.label, 
      f.category || '', 
      f.institution || '', 
      f.phone || '', 
      f.email || '', 
      f.teamName, 
      f.q1_overall || f.rating || 5, 
      f.q2_hydration || f.sessionRating || 5, 
      f.q3_stations || 5, 
      f.q4_valuable || f.comment || '', 
      f.q5_suggestions || '', 
      f.date
    ]);
    exportCSV('ISN_SND26_Feedback_Responses_MySQL.csv', [header, ...data]);
  }

  if (action === 'notifications') toast('Live MySQL database connected. All tables synchronized.');
  if (action === 'help') toast('ISN Sports Nutrition Day 2026 Admin Desk Support');
}

async function handleSubmit(event) {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);

  if (form.dataset.form === 'attendee') {
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const category = String(formData.get('category') || 'Participant').trim();
    const remarks = String(formData.get('remarks') || '').trim();
    const team = String(formData.get('team') || 'TEAM-1').trim();

    const res = await fetchAPI('attendees.php', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, category, remarks, team })
    });

    if (res && res.success) {
      await loadInitialData();
      closeModal();
      navigate('attendance');
      toast(`${name} registered successfully to ${res.data.team}!`);
    } else {
      document.getElementById('form-error').innerHTML = `<div class="form-error">${res?.error || 'Failed to save attendee.'}</div>`;
    }
  }

  if (form.dataset.form === 'edit-attendee') {
    const id = String(formData.get('id') || '').trim();
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const category = String(formData.get('category') || 'Participant').trim();
    const institution = String(formData.get('institution') || '').trim();
    const remarks = String(formData.get('remarks') || '').trim();
    const team = String(formData.get('team') || 'TEAM-1').trim();

    const res = await fetchAPI('attendees.php', {
      method: 'PUT',
      body: JSON.stringify({ id, name, email, phone, category, institution, remarks, team })
    });

    if (res && res.success) {
      await loadInitialData();
      closeModal();
      toast(`Updated participant ${name} (${id})`);
    } else {
      const errBox = document.getElementById('edit-form-error');
      if (errBox) errBox.innerHTML = `<div class="form-error">${res?.error || 'Failed to update attendee.'}</div>`;
    }
  }

  if (form.dataset.form === 'scan') {
    const query = String(formData.get('query') || '').trim().toLowerCase();
    const attendee = attendees.find((p) => 
      p.id.toLowerCase() === query || 
      p.email.toLowerCase() === query ||
      p.name.toLowerCase().includes(query)
    );
    const error = document.getElementById('scan-error');
    if (!attendee) {
      error.innerHTML = '<div class="form-error">No participant found. Check the ID, name, or email.</div>';
      return;
    }
    if (attendee.checkedIn) {
      error.innerHTML = `<div class="form-error" style="background:#f2f5fb;color:#5d6384">${escapeHTML(attendee.name)} is already checked in.</div>`;
      return;
    }
    await checkInAttendee(attendee);
    closeModal();
    toast(`✓ ${attendee.name} checked in successfully!`);
  }

  if (form.dataset.form === 'feedback') {
    const attendeeId = String(formData.get('attendeeId') || '');
    const q1_overall = Number(formData.get('q1_overall') || 5);
    const q2_hydration = Number(formData.get('q2_hydration') || 5);
    const q3_stations = Number(formData.get('q3_stations') || 5);
    const q4_valuable = String(formData.get('q4_valuable') || '').trim();
    const q5_suggestions = String(formData.get('q5_suggestions') || '').trim();

    if (!attendeeId) {
      document.getElementById('feedback-error').innerHTML = '<div class="form-error">Please select and verify a participant first.</div>';
      return;
    }

    const res = await fetchAPI('feedback.php', {
      method: 'POST',
      body: JSON.stringify({ 
        attendeeId, 
        q1_overall, 
        q2_hydration, 
        q3_stations, 
        q4_valuable, 
        q5_suggestions,
        // Backward-compatibility aliases
        rating: q1_overall,
        sessionRating: q2_hydration,
        comment: q4_valuable || q5_suggestions || 'Workshop Completed'
      })
    });

    if (res && res.success) {
      await loadInitialData();
      closeModal();
      const attendee = attendees.find((a) => a.id === attendeeId) || (res.data && res.data.attendee);
      openCertificateModal(attendee, res.data);
      toast('Feedback recorded! Official E-Certificate generated.');
    } else {
      document.getElementById('feedback-error').innerHTML = `<div class="form-error">${res?.error || 'Failed to record feedback.'}</div>`;
    }
  }
}

function handleInput(event) {
  if (event.target.id === 'attendee-search') {
    attendeeSearch = event.target.value;
    updateAttendeeRows();
  }
  if (event.target.id === 'team-search') {
    teamSearch = event.target.value;
    updateTeamMemberRows();
  }
  if (event.target.id === 'feedback-search') {
    feedbackSearch = event.target.value;
    updateFeedbackRows();
  }
}

function handleChange(event) {
  if (event.target.id === 'attendance-category-filter') {
    attendanceCategoryFilter = event.target.value;
    render();
  }
  if (event.target.id === 'attendee-filter') {
    attendeeFilter = event.target.value;
    updateAttendeeRows();
  }
  if (event.target.id === 'attendee-team-filter') {
    attendeeTeamFilter = event.target.value;
    updateAttendeeRows();
  }
  if (event.target.id === 'team-filter-select') {
    teamFilter = event.target.value;
    updateTeamMemberRows();
  }
  if (event.target.id === 'team-attendance-filter-select') {
    teamAttendanceFilter = event.target.value;
    updateTeamMemberRows();
  }
  if (event.target.id === 'feedback-filter') {
    feedbackFilter = event.target.value;
    updateFeedbackRows();
  }
}

function render() {
  const container = document.getElementById('page-content');
  document.querySelectorAll('[data-nav]').forEach((element) => {
    if (element.classList.contains('nav-item')) {
      const active = element.dataset.nav === activePage;
      element.classList.toggle('active', active);
      if (active) element.setAttribute('aria-current', 'page');
      else element.removeAttribute('aria-current');
    }
  });
  document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });

  const sectionTitles = {
    overview: 'Overview',
    attendance: 'Attendance',
    teams: 'Teams (4)',
    feedback: 'Feedback & E-Cert'
  };
  document.getElementById('topbar-section').textContent = sectionTitles[activePage] || 'Overview';
  document.getElementById('nav-attendee-count').textContent = registrations.toLocaleString();

  if (activePage === 'attendance') container.innerHTML = renderAttendance();
  else if (activePage === 'teams') container.innerHTML = renderTeams();
  else if (activePage === 'feedback') container.innerHTML = renderFeedback();
  else container.innerHTML = renderOverview();
}

document.addEventListener('click', handleClick);
document.addEventListener('submit', handleSubmit);
document.addEventListener('input', handleInput);
document.addEventListener('change', handleChange);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

// Boot application
loadInitialData();

// Real-time background sync every 5 seconds (safely supports 6+ simultaneous admins)
setInterval(() => {
  loadInitialData(true);
}, 5000);

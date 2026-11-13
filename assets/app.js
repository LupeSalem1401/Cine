(function () {
  'use strict';

  var STORAGE_TICKETS = 'cineastra_ticket_ids';
  var STORAGE_USER = 'cineastra_user';
  var ADMIN_EMAIL = '2511130208@undc.edu.pe';

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(v) {
    var n = Number(v);
    if (!isFinite(n)) n = Number(typeof TICKET_PRICE !== 'undefined' ? TICKET_PRICE : 0) || 0;
    return '$' + n.toFixed(2);
  }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&').replace(/</g, '<')
      .replace(/>/g, '>').replace(/"/g, '"');
  }

  function getCurrentUser() {
    try {
      var raw = localStorage.getItem(STORAGE_USER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function setCurrentUser(user) {
    try {
      if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_USER);
    } catch (e) {}
  }

  function isAdmin(user) {
    return !!user && (user.role === 'admin' || user.email === ADMIN_EMAIL);
  }

  function isRegularUser(user) {
    return !!user && !isAdmin(user);
  }

  function requireAuth(redirectTo) {
    var user = getCurrentUser();
    if (!user) {
      location.href = 'login.html' + (redirectTo ? '?redirect=' + encodeURIComponent(redirectTo) : '');
      return false;
    }
    return user;
  }

  function requireAdmin() {
    var user = requireAuth();
    if (user && !isAdmin(user)) {
      location.href = 'index.html';
      return false;
    }
    return user;
  }

  function renderNavbarUser() {
    var userEl = qs('#navbar-user');
    if (!userEl) return;
    var user = getCurrentUser();
    if (!user) {
      userEl.innerHTML = '<a class="btn btn--ghost btn--sm" href="login.html">Iniciar sesión</a>';
      return;
    }
    var roleBadge = isAdmin(user) ? '<span class="badge" style="background:#ef4444;color:white;margin-left:8px;font-size:11px;">ADMIN</span>' : '';
    var dashboardLink = isAdmin(user) ? '<a class="nav-link" href="admin.html">Panel Admin</a>' : '<a class="nav-link" href="mis-entradas.html">Mis entradas</a>';
    userEl.innerHTML =
      '<div class="navbar__user-menu">' +
        '<span class="navbar__user-name" style="margin-right:12px;">' + esc(user.nombre) + roleBadge + '</span>' +
        dashboardLink +
        '<button class="btn btn--ghost btn--sm" id="btn-logout" style="margin-left:12px;">Salir</button>' +
      '</div>';
    var logoutBtn = qs('#btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        setCurrentUser(null);
        location.href = 'index.html';
      });
    }
  }

  function handleLoginForm() {
    var form = qs('#login-form');
    if (!form) return;
    var errorEl = qs('#login-error');
    var errorMsg = qs('#error-message');
    var btn = qs('#login-btn');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorEl) errorEl.style.display = 'none';
      if (btn) { btn.disabled = true; btn.textContent = 'Ingresando...'; }

      var nombre = form.nombre.value.trim();
      var edad = parseInt(form.edad.value, 10);
      var email = form.email.value.trim().toLowerCase();

      if (!nombre || !edad || !email) {
        if (errorMsg) errorMsg.textContent = 'Completa todos los campos';
        if (errorEl) errorEl.style.display = 'block';
        if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
        return;
      }

      var role = email === ADMIN_EMAIL ? 'admin' : 'user';
      var user = { nombre: nombre, edad: edad, email: email, role: role };
      setCurrentUser(user);

      var redirect = param('redirect') || (isAdmin(user) ? 'admin.html' : 'mis-entradas.html');
      location.href = redirect;
    });
  }

  function initAuth() {
    renderNavbarUser();
    handleLoginForm();

    var protectedPages = ['mis-entradas.html', 'asientos.html'];
    var currentPage = location.pathname.split('/').pop() || 'index.html';
    if (protectedPages.includes(currentPage)) {
      requireAuth(currentPage);
    }
    if (currentPage === 'admin.html') {
      requireAdmin();
    }
  }

  function showConfigWarning() {
    var el = qs('[data-config-warning]');
    if (!el) return;
    if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured) return;
    el.innerHTML =
      '<div class="empty-state" style="margin-bottom:18px;text-align:left">' +
      '<h3>Falta configurar Supabase</h3>' +
      '<p>Edita <code>simple/assets/config.js</code> y pega tu <strong>Project URL</strong> y <strong>anon key</strong> (Supabase → Project Settings → API). ' +
      'Nunca uses la clave <code>service_role</code> en el navegador. Luego abre esta carpeta con un servidor local (ej. <code>npx serve simple</code>).</p>' +
      '</div>';
  }

  function showError(target, message) {
    var el = typeof target === 'string' ? qs(target) : target;
    if (!el) return;
    el.innerHTML = '<div class="empty-state"><h3>Ocurrió un error</h3><p>' + esc(message) + '</p></div>';
  }

  function ensureDb() {
    if (typeof db !== 'undefined' && db) return db;
    throw new Error('Supabase no está configurado. Revisa simple/assets/config.js y recarga la página desde un servidor local.');
  }

  function ticketPrice() {
    return Number(typeof TICKET_PRICE !== 'undefined' ? TICKET_PRICE : 8.5) || 8.5;
  }

  function getStoredTicketIds() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_TICKETS) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(function (x) { return Number(x); }).filter(function (x) { return !!x; });
    } catch (e) { return []; }
  }
  function rememberTicketIds(ids) {
    try {
      var set = {};
      getStoredTicketIds().concat(ids || []).forEach(function (id) { if (id) set[Number(id)] = 1; });
      localStorage.setItem(STORAGE_TICKETS, JSON.stringify(Object.keys(set).map(Number)));
    } catch (e) {}
  }

  var POSTERS = {
    'dune: parte dos': 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    'oppenheimer': 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    'the batman': 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    'spider-man: across the spider-verse': 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
    'interstellar': 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    'deadpool & wolverine': 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg'
  };

  function getPoster(titulo) {
    var key = String(titulo || '').trim().toLowerCase();
    if (POSTERS[key]) return POSTERS[key];
    for (var k in POSTERS) {
      if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) return POSTERS[k];
    }
    return '';
  }

  function posterMedia(titulo, large) {
    var url = getPoster(titulo);
    if (url) {
      return '<img src="' + esc(url) + '" alt="' + esc(titulo || 'Película') + '" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">';
    }
    var initial = esc((titulo || 'C').charAt(0).toUpperCase());
    var size = large ? '72px' : '48px';
    return '<div style="display:grid;place-items:center;height:100%;min-height:' + (large ? '360px' : '180px') + ';background:#16161e;color:#6f6f7f;font-family:var(--font-display);font-size:' + size + '">' + initial + '</div>';
  }

  function cardHtml(m) {
    return '<a class="movie-card" href="pelicula.html?id=' + m.id + '">' +
      '<div class="movie-card__media">' + posterMedia(m.titulo) +
      '<div class="movie-card__shade ' + (getPoster(m.titulo) ? '' : 'movie-card__shade--soft') + '"></div>' +
      '<span class="badge badge--rating">' + esc(m.clasificacion || 'NR') + '</span>' +
      '<div class="movie-card__hover"><span class="movie-card__hover-icon">▶</span>Ver funciones</div></div>' +
      '<div class="movie-card__body"><div class="movie-card__title-row"><h3>' + esc(m.titulo || 'Película') + '</h3><span>↗</span></div>' +
      '<p class="movie-card__genres">' + esc(m.genero || 'Cine') + '</p>' +
      '<div class="movie-card__meta"><span>' + (m.duracion ? esc(m.duracion) + ' min' : '—') + '</span><span>' + esc(m.clasificacion || 'NR') + '</span></div>' +
      '<span class="movie-card__cta">Ver funciones</span></div></a>';
  }

  async function fetchPeliculas() {
    var client = ensureDb();
    var res = await client.from('pelicula').select('*').order('id', { ascending: true });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function renderCarteleraGrids() {
    var grids = ['[data-home-grid]', '[data-cartelera-grid]'].map(function (s) { return qs(s); }).filter(Boolean);
    if (!grids.length) return;
    try {
      var peliculas = await fetchPeliculas();
      var html = peliculas.length ? peliculas.map(cardHtml).join('') : '<div class="empty-state"><h3>No hay películas</h3><p>Inserta registros en la tabla <code>pelicula</code> desde Supabase.</p></div>';
      grids.forEach(function (g) { g.innerHTML = html; });
    } catch (e) {
      grids.forEach(function (g) { showError(g, e.message || e); });
    }
  }

  function renderProximos() {
    var g = qs('[data-proximos-grid]');
    if (!g) return;
    g.innerHTML = '<div class="empty-state"><h3>Sin próximos estrenos</h3><p>Tu esquema no incluye estado/fecha de estreno. Esta sección queda disponible si agregas esos campos.</p></div>';
  }

  async function renderPelicula() {
    var root = qs('[data-pelicula]');
    if (!root) return;
    var id = param('id');
    if (!id) { showError('[data-funciones]', 'Falta el parámetro id de la película.'); return; }
    try {
      var client = ensureDb();
      var pRes = await client.from('pelicula').select('*').eq('id', id).maybeSingle();
      if (pRes.error) throw pRes.error;
      var m = pRes.data;
      if (!m) { showError('[data-funciones]', 'Película no encontrada.'); return; }

      var t = qs('[data-title]', root); if (t) t.textContent = m.titulo || 'Película';
      var meta = qs('[data-meta]', root); if (meta) meta.textContent = (m.clasificacion || 'NR') + ' · ' + (m.duracion ? m.duracion + ' min' : '—') + ' · ' + (m.genero || 'Cine');
      var syn = qs('[data-synopsis]', root); if (syn) syn.textContent = 'Sin sinopsis (tu tabla pelicula no tiene este campo).';
      var posterBox = qs('[data-poster-box]', root);
      if (posterBox) {
        var pUrl = getPoster(m.titulo);
        if (pUrl) {
          posterBox.innerHTML = '<img src="' + esc(pUrl) + '" alt="' + esc(m.titulo || 'Película') + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:16px">';
          posterBox.style.background = 'transparent';
        } else {
          posterBox.textContent = (m.titulo || 'C').charAt(0).toUpperCase();
        }
      }

      var fRes = await client.from('funcion')
        .select('*, sala(*)')
        .eq('pelicula_id', id)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true });
      if (fRes.error) throw fRes.error;
      var funciones = fRes.data || [];

      var today = new Date().toISOString().slice(0, 10);
      var upcoming = funciones.filter(function (f) { return String(f.fecha) >= today; });
      if (!upcoming.length) upcoming = funciones;

      var list = qs('[data-funciones]', root);
      if (!upcoming.length) {
        list.innerHTML = '<div class="empty-state"><h3>No hay funciones disponibles</h3><p>Inserta registros en la tabla <code>funcion</code> para esta película.</p></div>';
        return;
      }
      list.innerHTML = upcoming.map(function (f) {
        var sala = f.sala || {};
        var salaName = sala.numero != null ? ('Sala ' + sala.numero) : ('Sala ' + (f.sala_id || ''));
        var hora = String(f.hora || '').slice(0, 5);
        return '<a class="function-card" href="asientos.html?funcion=' + f.id + '">' +
          '<div class="function-card__time"><strong>' + esc(hora) + '</strong><span>' + esc(f.fecha) + '</span></div>' +
          '<div class="function-card__info"><h3>' + esc(salaName) + '</h3><p>Capacidad: ' + esc(sala.capacidad || '—') + '</p></div>' +
          '<div class="function-card__price"><span>Entrada</span><strong>' + money(ticketPrice()) + '</strong></div>' +
          '<span class="function-card__arrow">→</span></a>';
      }).join('');
    } catch (e) {
      showError('[data-funciones]', e.message || e);
    }
  }

  function rowLabel(i) { var n = i, l = ''; do { l = String.fromCharCode(65 + (n % 26)) + l; n = Math.floor(n / 26) - 1; } while (n >= 0); return l; }

  function seatLayout(capacidad) {
    var cap = Number(capacidad) || 0;
    if (cap <= 0) cap = 96;
    var cols = Math.min(14, Math.max(6, Math.ceil(Math.sqrt(cap))));
    var rows = Math.max(1, Math.ceil(cap / cols));
    return { rows: rows, cols: cols, cap: cap };
  }

  async function renderAsientos() {
    var root = qs('[data-asientos]');
    if (!root) return;
    var id = param('funcion');
    if (!id) { showError('[data-seat-map]', 'Falta el parámetro funcion.'); return; }
    try {
      var client = ensureDb();
      var fRes = await client.from('funcion')
        .select('*, pelicula(*), sala(*)')
        .eq('id', id)
        .maybeSingle();
      if (fRes.error) throw fRes.error;
      var fn = fRes.data;
      if (!fn) { showError('[data-seat-map]', 'Función no encontrada.'); return; }

      var movie = fn.pelicula || {};
      var sala = fn.sala || {};
      var salaName = sala.numero != null ? ('Sala ' + sala.numero) : ('Sala ' + (fn.sala_id || ''));
      var hora = String(fn.hora || '').slice(0, 5);
      var price = ticketPrice();

      var title = qs('[data-fn-title]', root); if (title) title.textContent = movie.titulo || 'Elegí tus asientos';
      var info = qs('[data-fn-info]', root); if (info) info.textContent = (fn.fecha || '') + ' · ' + hora + ' · ' + salaName;
      var priceEl = qs('[data-fn-price]', root); if (priceEl) priceEl.textContent = money(price);

      var tRes = await client.from('ticket').select('asiento').eq('funcion_id', id);
      if (tRes.error) throw tRes.error;
      var occupied = {};
      (tRes.data || []).forEach(function (t) { if (t.asiento) occupied[String(t.asiento)] = 1; });

      var layout = seatLayout(sala.capacidad);
      var selected = {};
      var map = qs('[data-seat-map]', root);
      var selOut = qs('[data-selected]', root);
      var cnt = qs('[data-count]', root);
      var tot = qs('[data-total]', root);
      var ok = qs('[data-confirm]', root);
      var err = qs('[data-seat-error]', root);
      var aisle = Math.ceil(layout.cols / 2);

      function upd() {
        var seats = Object.keys(selected).sort();
        if (selOut) selOut.textContent = seats.length ? seats.join(', ') : 'Ninguno';
        if (cnt) cnt.textContent = seats.length + ' / 10 seleccionados';
        if (tot) tot.textContent = money(seats.length * price);
        if (ok) ok.disabled = seats.length === 0;
      }

      if (map) {
        var h = '<div class="seat-map__screen-wrap"><div class="seat-map__screen"></div><span>Pantalla</span></div><div class="seat-map__scroll"><div class="seat-map__grid">';
        for (var r = 0; r < layout.rows; r++) {
          var label = rowLabel(r);
          h += '<div class="seat-row"><span class="seat-row__label">' + label + '</span>';
          for (var c = 1; c <= layout.cols; c++) {
            var seatNum = r * layout.cols + c;
            if (seatNum > layout.cap) {
              h += '<span class="seat-columns"><span class="seat seat--empty"></span>' + (c === aisle ? '<span class="seat-aisle"></span>' : '') + '</span>';
              continue;
            }
            var seat = label + c;
            var occ = occupied[seat];
            h += '<span class="seat-columns"><button type="button" class="seat ' + (occ ? 'is-occupied' : '') + '" data-seat="' + seat + '" ' + (occ ? 'disabled' : '') + ' aria-label="Asiento ' + seat + '"><span class="seat__shape"></span></button>' + (c === aisle ? '<span class="seat-aisle"></span>' : '') + '</span>';
          }
          h += '<span class="seat-row__label">' + label + '</span></div>';
        }
        h += '</div></div><div class="seat-legend"><span><i class="legend-dot legend-dot--available"></i> Disponible</span><span><i class="legend-dot legend-dot--selected"></i> Seleccionado</span><span><i class="legend-dot legend-dot--occupied"></i> Ocupado</span></div>';
        map.innerHTML = h;
        map.addEventListener('click', function (e) {
          var b = e.target.closest('[data-seat]');
          if (!b || b.disabled) return;
          var s = b.getAttribute('data-seat');
          if (selected[s]) { delete selected[s]; b.classList.remove('is-selected'); }
          else if (Object.keys(selected).length < 10) { selected[s] = 1; b.classList.add('is-selected'); }
          upd();
        });
      }

      if (ok) {
        ok.addEventListener('click', async function () {
          var seats = Object.keys(selected).sort();
          if (!seats.length) return;
          if (err) err.textContent = '';
          ok.disabled = true;
          ok.textContent = 'Procesando…';
          try {
            var rows = seats.map(function (s) { return { funcion_id: Number(fn.id), asiento: s, precio: price }; });
            var ins = await client.from('ticket').insert(rows).select('id');
            if (ins.error) throw ins.error;
            var ids = (ins.data || []).map(function (t) { return t.id; });
            rememberTicketIds(ids);
            location.href = 'mis-entradas.html?ok=1';
          } catch (e) {
            var msg = (e && e.message) || String(e);
            if (/uq_ticket_asiento_funcion|duplicate key/i.test(msg)) {
              msg = 'Uno de los asientos acaba de ocuparse. Recargamos el mapa.';
              setTimeout(function () { location.reload(); }, 1200);
            }
            if (err) err.textContent = msg;
            ok.textContent = 'Confirmar compra';
            upd();
          }
        });
      }
      upd();
    } catch (e) {
      showError('[data-seat-map]', e.message || e);
    }
  }

  async function renderEntradas() {
    var root = qs('[data-entradas]');
    if (!root) return;
    if (param('ok')) { var b = qs('[data-success]'); if (b) b.removeAttribute('hidden'); }
    var list = qs('[data-ticket-list]');
    if (!list) return;

    var ids = getStoredTicketIds();
    if (!ids.length) {
      list.innerHTML = '<div class="empty-state"><h3>Todavía no tenés entradas</h3><p>Cuando compres una entrada aparecerá acá (se buscan por IDs guardados en este navegador).</p><a class="btn btn--primary" href="cartelera.html" style="margin-top:12px">Ver cartelera</a></div>';
      return;
    }
    try {
      var client = ensureDb();
      var res = await client.from('ticket')
        .select('*, funcion(*, pelicula(*), sala(*))')
        .in('id', ids)
        .order('fecha_venta', { ascending: false });
      if (res.error) throw res.error;
      var tickets = res.data || [];
      if (!tickets.length) {
        list.innerHTML = '<div class="empty-state"><h3>No se encontraron entradas</h3><p>Puede que se hayan eliminado o que no tengas permisos de lectura sobre <code>ticket</code>.</p></div>';
        return;
      }
      list.innerHTML = tickets.map(function (t) {
        var fn = t.funcion || {};
        var movie = fn.pelicula || {};
        var sala = fn.sala || {};
        var salaName = sala.numero != null ? ('Sala ' + sala.numero) : 'Sala';
        var hora = String(fn.hora || '').slice(0, 5);
        return '<article class="order-card"><div class="order-card__head"><div class="order-card__movie"><span class="eyebrow">Entrada digital</span><h2>' + esc(movie.titulo || 'Película') + '</h2>' +
          '<div class="order-card__meta"><span>' + esc(fn.fecha || '—') + '</span><span>' + esc(hora) + '</span><span>' + esc(salaName) + '</span></div></div>' +
          '<div class="order-card__total"><span>Asiento</span><strong>' + esc(t.asiento) + '</strong><span class="status-badge">Confirmada</span></div></div>' +
          '<div class="order-card__footer"><span>Ticket #' + esc(t.id) + '</span><span>' + money(t.precio) + '</span><span>' + esc(String(t.fecha_venta || '').replace('T', ' ').slice(0, 16)) + '</span></div></article>';
      }).join('');
    } catch (e) {
      showError(list, e.message || e);
    }
  }

  function initAdmin() {
    var content = qs('#admin-content');
    var grid = qs('.admin-grid');
    if (!content || !grid) return;

    var user = getCurrentUser();
    if (!isAdmin(user)) return;

    var buttons = {
      'btn-gestionar-peliculas': renderAdminPeliculas,
      'btn-gestionar-funciones': renderAdminFunciones,
      'btn-gestionar-salas': renderAdminSalas,
      'btn-gestionar-entradas': renderAdminEntradas,
      'btn-gestionar-imagenes': renderAdminImagenes,
      'btn-gestionar-usuarios': renderAdminUsuarios
    };

    Object.keys(buttons).forEach(function (id) {
      var btn = qs('#' + id);
      if (btn) {
        btn.addEventListener('click', function () {
          content.style.display = 'block';
          content.scrollIntoView({ behavior: 'smooth' });
          buttons[id]();
        });
      }
    });
  }

  function renderAdminPeliculas() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Gestionar Películas</h2><p style="color:var(--muted);margin-bottom:16px;">Agregar, editar o eliminar películas</p><button class="btn btn--primary" id="btn-add-pelicula">+ Agregar película</button><div id="peliculas-list" style="margin-top:16px;"></div></div>';
    loadPeliculasForAdmin();
    var btn = qs('#btn-add-pelicula');
    if (btn) btn.addEventListener('click', showPeliculaForm);
  }

  function loadPeliculasForAdmin() {
    var list = qs('#peliculas-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--muted);">Cargando...</p>';
    try {
      var client = ensureDb();
      client.from('pelicula').select('*').order('id', { ascending: true }).then(function (res) {
        if (res.error) throw res.error;
        var peliculas = res.data || [];
        if (!peliculas.length) {
          list.innerHTML = '<p style="color:var(--muted);">No hay películas. Agrega una nueva.</p>';
          return;
        }
        list.innerHTML = peliculas.map(function (p) {
          return '<div class="card" style="padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>' + esc(p.titulo) + '</strong> <span style="color:var(--muted);margin-left:8px;">' + esc(p.genero || '') + ' · ' + (p.duracion ? p.duracion + ' min' : '') + ' · ' + esc(p.clasificacion || 'NR') + '</span></div>' +
            '<div><button class="btn btn--ghost btn--sm" data-edit-pelicula="' + p.id + '">Editar</button> <button class="btn btn--danger btn--sm" data-delete-pelicula="' + p.id + '">Eliminar</button></div>' +
            '</div>';
        }).join('');
        qsa('[data-edit-pelicula]').forEach(function (b) {
          b.addEventListener('click', function () { showPeliculaForm(Number(b.getAttribute('data-edit-pelicula'))); });
        });
        qsa('[data-delete-pelicula]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (confirm('¿Eliminar esta película?')) deletePelicula(Number(b.getAttribute('data-delete-pelicula')));
          });
        });
      });
    } catch (e) {
      list.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(e.message || e) + '</p></div>';
    }
  }

  function showPeliculaForm(editId) {
    var content = qs('#admin-content');
    if (!content) return;
    var isEdit = !!editId;
    var p = isEdit ? null : {};
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>' + (isEdit ? 'Editar' : 'Agregar') + ' Película</h2><form id="pelicula-form"><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="p_titulo">Título *</label><input class="form-input" type="text" id="p_titulo" name="titulo" required></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="p_genero">Género</label><input class="form-input" type="text" id="p_genero" name="genero"></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="p_duracion">Duración (min)</label><input class="form-input" type="number" id="p_duracion" name="duracion" min="1"></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="p_clasificacion">Clasificación</label><input class="form-input" type="text" id="p_clasificacion" name="clasificacion" placeholder="ATP, +13, +16, +18"></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="p_poster_url">URL Poster</label><input class="form-input" type="url" id="p_poster_url" name="poster_url" placeholder="https://..."></div><div style="display:flex;gap:12px;"><button class="btn btn--primary" type="submit">' + (isEdit ? 'Guardar cambios' : 'Crear película') + '</button><button class="btn btn--ghost" type="button" id="btn-cancel-pelicula">Cancelar</button></div></form></div>';
    if (isEdit) loadPeliculaForEdit(editId);
    qs('#btn-cancel-pelicula').addEventListener('click', renderAdminPeliculas);
    qs('#pelicula-form').addEventListener('submit', function (e) {
      e.preventDefault();
      savePelicula(editId);
    });
  }

  function loadPeliculaForEdit(id) {
    try {
      var client = ensureDb();
      client.from('pelicula').select('*').eq('id', id).maybeSingle().then(function (res) {
        if (res.error) throw res.error;
        var p = res.data;
        if (!p) return;
        qs('#p_titulo').value = p.titulo || '';
        qs('#p_genero').value = p.genero || '';
        qs('#p_duracion').value = p.duracion || '';
        qs('#p_clasificacion').value = p.clasificacion || '';
        qs('#p_poster_url').value = p.poster_url || '';
      });
    } catch (e) {
      alert('Error cargando película: ' + e.message);
    }
  }

  function savePelicula(editId) {
    var data = {
      titulo: qs('#p_titulo').value.trim(),
      genero: qs('#p_genero').value.trim() || null,
      duracion: qs('#p_duracion').value ? parseInt(qs('#p_duracion').value, 10) : null,
      clasificacion: qs('#p_clasificacion').value.trim() || 'ATP',
      poster_url: qs('#p_poster_url').value.trim() || null
    };
    if (!data.titulo) return alert('El título es obligatorio');
    var url = editId ? '/api/admin/peliculas/' + editId : '/api/admin/peliculas';
    var method = editId ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res.success) renderAdminPeliculas(); else alert('Error: ' + (res.error || 'Unknown')); })
      .catch(function (e) { alert('Error guardando: ' + e.message); });
  }

  async function adminApiDelete(path) {
    var r = await fetch(path, { method: 'DELETE' });
    var res = null;
    try { res = await r.json(); } catch (e) {}
    if (!r.ok || !res || !res.success) {
      throw new Error((res && res.error) || ('HTTP ' + r.status));
    }
    return true;
  }

  async function dbDelete(table, id) {
    var client = ensureDb();
    var res = await client.from(table).delete().eq('id', id).select('id');
    if (res.error) throw res.error;
    if (!res.data || !res.data.length) {
      throw new Error('Sin permisos para eliminar en "' + table + '". Ejecuta las políticas RLS de eliminación (ver README).');
    }
    return true;
  }

  async function deleteTicketsForFunciones(ids) {
    if (!ids || !ids.length) return;
    var client = ensureDb();
    var res = await client.from('ticket').delete().in('funcion_id', ids);
    if (res.error) throw res.error;
  }

  async function deleteFuncionesBy(column, value) {
    var client = ensureDb();
    var fRes = await client.from('funcion').select('id').eq(column, value);
    if (fRes.error) throw fRes.error;
    var ids = (fRes.data || []).map(function (f) { return f.id; });
    await deleteTicketsForFunciones(ids);
    if (ids.length) {
      var dRes = await client.from('funcion').delete().in('id', ids);
      if (dRes.error) throw dRes.error;
    }
  }

  async function deletePelicula(id) {
    try {
      await adminApiDelete('/api/admin/peliculas/' + id);
    } catch (serverErr) {
      try {
        await deleteFuncionesBy('pelicula_id', id);
        await dbDelete('pelicula', id);
      } catch (e) {
        alert('Error eliminando: ' + (e.message || e));
        return;
      }
    }
    renderAdminPeliculas();
  }

  function renderAdminFunciones() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Gestionar Funciones y Horarios</h2><p style="color:var(--muted);margin-bottom:16px;">Crear funciones, asignar horarios y salas</p><button class="btn btn--primary" id="btn-add-funcion">+ Agregar función</button><div id="funciones-list" style="margin-top:16px;"></div></div>';
    loadFuncionesForAdmin();
    qs('#btn-add-funcion').addEventListener('click', showFuncionForm);
  }

  function loadFuncionesForAdmin() {
    var list = qs('#funciones-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--muted);">Cargando...</p>';
    try {
      var client = ensureDb();
      client.from('funcion').select('*, pelicula(titulo), sala(numero)').order('fecha', { ascending: false }).order('hora', { ascending: true }).then(function (res) {
        if (res.error) throw res.error;
        var funciones = res.data || [];
        if (!funciones.length) {
          list.innerHTML = '<p style="color:var(--muted);">No hay funciones. Agrega una nueva.</p>';
          return;
        }
        list.innerHTML = funciones.map(function (f) {
          var peli = f.pelicula || {};
          var sala = f.sala || {};
          return '<div class="card" style="padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>' + esc(peli.titulo || 'Película') + '</strong> <span style="color:var(--muted);margin-left:8px;">' + esc(f.fecha) + ' · ' + String(f.hora || '').slice(0,5) + ' · Sala ' + (sala.numero || f.sala_id) + '</span></div>' +
            '<div><button class="btn btn--danger btn--sm" data-delete-funcion="' + f.id + '">Eliminar</button></div>' +
            '</div>';
        }).join('');
        qsa('[data-delete-funcion]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (confirm('¿Eliminar esta función?')) deleteFuncion(Number(b.getAttribute('data-delete-funcion')));
          });
        });
      });
    } catch (e) {
      list.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(e.message || e) + '</p></div>';
    }
  }

  function showFuncionForm() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Agregar Función</h2><form id="funcion-form"><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="f_pelicula_id">Película *</label><select class="form-input" id="f_pelicula_id" name="pelicula_id" required></select></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="f_sala_id">Sala *</label><select class="form-input" id="f_sala_id" name="sala_id" required></select></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="f_fecha">Fecha *</label><input class="form-input" type="date" id="f_fecha" name="fecha" required></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="f_hora">Hora *</label><input class="form-input" type="time" id="f_hora" name="hora" required></div><div style="display:flex;gap:12px;"><button class="btn btn--primary" type="submit">Crear función</button><button class="btn btn--ghost" type="button" id="btn-cancel-funcion">Cancelar</button></div></form></div>';
    loadPeliculasForSelect();
    loadSalasForSelect();
    qs('#btn-cancel-funcion').addEventListener('click', renderAdminFunciones);
    qs('#funcion-form').addEventListener('submit', function (e) {
      e.preventDefault();
      saveFuncion();
    });
  }

  function loadPeliculasForSelect() {
    try {
      var client = ensureDb();
      client.from('pelicula').select('id,titulo').order('titulo', { ascending: true }).then(function (res) {
        if (res.error) throw res.error;
        var sel = qs('#f_pelicula_id');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar película</option>' + (res.data || []).map(function (p) {
          return '<option value="' + p.id + '">' + esc(p.titulo) + '</option>';
        }).join('');
      });
    } catch (e) {}
  }

  function loadSalasForSelect() {
    try {
      var client = ensureDb();
      client.from('sala').select('id,numero').order('numero', { ascending: true }).then(function (res) {
        if (res.error) throw res.error;
        var sel = qs('#f_sala_id');
        if (!sel) return;
        sel.innerHTML = '<option value="">Seleccionar sala</option>' + (res.data || []).map(function (s) {
          return '<option value="' + s.id + '">Sala ' + s.numero + ' (Cap: ' + (s.capacidad || '?') + ')</option>';
        }).join('');
      });
    } catch (e) {}
  }

  function saveFuncion() {
    var data = {
      pelicula_id: parseInt(qs('#f_pelicula_id').value, 10),
      sala_id: parseInt(qs('#f_sala_id').value, 10),
      fecha: qs('#f_fecha').value,
      hora: qs('#f_hora').value
    };
    if (!data.pelicula_id || !data.sala_id || !data.fecha || !data.hora) return alert('Todos los campos son obligatorios');
    fetch('/api/admin/funciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res.success) renderAdminFunciones(); else alert('Error: ' + (res.error || 'Unknown')); })
      .catch(function (e) { alert('Error guardando: ' + e.message); });
  }

  async function deleteFuncion(id) {
    try {
      await adminApiDelete('/api/admin/funciones/' + id);
    } catch (serverErr) {
      try {
        await deleteTicketsForFunciones([id]);
        await dbDelete('funcion', id);
      } catch (e) {
        alert('Error eliminando: ' + (e.message || e));
        return;
      }
    }
    renderAdminFunciones();
  }

  function renderAdminSalas() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Gestionar Salas</h2><p style="color:var(--muted);margin-bottom:16px;">Configurar salas y capacidades</p><button class="btn btn--primary" id="btn-add-sala">+ Agregar sala</button><div id="salas-list" style="margin-top:16px;"></div></div>';
    loadSalasForAdmin();
    qs('#btn-add-sala').addEventListener('click', showSalaForm);
  }

  function loadSalasForAdmin() {
    var list = qs('#salas-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--muted);">Cargando...</p>';
    try {
      var client = ensureDb();
      client.from('sala').select('*').order('numero', { ascending: true }).then(function (res) {
        if (res.error) throw res.error;
        var salas = res.data || [];
        if (!salas.length) {
          list.innerHTML = '<p style="color:var(--muted);">No hay salas. Agrega una nueva.</p>';
          return;
        }
        list.innerHTML = salas.map(function (s) {
          return '<div class="card" style="padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>Sala ' + s.numero + '</strong> <span style="color:var(--muted);margin-left:8px;">Capacidad: ' + (s.capacidad || '?') + '</span></div>' +
            '<div><button class="btn btn--ghost btn--sm" data-edit-sala="' + s.id + '">Editar</button> <button class="btn btn--danger btn--sm" data-delete-sala="' + s.id + '">Eliminar</button></div>' +
            '</div>';
        }).join('');
        qsa('[data-edit-sala]').forEach(function (b) {
          b.addEventListener('click', function () { showSalaForm(Number(b.getAttribute('data-edit-sala'))); });
        });
        qsa('[data-delete-sala]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (confirm('¿Eliminar esta sala?')) deleteSala(Number(b.getAttribute('data-delete-sala')));
          });
        });
      });
    } catch (e) {
      list.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(e.message || e) + '</p></div>';
    }
  }

  function showSalaForm(editId) {
    var content = qs('#admin-content');
    if (!content) return;
    var isEdit = !!editId;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>' + (isEdit ? 'Editar' : 'Agregar') + ' Sala</h2><form id="sala-form"><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="s_numero">Número de sala *</label><input class="form-input" type="number" id="s_numero" name="numero" required min="1"></div><div class="form-group" style="margin-bottom:16px;"><label class="form-label" for="s_capacidad">Capacidad *</label><input class="form-input" type="number" id="s_capacidad" name="capacidad" required min="1"></div><div style="display:flex;gap:12px;"><button class="btn btn--primary" type="submit">' + (isEdit ? 'Guardar cambios' : 'Crear sala') + '</button><button class="btn btn--ghost" type="button" id="btn-cancel-sala">Cancelar</button></div></form></div>';
    if (isEdit) loadSalaForEdit(editId);
    qs('#btn-cancel-sala').addEventListener('click', renderAdminSalas);
    qs('#sala-form').addEventListener('submit', function (e) {
      e.preventDefault();
      saveSala(editId);
    });
  }

  function loadSalaForEdit(id) {
    try {
      var client = ensureDb();
      client.from('sala').select('*').eq('id', id).maybeSingle().then(function (res) {
        if (res.error) throw res.error;
        var s = res.data;
        if (!s) return;
        qs('#s_numero').value = s.numero || '';
        qs('#s_capacidad').value = s.capacidad || '';
      });
    } catch (e) {
      alert('Error cargando sala: ' + e.message);
    }
  }

  function saveSala(editId) {
    var data = {
      numero: parseInt(qs('#s_numero').value, 10),
      capacidad: parseInt(qs('#s_capacidad').value, 10)
    };
    if (!data.numero || !data.capacidad) return alert('Todos los campos son obligatorios');
    var url = editId ? '/api/admin/salas/' + editId : '/api/admin/salas';
    var method = editId ? 'PUT' : 'POST';
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res.success) renderAdminSalas(); else alert('Error: ' + (res.error || 'Unknown')); })
      .catch(function (e) { alert('Error guardando: ' + e.message); });
  }

  async function deleteSala(id) {
    try {
      await adminApiDelete('/api/admin/salas/' + id);
    } catch (serverErr) {
      try {
        await deleteFuncionesBy('sala_id', id);
        await dbDelete('sala', id);
      } catch (e) {
        alert('Error eliminando: ' + (e.message || e));
        return;
      }
    }
    renderAdminSalas();
  }

  function renderAdminEntradas() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Eliminar Entradas</h2><p style="color:var(--muted);margin-bottom:16px;">Ver y eliminar entradas vendidas</p><div id="entradas-list" style="margin-top:16px;"></div></div>';
    loadEntradasForAdmin();
  }

  function loadEntradasForAdmin() {
    var list = qs('#entradas-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--muted);">Cargando...</p>';
    try {
      var client = ensureDb();
      client.from('ticket').select('*, funcion(*, pelicula(titulo), sala(numero))').order('fecha_venta', { ascending: false }).then(function (res) {
        if (res.error) throw res.error;
        var tickets = res.data || [];
        if (!tickets.length) {
          list.innerHTML = '<p style="color:var(--muted);">No hay entradas registradas.</p>';
          return;
        }
        list.innerHTML = tickets.map(function (t) {
          var fn = t.funcion || {};
          var peli = fn.pelicula || {};
          var sala = fn.sala || {};
          return '<div class="card" style="padding:16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
            '<div><strong>Ticket #' + t.id + '</strong> <span style="color:var(--muted);margin-left:8px;">' + esc(peli.titulo || 'Película') + ' · Asiento ' + esc(t.asiento) + ' · ' + esc(fn.fecha || '') + ' ' + String(fn.hora || '').slice(0,5) + ' · Sala ' + (sala.numero || fn.sala_id) + '</span></div>' +
            '<div><button class="btn btn--danger btn--sm" data-delete-ticket="' + t.id + '">Eliminar</button></div>' +
            '</div>';
        }).join('');
        qsa('[data-delete-ticket]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (confirm('¿Eliminar esta entrada?')) deleteTicket(Number(b.getAttribute('data-delete-ticket')));
          });
        });
      });
    } catch (e) {
      list.innerHTML = '<div class="empty-state"><h3>Error</h3><p>' + esc(e.message || e) + '</p></div>';
    }
  }

  async function deleteTicket(id) {
    try {
      await adminApiDelete('/api/admin/tickets/' + id);
    } catch (serverErr) {
      try {
        await dbDelete('ticket', id);
      } catch (e) {
        alert('Error eliminando: ' + (e.message || e));
        return;
      }
    }
    loadEntradasForAdmin();
  }

  function renderAdminImagenes() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Gestionar Imágenes (Posters)</h2><p style="color:var(--muted);margin-bottom:16px;">Los posters se guardan en el campo <code>poster_url</code> de cada película.</p><p style="color:var(--muted);">Usa la sección <strong>Gestionar Películas</strong> para agregar o cambiar la URL del poster de cada película.</p></div>';
  }

  function renderAdminUsuarios() {
    var content = qs('#admin-content');
    if (!content) return;
    content.innerHTML = '<div class="card" style="padding:24px;"><h2>Usuarios del sistema</h2><p style="color:var(--muted);margin-bottom:16px;">Cualquier persona que inicie sesión obtiene el rol <strong>Usuario</strong>. Solo el email administrador obtiene el rol <strong>Admin</strong>.</p><ul style="list-style:none;padding:0;"><li style="padding:12px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;"><span>Cualquier email registrado</span><span class="badge" style="background:#3b82f6;color:white;">Usuario</span></li><li style="padding:12px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;"><span>' + esc(ADMIN_EMAIL) + '</span><span class="badge" style="background:#ef4444;color:white;">Admin</span></li></ul><p style="color:var(--muted);margin-top:16px;font-size:14px;">Para cambiar el administrador, modifica la constante ADMIN_EMAIL en assets/app.js</p></div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAuth();
    showConfigWarning();
    renderProximos();
    renderCarteleraGrids();
    renderPelicula();
    renderAsientos();
    renderEntradas();
    initAdmin();
  });
})();

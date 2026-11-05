/* Planificador del curso · Pasaporte al Español
   Todo ocurre en el navegador. La configuración se guarda en localStorage
   y se puede exportar o importar como archivo JSON. */
(function () {
  "use strict";

  var raiz = document.getElementById("planificador");
  var fuente = document.getElementById("sesiones-json");
  if (!raiz || !fuente) return;

  var DATOS;
  try { DATOS = JSON.parse(fuente.textContent); } catch (e) { DATOS = {}; }
  var SESIONES = DATOS.sesiones || [];
  var SEMANAS = DATOS.semanas || [];
  if (!SESIONES.length) {
    raiz.insertAdjacentHTML("afterbegin", '<p class="pl-aviso pl-aviso--mal">No se han cargado las sesiones del programa.</p>');
    return;
  }

  var CLAVE = "pasaporte-planificador-v1";
  var BLOQUES = ["Toy Story", "Coco", "Ratatouille", "Frozen", "El Rey León",
    "Encanto", "Aladdín", "La Bella y la Bestia", "Vaiana", "Zootrópolis"];
  var DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var DIA_PROGRAMA = { Lunes: 1, Martes: 2, "Miércoles": 3, Jueves: 4, Viernes: 5 };
  var TOTAL_SEMANAS = Math.max.apply(null, SEMANAS.map(function (s) { return s.n; }));

  var porSemana = {};
  SESIONES.forEach(function (s) { (porSemana[s.semana] = porSemana[s.semana] || []).push(s); });
  Object.keys(porSemana).forEach(function (k) {
    porSemana[k].sort(function (a, b) { return a.n - b.n; });
  });
  var infoSemana = {};
  SEMANAS.forEach(function (s) { infoSemana[s.n] = s; });

  /* ---------- Fechas (siempre a mediodía local para evitar saltos de horario) ---------- */
  function aFecha(iso) {
    if (!iso) return null;
    var p = iso.split("-").map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2], 12);
  }
  function aISO(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function sumar(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function lunesDe(d) { var dia = d.getDay(); return sumar(d, dia === 0 ? -6 : 1 - dia); }
  function corta(d) { return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }); }
  function larga(d) { return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }); }
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Festivos sugeridos ---------- */
  function nEsimo(anio, mes, diaSemana, n) { // n-ésimo díaSemana del mes (n = -1: el último)
    if (n > 0) {
      var d = new Date(anio, mes, 1, 12);
      var off = (diaSemana - d.getDay() + 7) % 7;
      return new Date(anio, mes, 1 + off + 7 * (n - 1), 12);
    }
    var u = new Date(anio, mes + 1, 0, 12);
    return sumar(u, -((u.getDay() - diaSemana + 7) % 7));
  }
  function pascua(a) { // algoritmo de Meeus/Jones/Butcher (calendario gregoriano)
    var b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * (a % 19) + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor(((a % 19) + 11 * h + 22 * l) / 451);
    var mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(a, mes - 1, dia, 12);
  }
  function festivosSugeridos(inicio, fin) {
    var lista = [];
    for (var a = inicio.getFullYear(); a <= fin.getFullYear(); a++) {
      var p = pascua(a);
      var t = nEsimo(a, 10, 4, 4);
      lista.push(
        { desde: new Date(a, 0, 1, 12), motivo: "Año Nuevo" },
        { desde: nEsimo(a, 0, 1, 3), motivo: "Martin Luther King Jr. Day" },
        { desde: nEsimo(a, 1, 1, 3), motivo: "Presidents' Day" },
        { desde: sumar(p, -6), hasta: sumar(p, 1), motivo: "Semana Santa y lunes de Pascua (comprueba las fechas del colegio)" },
        { desde: nEsimo(a, 4, 1, -1), motivo: "Memorial Day" },
        { desde: new Date(a, 5, 19, 12), motivo: "Juneteenth" },
        { desde: new Date(a, 6, 4, 12), motivo: "Independence Day" },
        { desde: nEsimo(a, 8, 1, 1), motivo: "Labor Day" },
        { desde: nEsimo(a, 9, 1, 2), motivo: "Columbus Day / Indigenous Peoples' Day (comprueba si hay clase)" },
        { desde: new Date(a, 10, 11, 12), motivo: "Veterans Day (comprueba si hay clase)" },
        { desde: sumar(t, -1), hasta: sumar(t, 1), motivo: "Acción de Gracias (miércoles a viernes)" },
        { desde: new Date(a, 11, 21, 12), hasta: new Date(a + 1, 0, 1, 12), motivo: "Navidad (comprueba las fechas del colegio)" }
      );
    }
    return lista.filter(function (f) {
      return (f.hasta || f.desde) >= inicio && f.desde <= fin;
    }).map(function (f) {
      return { desde: aISO(f.desde), hasta: f.hasta ? aISO(f.hasta) : "", motivo: f.motivo };
    });
  }

  /* ---------- Estado ---------- */
  function estadoInicial() {
    return {
      inicio: "2027-02-01", fin: "2027-05-28", dias: [1, 2, 3, 4, 5], semana0: false,
      sinClase: [], modo: "semanas", minDias: 3, mes10: "entre", auto: true, elegidas: []
    };
  }
  function cargar() {
    try {
      var g = JSON.parse(localStorage.getItem(CLAVE));
      if (g && typeof g === "object") return Object.assign(estadoInicial(), g);
    } catch (e) { /* sin acceso a localStorage */ }
    return estadoInicial();
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* nada */ }
  }
  var estado = cargar();

  /* ---------- Orden del programa ---------- */
  function ordenPrograma() {
    var base = [];
    for (var s = 1; s <= Math.min(36, TOTAL_SEMANAS); s++) base.push(s);
    var extra = [];
    for (var x = 37; x <= TOTAL_SEMANAS; x++) extra.push(x);
    if (estado.mes10 === "entre") return base.slice(0, 32).concat(extra, base.slice(32));
    return base.concat(extra);
  }

  /* ---------- Calendario disponible ---------- */
  function analizarCalendario() {
    var inicio = aFecha(estado.inicio), fin = aFecha(estado.fin);
    if (!inicio || !fin || fin < inicio) return null;
    var libres = {};
    estado.sinClase.forEach(function (f) {
      var d = aFecha(f.desde), h = aFecha(f.hasta) || d;
      if (!d) return;
      if (h < d) { var t = d; d = h; h = t; }
      for (var x = d; x <= h; x = sumar(x, 1)) libres[aISO(x)] = f.motivo || "Sin clase";
    });
    var semanas = [], usadaSemana0 = false;
    for (var l = lunesDe(inicio); l <= fin; l = sumar(l, 7)) {
      var dias = [], fuera = [];
      for (var i = 0; i < 7; i++) {
        var d2 = sumar(l, i), iso = aISO(d2), dw = d2.getDay();
        if (d2 < inicio || d2 > fin || estado.dias.indexOf(dw) < 0) continue;
        if (libres[iso]) fuera.push({ fecha: d2, motivo: libres[iso] });
        else dias.push(d2);
      }
      var tipo = dias.length === 0 ? "vacia" : (dias.length < estado.minDias ? "corta" : "normal");
      if (tipo !== "vacia" && estado.semana0 && !usadaSemana0) { tipo = "cero"; usadaSemana0 = true; }
      semanas.push({ lunes: l, dias: dias, fuera: fuera, tipo: tipo });
    }
    return { inicio: inicio, fin: fin, semanas: semanas };
  }

  function capacidad(cal) {
    if (estado.modo === "semanas") {
      return cal.semanas.filter(function (s) { return s.tipo === "normal"; }).length;
    }
    var dias = 0;
    cal.semanas.forEach(function (s) { if (s.tipo !== "cero") dias += s.dias.length; });
    return Math.floor(dias / 5);
  }

  function seleccionAutomatica(cap) {
    var orden = ordenPrograma();
    var nucleo = orden.filter(function (s) { return s <= 36; });
    if (cap >= orden.length) return orden.slice();
    if (cap >= nucleo.length) {
      var extras = orden.filter(function (s) { return s > 36; }).slice(0, cap - nucleo.length);
      return orden.filter(function (s) { return s <= 36 || extras.indexOf(s) >= 0; });
    }
    return nucleo.slice(0, Math.max(cap, 0));
  }

  function elegidas(cal) {
    if (estado.auto) return seleccionAutomatica(capacidad(cal));
    return ordenPrograma().filter(function (s) { return estado.elegidas.indexOf(s) >= 0; });
  }

  /* ---------- Reparto ---------- */
  function repartir(cal, lista) {
    var filas = [], pendientes = lista.slice(), saltadas = [], sobranSemanas = 0, sobranDias = 0;

    if (estado.modo === "semanas") {
      cal.semanas.forEach(function (sem) {
        var bloque = { sem: sem, filas: [], programa: null };
        if (sem.tipo === "normal" && pendientes.length) {
          var n = pendientes.shift();
          bloque.programa = n;
          var ses = (porSemana[n] || []).slice();
          var dias = sem.dias, asign = [];
          if (dias.length >= ses.length) {
            // Cada sesión en su día de la semana si se puede; si no, en orden
            var porDia = ses.every(function (s) {
              return dias.some(function (d) { return d.getDay() === DIA_PROGRAMA[s.dia]; });
            });
            ses.forEach(function (s, i) {
              var d = porDia ? dias.filter(function (x) { return x.getDay() === DIA_PROGRAMA[s.dia]; })[0] : dias[i];
              asign.push({ fecha: d, sesion: s });
            });
          } else {
            // Faltan días: la última sesión (misión del viernes) va al último día
            var cabe = dias.length;
            ses.slice(0, cabe - 1).forEach(function (s, i) { asign.push({ fecha: dias[i], sesion: s }); });
            asign.push({ fecha: dias[cabe - 1], sesion: ses[ses.length - 1] });
            ses.slice(cabe - 1, ses.length - 1).forEach(function (s) { saltadas.push(s); bloque.filas.push({ saltada: s }); });
          }
          asign.forEach(function (a) { bloque.filas.push({ fecha: a.fecha, sesion: a.sesion }); });
        } else if (sem.tipo === "normal") {
          sobranSemanas++;
        }
        if (sem.tipo === "corta" || (sem.tipo === "normal" && bloque.programa === null)) sobranDias += sem.dias.length;
        sem.fuera.forEach(function (f) { bloque.filas.push({ fecha: f.fecha, libre: f.motivo }); });
        if (!bloque.programa) sem.dias.forEach(function (d) { bloque.filas.push({ fecha: d, libreClub: sem.tipo }); });
        bloque.filas.sort(function (a, b) {
          if (!a.fecha) return 1; if (!b.fecha) return -1; return a.fecha - b.fecha;
        });
        filas.push(bloque);
      });
      return { semanas: filas, noCaben: pendientes, saltadas: saltadas, sobranSemanas: sobranSemanas, sobranDias: sobranDias };
    }

    // Modo seguido
    var cola = [];
    lista.forEach(function (n) { cola = cola.concat(porSemana[n] || []); });
    cal.semanas.forEach(function (sem) {
      var bloque = { sem: sem, filas: [], programa: null };
      sem.fuera.forEach(function (f) { bloque.filas.push({ fecha: f.fecha, libre: f.motivo }); });
      sem.dias.forEach(function (d) {
        if (sem.tipo === "cero") { bloque.filas.push({ fecha: d, libreClub: "cero" }); return; }
        if (cola.length) {
          var s = cola.shift();
          if (bloque.programa === null) bloque.programa = s.semana;
          bloque.filas.push({ fecha: d, sesion: s });
        } else {
          sobranDias++;
          bloque.filas.push({ fecha: d, libreClub: "sobra" });
        }
      });
      bloque.filas.sort(function (a, b) { return a.fecha - b.fecha; });
      filas.push(bloque);
    });
    var noCaben = [];
    cola.forEach(function (s) { if (noCaben.indexOf(s.semana) < 0) noCaben.push(s.semana); });
    return { semanas: filas, noCaben: noCaben, saltadas: [], sobranSemanas: Math.floor(sobranDias / 5), sobranDias: sobranDias, sesionesSinHueco: cola.length };
  }

  /* ---------- Formulario ---------- */
  var $ = function (id) { return document.getElementById(id); };

  function pintarFestivos() {
    var cont = $("pl-festivos");
    cont.innerHTML = "";
    estado.sinClase.forEach(function (f, i) {
      var fila = document.createElement("div");
      fila.className = "pl-festivo";
      fila.innerHTML =
        '<label>Desde <input type="date" data-k="desde" value="' + esc(f.desde || "") + '"></label>' +
        '<label>Hasta <input type="date" data-k="hasta" value="' + esc(f.hasta || "") + '"></label>' +
        '<label class="pl-motivo">Motivo <input type="text" data-k="motivo" value="' + esc(f.motivo || "") + '" placeholder="Navidad, excursión…"></label>' +
        '<button type="button" class="pl-quitar" aria-label="Quitar">✕</button>';
      fila.querySelectorAll("input").forEach(function (inp) {
        inp.addEventListener("change", function () { estado.sinClase[i][inp.dataset.k] = inp.value; actualizar(); });
      });
      fila.querySelector("button").addEventListener("click", function () {
        estado.sinClase.splice(i, 1); pintarFestivos(); actualizar();
      });
      cont.appendChild(fila);
    });
  }

  function pintarBloques(cal, lista) {
    var cont = $("pl-bloques");
    var html = "";
    for (var b = 1; b <= Math.ceil(TOTAL_SEMANAS / 4); b++) {
      html += '<div class="pl-bloque"><span class="pl-bloque__nombre">' + (b === 10 ? "Mes 10" : "Mes " + b) + " · " + esc(BLOQUES[b - 1] || "") + "</span>";
      for (var s = (b - 1) * 4 + 1; s <= Math.min(b * 4, TOTAL_SEMANAS); s++) {
        var t = infoSemana[s] ? infoSemana[s].titulo : "";
        html += '<label title="' + esc(t) + '"><input type="checkbox" data-semana="' + s + '"' + (lista.indexOf(s) >= 0 ? " checked" : "") + "> " + s + "</label>";
      }
      html += "</div>";
    }
    cont.innerHTML = html;
    cont.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("change", function () {
        estado.auto = false;
        estado.elegidas = Array.prototype.map.call(cont.querySelectorAll("input:checked"), function (x) { return Number(x.dataset.semana); });
        actualizar();
      });
    });
    var est = $("pl-auto-estado");
    if (estado.auto) {
      est.innerHTML = "Selección automática según las semanas que caben. Marca o desmarca semanas para elegirlas tú.";
    } else {
      est.innerHTML = 'Selección manual. <button type="button" class="pl-enlace" id="pl-volver-auto">Volver a la selección automática</button>';
      $("pl-volver-auto").addEventListener("click", function () { estado.auto = true; actualizar(); });
    }
  }

  function leerFormulario() {
    estado.inicio = $("pl-inicio").value;
    estado.fin = $("pl-fin").value;
    estado.dias = Array.prototype.map.call(raiz.querySelectorAll(".pl-dias input:checked"), function (x) { return Number(x.value); });
    estado.semana0 = $("pl-semana0").checked;
    var m = raiz.querySelector('input[name="pl-modo"]:checked');
    estado.modo = m ? m.value : "semanas";
    estado.minDias = Number($("pl-mindias").value);
    estado.mes10 = $("pl-mes10").value;
  }

  function escribirFormulario() {
    $("pl-inicio").value = estado.inicio;
    $("pl-fin").value = estado.fin;
    raiz.querySelectorAll(".pl-dias input").forEach(function (x) { x.checked = estado.dias.indexOf(Number(x.value)) >= 0; });
    $("pl-semana0").checked = !!estado.semana0;
    raiz.querySelectorAll('input[name="pl-modo"]').forEach(function (x) { x.checked = x.value === estado.modo; });
    $("pl-mindias").value = String(estado.minDias);
    $("pl-mes10").value = estado.mes10;
    pintarFestivos();
  }

  /* ---------- Resultado ---------- */
  var ultimo = null;

  function rangoSemanas(lista) {
    if (!lista.length) return "";
    var partes = [], ini = lista[0], prev = lista[0];
    for (var i = 1; i <= lista.length; i++) {
      var x = lista[i];
      if (x === prev + 1) { prev = x; continue; }
      partes.push(ini === prev ? String(ini) : ini + "–" + prev);
      ini = prev = x;
    }
    return partes.join(", ");
  }

  function pintarResumen(cal, lista, rep) {
    var cap = capacidad(cal);
    var diasClub = 0;
    cal.semanas.forEach(function (s) { if (s.tipo !== "cero") diasClub += s.dias.length; });
    var dadas = lista.filter(function (n) { return rep.noCaben.indexOf(n) < 0; });
    var bloquesCompletos = [];
    for (var b = 1; b <= 10; b++) {
      var ok = true;
      for (var s = (b - 1) * 4 + 1; s <= b * 4; s++) if (dadas.indexOf(s) < 0) ok = false;
      if (ok) bloquesCompletos.push(b);
    }
    var avisos = [];
    if (estado.modo === "seguido" && estado.dias.length < 5) {
      avisos.push(["info", "El programa está pensado para 5 sesiones por semana. Con " + estado.dias.length + " días de club, cada semana del programa dura más de una semana del calendario."]);
    }
    if (estado.modo === "semanas" && estado.dias.length < 5) {
      avisos.push(["mal", "Con " + estado.dias.length + " días de club a la semana, el reparto «por semanas» deja sin dar " + (5 - estado.dias.length) + " sesiones cada semana. Usa el reparto «seguido» si quieres darlas todas."]);
    }
    if (rep.noCaben.length) {
      avisos.push(["mal", "<strong>" + (rep.noCaben.length === 1 ? "No cabe " : "No caben ") + rep.noCaben.length + " de las semanas elegidas</strong> (" + rangoSemanas(rep.noCaben.slice().sort(function (a, b) { return a - b; })) + "). Desmárcalas o amplía las fechas."]);
    }
    var nucleo = dadas.filter(function (n) { return n <= 36; }).length;
    if (nucleo < 36 && dadas.length) {
      avisos.push(["mal", "<strong>" + (36 - nucleo === 1 ? "Falta " : "Faltan ") + pl(36 - nucleo, "semana", "semanas") + " para el programa completo (36).</strong> La evaluación final, el último Gran Juego y la celebración están en la semana 36: si el curso termina antes, haz la celebración y la ficha de evaluación el último viernes con lo que se haya dado."]);
    }
    if (rep.saltadas.length) {
      avisos.push(["info", "<strong>" + pl(rep.saltadas.length, "sesión", "sesiones") + " sin día</strong> por semanas cortas (marcadas en el calendario). Júntalas con la sesión anterior o úsalas como repaso."]);
    }
    if (rep.sobranSemanas > 0 && !rep.noCaben.length) {
      var queda = dadas.indexOf(37) < 0 && TOTAL_SEMANAS >= 37 ? " Puedes añadir semanas sueltas del mes 10 (cada una tiene su misión)." : " Úsalas para repaso, el banco de juegos o una semana de plan B.";
      avisos.push(["bien", "<strong>" + (rep.sobranSemanas === 1 ? "Sobra " : "Sobran ") + pl(rep.sobranSemanas, "semana", "semanas") + "</strong> de club al final." + queda]);
    }
    if (rep.sobranDias > 0 && estado.modo === "semanas") {
      avisos.push(["info", pl(rep.sobranDias, "día de club cae", "días de club caen") + " en semanas cortas o sobrantes: repaso o plan B."]);
    }

    var html = '<h2>Resumen</h2><div class="pl-cifras">' +
      cifra(diasClub, "días de club") +
      cifra(cap, estado.modo === "semanas" ? "semanas que caben" : "semanas de 5 sesiones") +
      cifra(dadas.length, "semanas del programa") +
      cifra(bloquesCompletos.length, "meses completos") + "</div>";
    html += "<p>Del " + larga(cal.inicio) + " al " + larga(cal.fin) + ". " +
      (bloquesCompletos.length ? "Meses completos: " + bloquesCompletos.map(function (b) { return b + " (" + BLOQUES[b - 1] + ")"; }).join(", ") + "." : "") + "</p>";
    avisos.forEach(function (a) { html += '<p class="pl-aviso pl-aviso--' + a[0] + '">' + a[1] + "</p>"; });
    $("pl-resumen").innerHTML = html;
  }
  function pl(n, uno, varios) { return n + " " + (n === 1 ? uno : varios); }
  function cifra(n, t) { return '<div class="pl-cifra"><strong>' + n + "</strong><span>" + t + "</span></div>"; }

  function bloqueDe(semana) { return Math.ceil(semana / 4); }

  function pintarCalendario(rep) {
    var html = '<h2>Calendario</h2><table class="pl-tabla"><thead><tr><th>Fecha</th><th>Sesión</th><th>Qué toca</th></tr></thead><tbody>';
    rep.semanas.forEach(function (b) {
      if (!b.filas.length) return;
      var cab = "Semana del " + corta(b.sem.lunes);
      if (b.programa) {
        var info = infoSemana[b.programa];
        var bl = bloqueDe(b.programa);
        cab += ' · <a href="' + esc(info ? info.url : "#") + '">Semana ' + b.programa + "</a> del programa · Mes " + bl + " (" + esc(BLOQUES[bl - 1]) + ")";
        if (info) cab += '<br><span class="pl-sub">' + esc(info.titulo) + "</span>";
      } else if (b.sem.tipo === "cero") cab += " · Semana 0";
      else if (b.sem.tipo === "vacia") cab += " · Sin club";
      else if (b.sem.tipo === "corta") cab += " · Semana corta";
      html += '<tr class="pl-cab"><th colspan="3">' + cab + "</th></tr>";
      b.filas.forEach(function (f) {
        if (f.saltada) {
          html += '<tr class="pl-saltada"><td>—</td><td>' + f.saltada.n + '</td><td><a href="' + esc(f.saltada.url) + '">' + esc(f.saltada.titulo) + "</a> · <em>sin día esta semana: júntala con otra o úsala de repaso</em></td></tr>";
          return;
        }
        var fecha = DIAS_ES[f.fecha.getDay()].slice(0, 3) + " " + corta(f.fecha);
        if (f.sesion) {
          html += "<tr><td>" + fecha + "</td><td>" + f.sesion.n + '</td><td><a href="' + esc(f.sesion.url) + '">' + esc(f.sesion.titulo) + "</a>" +
            (DIA_PROGRAMA[f.sesion.dia] !== f.fecha.getDay() ? ' <span class="pl-sub">(sesión de ' + f.sesion.dia.toLowerCase() + ")</span>" : "") + "</td></tr>";
        } else if (f.libre) {
          html += '<tr class="pl-libre"><td>' + fecha + "</td><td></td><td>Sin clase · " + esc(f.libre) + "</td></tr>";
        } else {
          var txt = { cero: "Semana 0: inscripciones y preparación", corta: "Repaso o plan B (semana corta)", normal: "Repaso o plan B (no quedan semanas elegidas)", sobra: "Repaso o plan B (no quedan sesiones)" }[f.libreClub];
          html += '<tr class="pl-repaso"><td>' + fecha + '</td><td></td><td><a href="' + esc(DATOS.planB || "#") + '">' + txt + "</a></td></tr>";
        }
      });
    });
    html += "</tbody></table>";
    $("pl-calendario").innerHTML = html;
  }

  function actualizar() {
    leerFormulario();
    guardar();
    var cal = analizarCalendario();
    if (!cal) {
      $("pl-resumen").innerHTML = '<p class="pl-aviso pl-aviso--mal">Pon una fecha de inicio y una de fin (el fin después del inicio).</p>';
      $("pl-calendario").innerHTML = "";
      $("pl-bloques").innerHTML = "";
      ultimo = null;
      return;
    }
    if (!estado.dias.length) {
      $("pl-resumen").innerHTML = '<p class="pl-aviso pl-aviso--mal">Marca al menos un día de club.</p>';
      $("pl-calendario").innerHTML = "";
      ultimo = null;
      return;
    }
    var lista = elegidas(cal);
    pintarBloques(cal, lista);
    var rep = repartir(cal, lista);
    pintarResumen(cal, lista, rep);
    pintarCalendario(rep);
    ultimo = rep;
  }

  /* ---------- Exportar ---------- */
  function descargar(nombre, tipo, texto) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function filasPlanas() {
    var r = [];
    if (!ultimo) return r;
    ultimo.semanas.forEach(function (b) {
      b.filas.forEach(function (f) { if (f.fecha) r.push({ f: f, programa: b.programa }); });
    });
    return r;
  }
  function absoluta(url) { try { return new URL(url, location.href).href; } catch (e) { return url; } }

  $("pl-csv").addEventListener("click", function () {
    var lineas = [["Fecha", "Día", "Sesión", "Semana del programa", "Mes", "Título", "Enlace"].join(";")];
    filasPlanas().forEach(function (x) {
      var f = x.f, s = f.sesion;
      var celdas = [aISO(f.fecha), DIAS_ES[f.fecha.getDay()],
        s ? s.n : "", s ? s.semana : "", s ? bloqueDe(s.semana) : "",
        s ? s.titulo : (f.libre ? "Sin clase: " + f.libre : "Repaso o plan B"), s ? absoluta(s.url) : ""];
      lineas.push(celdas.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";"));
    });
    descargar("calendario-pasaporte.csv", "text/csv;charset=utf-8", "﻿" + lineas.join("\r\n"));
  });

  $("pl-ics").addEventListener("click", function () {
    var ahora = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var ev = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pasaporte al Espanol//Planificador//ES", "CALSCALE:GREGORIAN"];
    function txt(t) { return String(t).replace(/\\/g, "\\\\").replace(/[;,]/g, function (c) { return "\\" + c; }).replace(/\n/g, "\\n"); }
    filasPlanas().forEach(function (x) {
      var s = x.f.sesion;
      if (!s) return;
      var d = aISO(x.f.fecha).replace(/-/g, "");
      var sig = aISO(sumar(x.f.fecha, 1)).replace(/-/g, "");
      ev.push("BEGIN:VEVENT", "UID:pasaporte-sesion-" + s.n + "-" + d + "@planificador", "DTSTAMP:" + ahora,
        "DTSTART;VALUE=DATE:" + d, "DTEND;VALUE=DATE:" + sig,
        "SUMMARY:" + txt("Español · Sesión " + s.n + " · " + s.titulo),
        "DESCRIPTION:" + txt("Semana " + s.semana + " del programa · Mes " + bloqueDe(s.semana) + " (" + BLOQUES[bloqueDe(s.semana) - 1] + ")\n" + absoluta(s.url)),
        "END:VEVENT");
    });
    ev.push("END:VCALENDAR");
    descargar("calendario-pasaporte.ics", "text/calendar;charset=utf-8", ev.join("\r\n"));
  });

  $("pl-exportar").addEventListener("click", function () {
    descargar("planificador-pasaporte.json", "application/json", JSON.stringify(estado, null, 2));
  });

  $("pl-importar").addEventListener("change", function (e) {
    var archivo = e.target.files[0];
    if (!archivo) return;
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var g = JSON.parse(lector.result);
        if (!g || typeof g !== "object" || !g.inicio) throw new Error("formato");
        estado = Object.assign(estadoInicial(), g);
        escribirFormulario();
        actualizar();
      } catch (err) {
        alert("Ese archivo no es una configuración del planificador.");
      }
      e.target.value = "";
    };
    lector.readAsText(archivo);
  });

  $("pl-reset").addEventListener("click", function () {
    if (!confirm("¿Borrar las fechas y los días sin clase guardados en este navegador?")) return;
    estado = estadoInicial();
    escribirFormulario();
    actualizar();
  });

  $("pl-imprimir").addEventListener("click", function () { window.print(); });

  $("pl-add").addEventListener("click", function () {
    estado.sinClase.push({ desde: "", hasta: "", motivo: "" });
    pintarFestivos();
    var ult = $("pl-festivos").lastElementChild;
    if (ult) ult.querySelector("input").focus();
  });

  $("pl-sugerir").addEventListener("click", function () {
    var ini = aFecha(estado.inicio), fin = aFecha(estado.fin);
    if (!ini || !fin) return;
    var ya = estado.sinClase.map(function (f) { return f.desde + "|" + f.motivo; });
    var nuevos = festivosSugeridos(ini, fin).filter(function (f) { return ya.indexOf(f.desde + "|" + f.motivo) < 0; });
    estado.sinClase = estado.sinClase.concat(nuevos).sort(function (a, b) { return (a.desde || "9").localeCompare(b.desde || "9"); });
    pintarFestivos();
    actualizar();
  });

  $("pl-form").addEventListener("change", function (e) {
    if (e.target.closest(".pl-festivo") || e.target.closest(".pl-bloques") || e.target.id === "pl-importar") return;
    actualizar();
  });

  escribirFormulario();
  actualizar();
})();
